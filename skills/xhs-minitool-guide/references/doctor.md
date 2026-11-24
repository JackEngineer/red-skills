# 检查小工具开发环境

在当前 Agent 输入 `$xhs-minitool-guide doctor`。已调用本指南时也可直接输入 `doctor`。常规检查只读取当前环境，适合在开始开发、换电脑或更换 Agent 后使用。

## 执行检查

在当前 Agent 的工作目录运行技能内的 Python 3 脚本。先从当前会话确认宿主和能调用的技能，再传给脚本。下面以 Codex 的两项技能均出现在本会话清单为例，运行时替换为清单里的真实路径。Windows 上也可以用 `py -3`。

```sh
python3 "<本指南目录>/scripts/doctor.py" --agent codex \
  --visible-skill "<会话列出的开发规范目录>/SKILL.md" \
  --visible-skill "<会话列出的CLI技能目录>/SKILL.md" --json
```

没有会话证据就省略该项 `--visible-skill`。宿主有自定义技能位置时，使用 `--skill-root` 补充已确认的根目录。可用 `--help` 查看支持的 `--agent`，无法确认时让脚本识别或传 `unknown`。`--workspace` 可指定当前项目目录。退出码 `1` 表示报告里有阻塞项，仍要读取完整输出判断开发、CLI 或模拟器各自能否继续。

## 怎么看报告

| 检查结果 | 判断依据与下一步 |
| --- | --- |
| 开发与打包 | `minitool-zip-builder` 的名称、关键文档和审计脚本完整，且当前会话能发现它，才可按官方规范开发和审计 ZIP。Node.js、Python 和人工审计的选择以该技能的性能规范为准。 |
| 小工具 CLI | `redapp-cli` 需要名称匹配、版本门禁脚本和引用文件齐全，并能在当前会话发现。Node.js 18+ 和 npm 是 CLI 的运行前提。PATH 中找到 `redapp` 时，报告实际路径，CLI 版本与协议仍须核验。 |
| 本地模拟器 | 还需 Node.js 20+。常规检查只报告前置条件。实际启动与容器验证在有小工具产物后按 `redapp-cli` 的 dev 指引执行，无需发布登录。 |
| 账号授权 | 环境检查与 CLI 版本核验均不访问业务接口。账号授权状态留待用户明确要求时核验。 |

文件齐全但只有磁盘证据时，标为「已找到，待会话发现」，由当前 Agent 的技能清单、选择器或刷新机制来确认。多份同名技能时，列出路径并确认本会话实际选中的副本。遇到读权限不足、托管环境没有宿主文件访问权或无法运行命令时，使用当前 Agent 可用的技能清单和文件工具完成可检查的部分，其余标为「无法验证」。如果只有 Python 不可用，可以分开执行 `node --version`、`npm --version` 与系统的命令定位工具。没有 shell 时记录相应检查未执行。

## 缺项怎么补

