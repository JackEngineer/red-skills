# 小红书 SkillHub 生产发布流程

收到当次发布任务后，先确定要发布的本地 Skill。输入可以是技能名称、目录绝对路径或 ZIP 文件绝对路径。按名称搜索时，只有唯一匹配才能继续。更新版本时，核对 README 的作品编号及创作后台的 Skill ID，沿用原作品。

## 1. 加载发布技能

1. 从指定的小红书 CDN 下载发布技能到临时目录，确认文件是 ZIP。禁止把下载内容直接交给 shell 执行。[下载 redskillhub-upload](https://fe-video-qc.xhscdn.com/fe-platform-file/104101b8325aufp36l006gp4kbo270000000000bl4659g)
2. 解压到独立的临时目录。忽略 `__MACOSX`、隐藏文件和目录、软链接。拒绝绝对路径、盘符或 UNC 路径、`..` 路径分量，以及其他可能写出解压目录的条目。写入前确认实际目标位于解压目录内。
3. 确认存在 `skill/SKILL.md` 和 `skill/scripts/ensure-cli.mjs`。缺少任一文件，立即停止并报告。
4. 使用解压所得的 `skill/`。Agent 支持原生 Skill 安装时，将它安装到 Skill 目录。已安装内容与下载包一致时可直接复用。不支持原生安装时，完整读取解压包的 `skill/SKILL.md` 作为本次任务规范。

## 2. 检查运行环境和 CLI

1. 检查 `node` 与 `npm`。使用 `node -p "process.platform"` 判断操作系统。如需安装 Node.js，先说明安装方式、修改范围和所需权限，获准后再安装。禁止执行可能等待密码的 `sudo`、`su` 或管理员命令。
2. 在启动发布 CLI 的进程中配置 npm 用户目录。macOS 或 Linux 使用用户目录中的 prefix 和 cache，并把 `<prefix>/bin` 加到 `PATH` 前面。Windows 在 `LOCALAPPDATA` 下选取 prefix 和 cache，并把 `<prefix>` 加到 `PATH` 前面。只临时设置 `NPM_CONFIG_PREFIX`、`NPM_CONFIG_CACHE` 和 `PATH`，避免系统级安装或永久修改 npm 配置。在后续 CLI 调用中沿用这些进程环境变量。
3. 从解压后的 Skill 目录运行版本检查。全程使用生产环境，所有 SkillHub CLI 命令显式传入 `--env prod`，使用 npm 的正式 `latest` 标签。所有外部命令均设置合理超时，超时后终止进程并报告。

```sh
node "<解压目录>/skill/scripts/ensure-cli.mjs" --env prod --npm-tag latest
```

仅当 `CLI_VERSION_JSON.status` 为 `current`、`installed` 或 `updated`，且 `env=prod`、`tag=latest` 时继续。状态为 `error`、缺失或无法解析时立即停止，向用户返回完整 stderr，隐去凭证。

### 权限错误

遇到 `EACCES`、`EPERM`、`Permission denied`、`Operation not permitted`、npm 缓存权限不足或安装目录不可写时，立即停止当前命令。用户目录方案最多自动尝试一次。禁止擅自使用 `sudo`、`chmod 777`、递归 `chown` 或修改系统目录。

报告失败的命令、完整错误、待授权的具体操作，以及将访问或修改的目录。支持原生权限申请时发起最小范围的申请，否则提供准确命令，等用户处理。获得授权前暂停版本检查、登录、打包和上传。

```json
{"status":"awaiting_permission","message":"需要用户授权后继续"}
```

## 3. 收集参数并启动发布会话

查询生产环境当前可用标签。用 `RESULT_JSON.tags` 和已经确定的绝对路径，按 `SKILL.md` 的固定格式向用户询问来源与标签。来源为原创或转载，标签可多选。转载需另填不超过 15 个字符的来源。

```sh
redskillhub-upload tags --env prod
```

参数齐备后启动 CLI 发布会话并保留输入通道。按实际来源填写 `--source`，转载时附加 `--repost-source "<来源>"`。由 CLI 校验和打包。

```sh
redskillhub-upload publish "<绝对路径>" --agent --source original --tag "<标签1,标签2>" --env prod
```

如果 CLI 要求登录，根据 `authorizeCommonUrl` 生成授权二维码。遇到 `qrCodePath`，在对话中直接发送二维码图片，请用户优先用小红书 App 扫码。只有二维码无法扫描时才提供 `authorizeH5Url`，请用户用手机自带浏览器打开。等待授权期间支持取消，按技能指引执行以下命令。

```sh
redskillhub-upload login --cancel --env prod
```

## 4. 核对确认卡并提交

收到 `PROMPT.type=confirm` 后，展示 Skill 名称、Skill ID、版本、简介、完整 Skill 介绍、来源、转载来源、中文标签、包大小和 SHA-256。卡片为空时，用 `PROMPT.payload` 和本次查询的标签组装。Skill 介绍原样放入 `text` 代码块，外层围栏须长于正文中的任何连续反引号。

- 用户要求修改时，按技能指引把指定字段写入当前会话，并重新展示完整确认卡。此操作只修改本次提交参数。会话失效时重开会话并重新展示确认卡。
- 用户在看到当前确认卡后明确回复“确认”“提交”或 `submit`，才向仍在等待的同一进程发送 `submit`，由 CLI 上传并提交审核。安装许可、权限授权和登录均不能代替这一步。
- 用户要求取消时向当前会话发送 `cancel`。根据 `RESULT_JSON` 汇报提交、取消或错误结果及回执。等创作后台显示新版本生效后，再更新 README 的已生效版本。
