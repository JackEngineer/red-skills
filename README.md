# 小红书技能库

这里维护 [JackEngineer](https://github.com/JackEngineer) 在小红书发布的 RED Skill 源码。每个技能有独立目录，入口为 `SKILL.md`。

| 技能 | 源码 | 小红书作品编号 | 已生效版本 |
| --- | --- | --- | --- |
| Motion CN | [motion-prompt](skills/motion-prompt/) | `106965` | `0.1.0` |
| 小红书小工具开发指南 | [xhs-minitool-guide](skills/xhs-minitool-guide/) | `106990`（`xhs-minitool-guide2`） | `1.3.0` |

上线状态于 2026-11-25 核对。[小红书 RED Skill 管理页](https://creator.xiaohongshu.com/new/skill-hub)

## 使用

- **Motion CN** 查询动效、镜头和视觉提示词。使用 Node.js 18 或以上运行 `node skills/motion-prompt/scripts/motion-prompt.js search 打字机 --limit 5`。预览链接和其他命令见[技能说明](skills/motion-prompt/SKILL.md)。
- **小红书小工具开发指南** 用于查询容器能力或判断功能可行性。将整个技能目录添加到支持 `SKILL.md` 的助手中，输入 `$xhs-minitool-guide help` 查看用法。见[技能说明](skills/xhs-minitool-guide/SKILL.md)。

## 许可与来源

- Motion CN 基于 Shohei Ohtaki 原作，由 JackEngineer 维护简体中文汉化。发行包保留 [MIT 许可证](skills/motion-prompt/LICENSE.txt)和[第三方声明](skills/motion-prompt/THIRD-PARTY-NOTICES.md)。[原项目](https://github.com/showheyohtaki/motion-prompt)
- 小红书小工具开发指南暂未指定开源许可证，平台文档的权利归其原权利人。[小红书官方能力清单](https://miniapp-sandbox.xiaohongshu.com/minitool/doc)
