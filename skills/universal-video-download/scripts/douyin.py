import argparse
import asyncio
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
from urllib.parse import unquote, urlsplit


def is_douyin_url(url):
    parsed = urlsplit(url)
    host = parsed.hostname or ""
    return parsed.scheme in ("http", "https") and (
        host == "douyin.com" or host.endswith(".douyin.com")
    )


def find_video(data, video_id):
    if isinstance(data, dict):
        if (
            isinstance(data.get("video"), dict)
            and str(data.get("aweme_id")) == video_id
        ):
            return data["video"]
        children = data.values()
    elif isinstance(data, list):
        children = data
    else:
        return None
    for child in children:
        video = find_video(child, video_id)
        if video is not None:
            return video
    return None


def media_urls(video):
    urls = {}
    for key in ("download_addr", "play_addr"):
        address = video.get(key)
        if not isinstance(address, dict) or not isinstance(
            address.get("url_list"), list
        ):
            continue
        for url in address["url_list"]:
            if isinstance(url, str) and url.startswith("https://"):
                urls[url] = None
    return list(urls)


async def discover(url, executable):
    try:
        from playwright.async_api import Error, async_playwright
    except ImportError as exc:
        raise RuntimeError("缺少 Playwright，请按运行说明安装") from exc

    async with async_playwright() as playwright:
        try:
            browser = await playwright.chromium.launch(executable_path=executable)
        except Error as exc:
            raise RuntimeError(
                "浏览器启动失败，请安装 Chromium 或用 --browser 指定浏览器"
            ) from exc
        try:
            page = await browser.new_page()
            payloads = []

            async def collect(response):
                if (
                    not is_douyin_url(response.url)
                    or "/aweme/detail" not in urlsplit(response.url).path
                ):
                    return
                try:
                    payloads.append(await response.json())
                except (Error, ValueError):
                    return

            page.on("response", collect)
            response = await page.goto(
                url, wait_until="domcontentloaded", timeout=40_000
            )
            if (
                response is None
                or response.status >= 400
                or not is_douyin_url(page.url)
            ):
                raise RuntimeError("普通视频页无法公开访问")
            match = re.fullmatch(r"/video/(\d+)/?", urlsplit(page.url).path)
            if not match:
                raise RuntimeError(
                    "链接未打开普通视频页。商品页请使用播放器提供的下载入口"
                )
            video_id = match.group(1)
            for script in await page.locator("script:not([src])").all_text_contents():
                for candidate in dict.fromkeys((script, unquote(script))):
                    try:
                        payloads.append(json.loads(candidate))
                        break
                    except ValueError:
                        continue
            for _ in range(16):
                for payload in payloads:
                    video = find_video(payload, video_id)
                    if video and (urls := media_urls(video)):
                        return urls
                await asyncio.sleep(0.5)
            raise RuntimeError("公开页面未提供可识别的媒体地址")
        finally:
            await browser.close()


def main():
    parser = argparse.ArgumentParser(description="提取抖音普通公开视频")
    parser.add_argument("url", help="抖音视频链接或短链")
    parser.add_argument(
        "--output-dir", type=Path, required=True, help="本次下载的暂存目录"
    )
    parser.add_argument("--browser", help="Chromium 或 Chrome 可执行文件路径")
    args = parser.parse_args()
    if not is_douyin_url(args.url):
        parser.error("请提供抖音视频链接")
    if not shutil.which("curl"):
        parser.error("缺少 curl，请按运行说明安装")

    from download import probe

    args.output_dir.mkdir(parents=True, exist_ok=True)
    output = args.output_dir.resolve() / "source.mp4"
    for url in asyncio.run(discover(args.url, args.browser)):
        result = subprocess.run(
            [
                "curl",
                "--disable",
                "--location",
                "--fail",
                "--silent",
                "--max-time",
                "180",
                "--proto",
                "=https",
                "--proto-redir",
                "=https",
                "--referer",
                "https://www.douyin.com/",
                "--max-filesize",
                str(2 * 1024**3),
                "--output",
                str(output),
                "--write-out",
                "%{http_code}",
                "--",
                url,
            ],
            capture_output=True,
        )
        if result.returncode == 0:
            try:
                probe(output)
            except (RuntimeError, ValueError, subprocess.TimeoutExpired):
                output.unlink(missing_ok=True)
            else:
                print(json.dumps({"文件": str(output)}, ensure_ascii=False))
                return
        else:
            output.unlink(missing_ok=True)
        if result.stdout in (b"401", b"403", b"429"):
            raise RuntimeError("站点限制访问，请使用官方保存入口")
    raise RuntimeError("公开媒体地址未返回有效视频")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit("已取消下载")
    except Exception as exc:
        sys.exit(f"抖音下载失败：{exc}")
