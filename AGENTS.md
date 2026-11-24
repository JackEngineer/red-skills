# 项目维护指南

## 目录

- `skills/` 下每个目录维护一项 RED Skill，目录名与 `SKILL.md` 的 `name` 一致。
- `README.md` 记录作品编号、已生效版本和来源。只有创作后台显示新版本生效后才更新上线状态。

## 修改与验证

- 修改技能前，先读该目录的 `SKILL.md` 和相关参考资料。保留原作者署名、许可证及第三方声明。
- 修改 Motion CN 后，从仓库根目录运行 `node skills/motion-prompt/scripts/motion-prompt.js info`。再按改动运行相关查询命令，核对数据和输出。
- 修改小工具开发指南后，检查 `SKILL.md` 的相对链接，并在安装该技能的助手中验证 `help`、`guide` 或受影响的能力问答。涉及平台能力、版本或权限时，查阅 README 中链接的官方文档。
- 用 `python3 scripts/package_skills.py <技能目录名>` 或 `python3 scripts/package_skills.py --all` 生成待上传 ZIP。修改打包命令后，运行 `python3 -m unittest discover -s tests`。

## 提交与发布

- 一次提交只处理一个目的。提交标题用中文 Conventional Commits，例如 `docs(xhs-minitool-guide): 更新定位接口的版本说明`。
- 公开提交前检查暂存区。上传包、后台截图、授权信息、测试日志和个人配置留在 Git 仓库之外。
- 小红书版本更新沿用 README 记录的原作品。只有得到当次发布授权才上传和送审。
- 收到小红书 SkillHub 发布任务时，按[生产发布流程](docs/skillhub-release.md)加载 `redskillhub-upload`。先确定本地技能，展示完整确认卡后，等用户明确回复“确认”“提交”或 `submit` 再提交。
