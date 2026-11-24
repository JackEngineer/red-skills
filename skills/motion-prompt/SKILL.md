---
name: motion-prompt
description: 搜索中文动效、镜头转场、UI、摄影布光、图像画风和图表术语，按编号读取规格、Canvas 参考代码或提示词，并在网上查看示例。
version: 0.1.0
---

# Motion Prompt

用编号查找可复用的动效、镜头和视觉参考。随包提供中文、英文和日文目录、规格、提示词、Canvas 参考代码及共用辅助代码。图片和视频请在[汉化版在线示例库](https://jackengineer.github.io/motion-prompt/?lang=zh-Hans)查看。

## 查找参考

从本技能目录运行，需 Node.js 18 或以上。

```sh
node scripts/motion-prompt.js search 打字机 --limit 5
node scripts/motion-prompt.js list --pack camera,camera2
node scripts/motion-prompt.js get 012
node scripts/motion-prompt.js kit motion
node scripts/motion-prompt.js prompt 012
node scripts/motion-prompt.js pick --pack motion,motion2
node scripts/motion-prompt.js info
```

- 用户已经给出编号或示例 URL 时，用 `get` 读取指定条目。一次最多读取八个，接受 `12`、`012` 或 `#012`。
- 用户想浏览后再选时，用 `pick` 提供在线链接，请用户把选中的编号和备注发回对话。按用户给出的顺序使用条目。
- 用户让你代选时，用 `search` 按场景查找，比较释义和规格后再选。使用 `--pack` 缩小范围。
- 默认输出简体中文。用 `--lang en` 或 `--lang ja` 切换语言。没有 Node.js 时，直接读取 `runtime/api/v1/zh-Hans/catalog.txt`（制表符分隔）、`zh-Hans/e/012.txt`（规格和代码）、`zh-Hans/p/012.txt`（提示词）及 `kit/`（共用辅助代码）。后三个路径均相对于 `runtime/api/v1/`。

## 应用参考

1. 用 `get` 读取所选条目，按结果中的依赖用 `kit` 读取对应素材包的共用代码。实现前阅读[移植说明](references/porting.zh-Hans.md)。
2. 保留原示例的时长、延迟、缓动、过冲和移动幅度。适配当前项目的文字、颜色、画幅与素材。Canvas 元素代码依赖同包 kit，按时间参数绘制。
3. 为视频或图像模型写提示词时，用 `prompt` 获取参考，再补充主体、画幅和风格。描述动作、顺序、时长和结束位置，避免把 Canvas 代码直接交给视频模型。
4. 渲染检查开头、关键帧和结尾。交付时列出实际使用的编号、名称、对应场景及预览链接。

## 署名与许可

原项目由 Shohei Ohtaki 创建，JackEngineer 维护简体中文汉化。分发元素或辅助代码时保留文件开头的原作者署名和 MIT 许可声明。参见[原项目](https://github.com/showheyohtaki/motion-prompt)、[汉化仓库](https://github.com/JackEngineer/motion-prompt)和随包的 [MIT 许可证](LICENSE.txt)。
