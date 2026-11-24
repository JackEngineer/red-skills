import argparse
import importlib.util
import json
import math
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
from urllib.parse import urlparse
import uuid


def extract_targets(text):
    return list(
        dict.fromkeys(re.findall(r'https?://[^\s<>"\x00-\x1f，。；！、）】》]+', text))
    )


def route(url):
    host = (urlparse(url).hostname or "").lower()
    return (
        "douyin" if host == "douyin.com" or host.endswith(".douyin.com") else "generic"
    )


def safe_name(value):
    text = re.sub(r'[\x00-\x1f\x7f\\/:*?"<>|#]', "_", value)
    return " ".join(text.split()).strip(" ._")[:45] or "视频"


def probe(path):
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-protocol_whitelist",
            "file",
            "-show_entries",
            "format=duration,size:stream=codec_type,codec_name,pix_fmt",
            "-of",
            "json",
            str(path),
        ],
        capture_output=True,
        text=True,
        timeout=60,
    )
    if result.returncode:
        raise RuntimeError("文件无法识别为有效视频")
    data = json.loads(result.stdout)
    duration = float(data.get("format", {}).get("duration", 0))
    if (
        not math.isfinite(duration)
        or duration <= 0
        or not any(s.get("codec_type") == "video" for s in data.get("streams", []))
    ):
        raise RuntimeError("文件无视频流或有效时长")
    return data


def download_generic(url, stage):
    if importlib.util.find_spec("yt_dlp"):
        runner = [sys.executable, "-m", "yt_dlp"]
    elif shutil.which("yt-dlp"):
        runner = ["yt-dlp"]
    else:
        raise RuntimeError("缺少 yt-dlp，请先按说明安装")
    command = runner + [
        "--ignore-config",
        "--no-plugin-dirs",
        "--no-playlist",
        "--playlist-items",
        "1",
        "--no-cache-dir",
        "--no-progress",
        "--no-warnings",
        "--socket-timeout",
        "25",
        "--retries",
        "1",
        "--fragment-retries",
        "1",
        "--max-filesize",
        "2G",
        "--no-mtime",
        "-f",
        "bv*[vcodec^=avc1][ext=mp4]+ba[ext=m4a]/b[ext=mp4]/bv*+ba/b",
        "--merge-output-format",
        "mp4",
        "--remux-video",
        "mp4",
        "--print",
        "after_move:filepath",
        "-o",
        str(stage / "source.%(ext)s"),
        "--",
        url,
    ]
    result = subprocess.run(command, capture_output=True, text=True, timeout=900)
    if result.returncode:
        message = (result.stderr or result.stdout).strip()[-1200:]
        raise RuntimeError("网站提取或下载失败（原始诊断）：" + message)
    for line in reversed(result.stdout.splitlines()):
        path = Path(line.strip()).resolve()
        if path.is_file() and stage.resolve() in path.parents:
            return path
    raise RuntimeError("下载器没有返回可验证的文件路径")


def download_douyin(url, stage, browser):
    helper = Path(__file__).with_name("douyin.py")
    command = [
        sys.executable,
        "-X",
        "utf8",
        str(helper),
        url,
        "--output-dir",
        str(stage),
    ]
    if browser:
        command += ["--browser", browser]
    result = subprocess.run(
        command, capture_output=True, encoding="utf-8", errors="replace", timeout=900
    )
    if result.returncode:
        raise RuntimeError(
            "抖音专用流程失败：" + (result.stderr or result.stdout).strip()[-1000:]
        )
    data = json.loads(result.stdout)
    path = Path(data.get("文件", "")).resolve()
    if path.is_file() and stage.resolve() in path.parents:
        return path
    raise RuntimeError("抖音下载器没有返回有效文件")


