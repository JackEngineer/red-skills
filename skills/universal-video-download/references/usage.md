# 运行说明

## 准备环境

安装 Python 3.11 或以上。把 `ffmpeg` 和 `ffprobe` 加入 PATH。需要生成兼容 MP4 时，FFmpeg 应支持 `libx264` 和 `aac` 编码。

建议在虚拟环境中安装 Python 依赖。常见网页及视频直链需要 yt-dlp。本地视频处理只需 Python 和 FFmpeg。

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install yt-dlp
```

普通抖音视频另需 `curl`、Playwright 和 Chromium。从技能目录安装浏览器依赖。

```sh
python -m pip install -r references/requirements.txt
python -m playwright install chromium
```

安装依赖需要联网。Windows PowerShell 使用 `.venv\Scripts\Activate.ps1` 激活虚拟环境，之后使用 `python`。若已安装 Chromium 或 Chrome，可以使用 `--browser` 指定可执行文件。

## 运行命令

在技能目录运行。可把分享文字、多个链接和现有文件路径作为单独参数传入。

下载小红书视频时，从原笔记的「分享」复制完整链接，或复制浏览器里的完整地址。保留链接中的查询参数。小红书提示没有可下载的视频时，重新复制分享链接，并确认笔记仍可访问且包含视频。

```sh
python scripts/download.py --name "视频" -- "复制来的完整分享文字"
python scripts/download.py --output-dir "./视频输出" -- "链接一" "链接二"
python scripts/download.py --name "本地素材" -- "/视频素材/原片.mp4"
python scripts/download.py --help
```

默认以 80 MiB 为压缩触发值，目标大小约 60 MiB。可用 `--compress-above-mib` 和 `--target-mib` 调整。生成文件继承原格式或使用 MP4，文件名带随机后缀。

## 查看结果

脚本逐项输出 JSON。每个目标结束后，输出目录内的 `results.json` 更新为本次运行截至该项的结果。需要保留不同批次的清单时，分别指定输出目录。

- `downloaded_verified` 表示 `file` 对应的文件通过了视频流和有效时长检查。输入是本地文件时，该状态表示已整理并校验。 `original_file` 是另行保留的原件。
- `failed` 表示该项失败。查看 `error` 判断原因。
- `warning` 表示原件已保存，但兼容版生成失败。按返回的路径交付原件。

全部成功时退出码为 0，任一目标失败时为 1。按 Ctrl+C 停止处理后续目标。ffprobe 检查视频流和时长，完整播放质量以实际播放为准。分享链接及诊断可能包含访问参数，分享结果前按需移除。

## 商品视频

若普通抖音流程提示链接打开了商品页，且当前助手能用浏览器，打开用户给出的商品链接。找到对应视频的播放器，使用播放器提供的下载选项。随后将保存的本地文件交给统一入口校验。找不到官方保存入口时，说明处理停在该页面。

## 资料

- [yt-dlp 官方说明](https://github.com/yt-dlp/yt-dlp#dependencies)
- [yt-dlp 支持的网站](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md)
