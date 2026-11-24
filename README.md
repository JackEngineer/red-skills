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

## 打包上传

拿到 ZIP 后，进入小红书创作后台，在原作品的「更新版本」中选择该文件。[小红书 RED Skill 管理页](https://creator.xiaohongshu.com/new/skill-hub)

### 免登录下载

从 GitHub Release 下载最新发布的 ZIP。

- [下载 Motion CN ZIP](https://github.com/JackEngineer/red-skills/releases/latest/download/motion-prompt.zip)
- [下载小红书小工具开发指南 ZIP](https://github.com/JackEngineer/red-skills/releases/latest/download/xhs-minitool-guide.zip)

### 从 GitHub Actions 下载

每次推送到 `main` 后，GitHub Actions 会为每项技能生成一个 ZIP。登录 GitHub，打开最近一次成功的 `main` 构建，在运行详情底部的 **Artifacts（构建产物）** 中选择所需的 `<技能目录名>.zip`。下载的就是可上传小红书的 ZIP。[打包小红书技能工作流](https://github.com/JackEngineer/red-skills/actions/workflows/package-skills.yml?query=branch%3Amain)

### 本地打包

安装 Python 3 和 Git 后，在仓库根目录运行。

```sh
# 打包指定技能
python3 scripts/package_skills.py motion-prompt

# 为全部技能各生成一个 ZIP
python3 scripts/package_skills.py --all
```

ZIP 写入 `dist/<技能目录名>.zip`。再次打包会覆盖同名 ZIP。每个包以 `SKILL.md` 为根目录入口，保留技能内的文件结构。

命令读取工作区中已纳入 Git 的文件，已有文件的修改可以直接打包。新增或删除技能文件后，先登记变动，例如运行 `git add -A -- skills/motion-prompt`，再打包。

遇到不支持的格式、符号链接或超出体积限制的文件时，命令会指出问题。小红书限制单个文件最多 10 MiB，每项技能解压后合计最多 30 MiB。

### 发布新版

在要发布的 `main` 提交上创建一个新的 `skills-*` 标签，并单独推送该标签。

```sh
git tag skills-2026-11-26 main
git push origin tag skills-2026-11-26
```

工作流从标签对应的提交打包全部技能。所有 ZIP 上传成功后，Release 会公开并设为 **Latest**，上面的免登录链接会自动指向新版本。如果发布失败，可以在 GitHub Actions 重跑该工作流。

## 许可与来源

- Motion CN 基于 Shohei Ohtaki 原作，由 JackEngineer 维护简体中文汉化。发行包保留 [MIT 许可证](skills/motion-prompt/LICENSE.txt)和[第三方声明](skills/motion-prompt/THIRD-PARTY-NOTICES.md)。[原项目](https://github.com/showheyohtaki/motion-prompt)
- 小红书小工具开发指南暂未指定开源许可证，平台文档的权利归其原权利人。[小红书官方能力清单](https://miniapp-sandbox.xiaohongshu.com/minitool/doc)