def finish(source, out, name, threshold, target_mib):
    data = probe(source)
    original = out / (
        safe_name(name) + "_" + uuid.uuid4().hex[:8] + source.suffix.lower()
    )
    shutil.copy2(source, original)
    streams = data.get("streams", [])
    compatible = original.suffix.lower() == ".mp4" and all(
        stream.get("codec_name")
        == {"video": "h264", "audio": "aac"}[stream["codec_type"]]
        and (stream["codec_type"] != "video" or stream.get("pix_fmt") == "yuv420p")
        for stream in streams
        if stream.get("codec_type") in ("video", "audio")
    )
    chosen = original
    warning = None
    if original.stat().st_size > threshold * 1024 * 1024 or not compatible:
        converted = original.with_name(original.stem + "_通用版.mp4")
        seconds = float(data["format"]["duration"])
        rate = max(160, int(target_mib * 1024 * 1024 * 8 / seconds / 1000) - 96)
        command = [
            "ffmpeg",
            "-y",
            "-v",
            "error",
            "-protocol_whitelist",
            "file",
            "-i",
            str(original),
            "-map",
            "0:v:0",
            "-map",
            "0:a:0?",
            "-vf",
            "scale='max(2,trunc(min(720,iw)/2)*2)':-2",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-pix_fmt",
            "yuv420p",
            "-b:v",
            f"{rate}k",
            "-c:a",
            "aac",
            "-b:a",
            "64k",
            "-movflags",
            "+faststart",
            str(converted),
        ]
        try:
            subprocess.run(
                command, capture_output=True, text=True, check=True, timeout=1800
            )
            data = probe(converted)
            chosen = converted
        except (subprocess.SubprocessError, RuntimeError, ValueError):
            converted.unlink(missing_ok=True)
            warning = "原件已保存，兼容版生成失败"
    result = {
        "status": "downloaded_verified",
        "file": str(chosen),
        "original_file": str(original),
        "duration_seconds": float(data["format"]["duration"]),
        "size_bytes": chosen.stat().st_size,
        "streams": data["streams"],
    }
    if warning:
        result["warning"] = warning
    return result


def main():
    parser = argparse.ArgumentParser(
        description="下载有权保存的公开视频，或整理本地视频。"
    )
    parser.add_argument("inputs", nargs="+", help="网址、分享文字或已有本地视频文件")
    parser.add_argument(
        "--output-dir", type=Path, default=Path.home() / "Downloads" / "videos"
    )
    parser.add_argument("--name", default="视频")
    parser.add_argument("--browser", help="抖音流程使用的浏览器可执行文件")
    parser.add_argument("--compress-above-mib", type=float, default=80)
    parser.add_argument("--target-mib", type=float, default=60)
    args = parser.parse_args()
    if not all(
        math.isfinite(value) and value > 0
        for value in (args.compress_above_mib, args.target_mib)
    ):
        parser.error("文件大小参数必须为有限正数")
    for tool in ["ffmpeg", "ffprobe"]:
        if not shutil.which(tool):
            parser.error("缺少必需工具：" + tool)
    targets = []
    for text in args.inputs:
        candidate = (
            Path(text).expanduser() if len(text) < 2000 and "\n" not in text else None
        )
        try:
            local = candidate is not None and candidate.is_file()
        except OSError:
            local = False
        if local:
            targets.append(str(candidate.resolve()))
        else:
            targets.extend(extract_targets(text))
    targets = list(dict.fromkeys(targets))
    if not targets:
        parser.error("没有找到网址或现有视频文件")
    out = args.output_dir.expanduser().resolve()
    out.mkdir(parents=True, exist_ok=True)
    results = []
    for index, target in enumerate(targets, 1):
        try:
            with tempfile.TemporaryDirectory(prefix=".video-work-", dir=out) as work:
                stage = Path(work)
                if target.startswith(("http://", "https://")):
                    source = (
                        download_douyin(target, stage, args.browser)
                        if route(target) == "douyin"
                        else download_generic(target, stage)
                    )
                else:
                    source = Path(target)
                result = finish(
                    source, out, args.name, args.compress_above_mib, args.target_mib
                )
                result["input"] = target
        except Exception as exc:
            result = {"status": "failed", "input": target, "error": str(exc)}
        results.append(result)
        temporary = tempfile.NamedTemporaryFile(
            mode="w", encoding="utf-8", prefix=".results-", dir=out, delete=False
        )
        temporary_path = Path(temporary.name)
        try:
            with temporary:
                json.dump(results, temporary, ensure_ascii=False, indent=2)
            temporary_path.replace(out / "results.json")
        finally:
            temporary_path.unlink(missing_ok=True)
        print(json.dumps({"序号": index, **result}, ensure_ascii=False), flush=True)
    return 0 if all(r["status"] == "downloaded_verified" for r in results) else 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        sys.exit("已取消，不再继续下载后续目标。")
