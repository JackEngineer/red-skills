import functools
import http.server
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import threading
import unittest
from unittest.mock import patch

SCRIPTS = (
    Path(__file__).resolve().parents[1]
    / "skills"
    / "universal-video-download"
    / "scripts"
)
SCRIPT = SCRIPTS / "download.py"
HAS_FFMPEG = shutil.which("ffmpeg") and shutil.which("ffprobe")


def create_sample(path, pixel_format="yuv420p", size="160x120"):
    subprocess.run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-f",
            "lavfi",
            "-i",
            f"testsrc=size={size}:rate=10",
            "-t",
            "1",
            "-c:v",
            "libx264",
            "-pix_fmt",
            pixel_format,
            str(path),
        ],
        check=True,
    )


def run_download(out, *args):
    return subprocess.run(
        [sys.executable, str(SCRIPT), "--output-dir", str(out), *map(str, args)],
        capture_output=True,
        text=True,
        timeout=90,
    )


def read_result(out):
    return json.loads((out / "results.json").read_text(encoding="utf-8"))[0]


def load_script(name):
    spec = importlib.util.spec_from_file_location(name, SCRIPTS / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class VideoDownloadTest(unittest.TestCase):
    def test_xiaohongshu_missing_formats_explains_how_to_retry(self):
        module = load_script("download")
        failure = subprocess.CompletedProcess(
            [], 1, "", "ERROR: [XiaoHongShu] example: No video formats found!"
        )
        with (
            patch.object(module.importlib.util, "find_spec", return_value=True),
            patch.object(module.subprocess, "run", return_value=failure),
            self.assertRaisesRegex(RuntimeError, "完整分享链接"),
        ):
            module.download_generic(
                "https://www.xiaohongshu.com/explore/000000000000000000000000",
                Path("temporary-output"),
            )

    def test_shared_text_routes_all_unique_targets(self):
        mod = load_script("download")
        result = mod.extract_targets(
            "分享 https://v.douyin.com/abc/，https://example.org/video.mp4。https://v.douyin.com/abc/"
        )
        self.assertEqual(
            result, ["https://v.douyin.com/abc/", "https://example.org/video.mp4"]
        )
        self.assertEqual(mod.route(result[0]), "douyin")
        self.assertEqual(mod.route(result[1]), "generic")
        self.assertEqual(mod.route("https://notdouyin.com/video/1"), "generic")

    def test_douyin_uses_only_public_https_addresses_of_matching_video(self):
        mod = load_script("douyin")
        unrelated = {
            "aweme_id": "11",
            "video": {"play_addr": {"url_list": ["https://example.org/wrong.mp4"]}},
        }
        target = {
            "aweme_id": "22",
            "video": {
                "download_addr": {
                    "url_list": [
                        "file:///private/local.mp4",
                        "https://example.org/video.mp4",
                    ]
                },
                "play_addr": {
                    "url_list": [
                        "https://example.org/video.mp4",
                        "https://example.org/backup.mp4",
                    ]
                },
            },
        }
        video = mod.find_video({"items": [unrelated, target]}, "22")
        self.assertEqual(
            mod.media_urls(video),
            ["https://example.org/video.mp4", "https://example.org/backup.mp4"],
        )
        self.assertIsNone(mod.find_video({"items": [unrelated, target]}, "33"))

    def test_rejects_nonfinite_size_arguments(self):
        result = subprocess.run(
            [
                sys.executable,
                str(SCRIPT),
                "--target-mib",
                "nan",
                "--",
                "https://example.org/test.mp4",
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
        self.assertEqual(result.returncode, 2)
        self.assertIn("文件大小参数必须为有限正数", result.stderr)

    @unittest.skipUnless(
        HAS_FFMPEG and (shutil.which("yt-dlp") or importlib.util.find_spec("yt_dlp")),
        "需要 FFmpeg、ffprobe 和 yt-dlp",
    )
    def test_direct_download_end_to_end(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            fixture = root / "sample.mp4"
            create_sample(fixture)

            class Handler(http.server.SimpleHTTPRequestHandler):
                def log_message(self, *args):
                    pass

            server = http.server.ThreadingHTTPServer(
                ("127.0.0.1", 0), functools.partial(Handler, directory=td)
            )
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            try:
                out = root / "output"
                result = run_download(
                    out,
                    "--name",
                    "测试\n视频",
                    "--",
                    f"http://127.0.0.1:{server.server_port}/sample.mp4",
                )
                self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
                entry = read_result(out)
                self.assertEqual(entry["status"], "downloaded_verified")
                saved = Path(entry["file"])
                self.assertTrue(saved.is_file())
                self.assertNotIn("\n", saved.name)
                self.assertGreater(entry["duration_seconds"], 0)
            finally:
                server.shutdown()
                server.server_close()
                thread.join()

    @unittest.skipUnless(HAS_FFMPEG, "需要 FFmpeg 和 ffprobe")
    def test_local_video_is_compressed_and_verified(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            source = root / "local.mp4"
            out = root / "out"
            create_sample(source)
            r = run_download(out, "--compress-above-mib", "0.0001", "--", source)
            self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
            data = read_result(out)
            self.assertIn("_通用版.mp4", data["file"])
            self.assertEqual(
                Path(data["original_file"]).read_bytes(), source.read_bytes()
            )
            self.assertGreater(data["duration_seconds"], 0)

    @unittest.skipUnless(HAS_FFMPEG, "需要 FFmpeg 和 ffprobe")
    def test_local_h264_with_odd_dimensions_and_yuv444p_is_converted(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            source = root / "yuv444p.mp4"
            out = root / "out"
            create_sample(source, pixel_format="yuv444p", size="161x121")
            result = run_download(out, "--", source)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            data = read_result(out)
            self.assertNotEqual(data["file"], data["original_file"])
            self.assertEqual(data["streams"][0]["pix_fmt"], "yuv420p")

    @unittest.skipUnless(HAS_FFMPEG, "需要 FFmpeg 和 ffprobe")
    def test_invalid_video_is_not_reported_as_downloaded(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            source = root / "fake.mp4"
            source.write_text("<html>不是视频</html>", encoding="utf-8")
            out = root / "out"
            r = run_download(out, "--", source)
            self.assertNotEqual(r.returncode, 0)
            data = read_result(out)
            self.assertEqual(data["status"], "failed")
            self.assertNotIn("file", data)


if __name__ == "__main__":
    unittest.main()