**缺官方技能或文件损坏。** 报告具体缺项，并提供对应的官方包。开发和打包使用规范技能，启动模拟器和管理作品使用 CLI 技能。两项技能独立安装。 [管理技能 redapp-cli](https://fe-video-qc.xhscdn.com/fe-platform-file/104101b8326rqruuj5006b6titltg00000000038l066g4) · [开发规范 minitool-zip-builder 1.11.1](https://fe-static.xhscdn.com/minitool/20261117152455/minitool-zip-builder-1.11.1.skill)

**缺 Node.js 或 npm。** 报告本次执行环境的版本和路径，按用途提示最低版本。诊断时提供当前系统适用的安装方式、修改范围与权限要求。获得安装授权后再安装，并在同一 Agent 环境复查。 [Node.js 官方下载](https://nodejs.org/download)

**当前会话找不到技能。** 使用宿主的技能发现或管理功能。远程 Agent 应检查实际运行环境的技能清单与目录，本机目录只反映本机状态。用户级技能能满足当前使用范围时优先选用户级，宿主只支持项目级时使用当前项目。

| Agent | 如何确认 |
| --- | --- |
| Codex | 在桌面端查看 Skills，或在 CLI / IDE 扩展中用 `/skills` 或 `$` 选择。看不到刚安装的技能时重启后复查。 [Codex 技能文档](https://learn.chatgpt.com/docs/build-skills) |
| Claude Code | 用 `/` 菜单查找技能。Cowork 与云会话按相应技能同步规则核对。 [Claude Code 技能文档](https://code.claude.com/docs/en/skills) |
| Cursor | 在 Agent 对话中输入 `/` 查找技能。云端需另外核查个人技能是否同步。 [Cursor 技能文档](https://cursor.com/docs/skills) |
| GitHub Copilot CLI | 使用当前会话的 `/skills` 或从终端运行 `copilot skill` 系列命令。Copilot 的其他宿主按对应产品文档确认。 [Copilot CLI 命令参考](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference) |
| Gemini CLI | 用 `/skills list` 查看，刚安装的技能可先运行 `/skills reload`。 [Gemini CLI 技能文档](https://geminicli.com/docs/cli/skills/) |
| Windsurf / Devin Local | 按当前客户端文档查看技能，留意旧 Windsurf 与 Devin Local 的目录差异。 [Devin Local 自定义文档](https://docs.devin.ai/desktop/devin-local/customizations) |
| Cline | 打开 Cline 面板的 Skills 标签检查。 [Cline 技能文档](https://docs.cline.bot/customization/skills) |

### 用户另行授权安装时

1. 检查当前 Agent 是否支持自定义技能和文件操作。优先用宿主的原生导入能力；需手动安装时，依据宿主当前官方文档选目录，只安装到当前 Agent。如果产品仅支持由用户操作的导入界面，给出实际操作入口，并保留待验证状态。
2. 下载到临时目录并验证实际文件格式。无扩展名或 `.skill` 文件按内容识别 ZIP。解压前检查所有条目，拒绝绝对路径、盘符、越界路径及规范化后冲突的路径。跳过 `__MACOSX`、`.DS_Store`、`._*`、隐藏文件和软链接。只在临时目录解压。
3. 读取 `SKILL.md` 的 frontmatter，确认 `name` 与目标一致。将完整技能目录放成 `<技能目录>/<技能名>/SKILL.md`，保留 `scripts/`、`references/` 和包内其他有效文件，避免重复嵌套目录。同名且有效内容一致时跳过，有差异时先备份到技能发现目录之外并记录恢复路径。
4. 检查脚本、引用资料及当前会话发现状态，必要时刷新或新建会话。向用户报告 Agent、实际路径、验证结果和适合该宿主的调用示例。包内说明涉及的后续动作沿用本次授权范围。

## 核验 CLI 版本与协议

用户明确输入 `$xhs-minitool-guide doctor verify` 或要求验证官方 CLI 后，先核实当前会话使用的 `redapp-cli` 来自官方包，再在上述命令附加 `--verify-cli`。官方 `scripts/ensure-cli.mjs` 会查询 npm 并可能安装包，运行时使用本次进程专用的临时 npm prefix 和 cache，并把该 prefix 的可执行目录加到本次进程的 PATH。

只有门禁成功退出、返回可解析的 `CLI_VERSION_JSON`，且 `status` 为 `current`、`installed` 或 `updated`，并在临时目录找到 `redapp` 入口，才报告验证通过。同时报告返回的 `version`、`tag`、`env` 和状态。门禁失败时报告实际错误并停止，不回退到本地源码或其他 npm 版本线。隔离核验通过说明这次临时安装的版本与命令协议可用，后续会话仍需依照 `redapp-cli` 的指引建立其运行环境。

另行完成用户实际要求的安装并验证成功后，询问是否需要登录授权。明确授权登录后，调用 `redapp-cli` 的登录流程，并按同一次进程真实返回的 `PROMPT` 展示二维码。无法渲染时使用回执中实际提供的链接和授权码，等待该进程的 `RESULT_JSON`。上传、预览、送审和编辑分别按用户的实际要求执行。
