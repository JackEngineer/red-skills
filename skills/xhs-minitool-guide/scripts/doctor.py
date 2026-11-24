"""检查当前 Agent 的小红书小工具开发环境。"""

import argparse
import json
import os
from pathlib import Path
import platform
import re
import shutil
import stat
import subprocess
from tempfile import TemporaryDirectory
from urllib.parse import unquote


BUILDER = "minitool-zip-builder"
REDAPP = "redapp-cli"
ENSURE = "scripts/ensure-cli.mjs"
AUDIT = ("scripts/audit_artifact.mjs", "scripts/audit_artifact.py")
REQUIRED = {
    BUILDER: ("references/js-api.md", "references/zip-artifact-spec.md", "references/performance-budget.md"),
    REDAPP: (ENSURE, "references/operations.md", "references/dev.md", "references/workflows.md"),
}
# 每项依次列用户级和项目级的默认搜索范围。
AGENT_ROOTS = {
    "codex": ((".agents/skills", ".codex/skills"), (".agents/skills",)),
    "claude-code": ((".claude/skills",), (".claude/skills",)),
    "cursor": ((".cursor/skills", ".agents/skills", ".claude/skills", ".codex/skills"),
               (".cursor/skills", ".agents/skills", ".claude/skills", ".codex/skills")),
    "copilot": ((".copilot/skills", ".agents/skills"), (".github/skills", ".agents/skills", ".claude/skills")),
    "gemini-cli": ((".agents/skills", ".gemini/skills"), (".agents/skills", ".gemini/skills")),
    "windsurf": ((".codeium/windsurf/skills",), (".windsurf/skills",)),
    "devin": ((".config/devin/skills", ".agents/skills"), (".devin/skills", ".agents/skills", ".windsurf/skills")),
    "cline": ((".cline/skills",), (".cline/skills", ".clinerules/skills", ".claude/skills")),
    "unknown": ((), ()),
}

FRONTMATTER = re.compile(r"\A---[ \t]*\n(.*?)\n---[ \t]*(?:\n|$)", re.S)
MARKDOWN_LINK = re.compile(r"\]\(\s*(?:<([^>\n]+)>|([^\s)]+))")
CODE_FENCE = re.compile(r"^[ \t]*(`{3,}|~{3,}).*?^[ \t]*\1[ \t]*$", re.M | re.S)
VERSION = re.compile(r"v?(\d+)\.\d+\.\d+(?:[-+][\w.+-]+)?")


def detect_agent():
    signals = {"CODEX_THREAD_ID": "codex", "CLAUDECODE": "claude-code",
               "CURSOR_AGENT": "cursor", "GEMINI_CLI": "gemini-cli"}
    agents = {agent for key, agent in signals.items() if os.environ.get(key)}
    return agents.pop() if len(agents) == 1 else "unknown"


def skill_roots(agent, workspace, extra):
    user_dirs, project_dirs = AGENT_ROOTS[agent]
    roots = [*extra, *(Path.home() / name for name in user_dirs)]
    if agent == "codex":
        roots.append(Path(os.environ.get("CODEX_HOME") or Path.home() / ".codex").expanduser() / "skills")
        if os.name != "nt":
            roots.append(Path("/etc/codex/skills"))
    if agent == "claude-code" and os.environ.get("CLAUDE_CONFIG_DIR"):
        roots.append(Path(os.environ["CLAUDE_CONFIG_DIR"]).expanduser() / "skills")
    if agent == "copilot":
        extra_dirs = os.environ.get("COPILOT_SKILLS_DIRS", "").split(",")
        roots.extend(Path(name.strip()).expanduser() for name in extra_dirs if name.strip())

    # 从工作目录向上查到最近的 Git 根。非仓库只检查传入的工作目录。
    boundary = next((path for path in (workspace, *workspace.parents) if (path / ".git").exists()), workspace)
    for directory in (workspace, *workspace.parents):
        roots.extend(directory / name for name in project_dirs)
        if directory == boundary:
            break
    return list(dict.fromkeys(path.expanduser().absolute() for path in roots))


def file_issue(path, root):
    try:
        path.resolve().relative_to(root)
        if not stat.S_ISREG(path.stat().st_mode):
            return "需要普通文件"
        with path.open("rb") as handle:
            if not handle.read(1):
                return "文件为空"
    except FileNotFoundError:
        return "文件缺失"
    except ValueError:
        return "引用超出技能目录"
    except (OSError, RuntimeError) as error:
        return f"无法读取（{error}）"
    return None


def frontmatter(script_text):
    match = FRONTMATTER.match(script_text)
    if not match:
        return None, None
    name = re.search(r"^name:[ \t]*['\"]?([a-z0-9-]+)['\"]?[ \t]*(?:#.*)?$", match[1], re.M)
    version = re.search(r"^[ \t]*version:[ \t]*['\"]?([\w.+-]+)", match[1], re.M)
    return name[1] if name else None, version[1] if version else None


def inspect_skill(entry, name):
    root = entry.parent.resolve()
    files = [entry, *(entry.parent / file for file in REQUIRED[name])]
    issues = []
    scanned = set()
    version = None
    if name == BUILDER and all(file_issue(entry.parent / file, root) for file in AUDIT):
        issues.append("缺少可读取的 scripts/audit_artifact.mjs 或 scripts/audit_artifact.py")
    while files:
        file = files.pop(0)
        issue = file_issue(file, root)
        label = os.path.relpath(file, entry.parent)
        if issue:
            issues.append(f"{label}：{issue}")
            continue
        resolved = file.resolve()
        if resolved in scanned or resolved.suffix.lower() != ".md":
            continue
        scanned.add(resolved)
        try:
            contents = file.read_text(encoding="utf-8-sig")
        except (OSError, UnicodeError) as error:
            issues.append(f"{label}：无法读取 Markdown（{error}）")
            continue
        if file == entry:
            declared, version = frontmatter(contents)
            if declared != name:
                issues.append(f"SKILL.md 的 name 应为 {name}，实际为 {declared or '未声明'}")
        for angled, plain in MARKDOWN_LINK.findall(CODE_FENCE.sub("", contents)):
            target = unquote((angled or plain).split("#", 1)[0]).strip()
            if target and not target.startswith("/") and not re.match(r"^[\w+.-]+:", target):
                files.append(file.parent / target)
    return version, list(dict.fromkeys(issues))


def find_skill(name, roots, visible):
    session_paths = [path for path in visible if path.name == "SKILL.md" and path.parent.name == name]
    candidates = session_paths or [root / name / "SKILL.md" for root in roots]
    found = {}
    denied = []
    for entry in candidates:
        try:
            if not session_paths:
                entry.parent.lstat()
            found.setdefault(entry.resolve(), entry)
        except FileNotFoundError:
            continue
        except (OSError, RuntimeError) as error:
            denied.append(f"{entry}：{error}")

    result = {"path": None, "version": None, "issues": denied, "candidates": [str(path) for path in found.values()]}
    if not found:
        result["status"] = "unknown" if denied or not candidates else "missing"
        return result
    if len(found) > 1:
        return dict(result, status="ambiguous")
    entry = next(iter(found.values()))
    version, issues = inspect_skill(entry, name)
    if issues:
        status = "incomplete"
    else:
        status = "visible" if session_paths else "on_disk"
    return dict(result, status=status, path=str(entry), version=version, issues=issues + denied)


def run(command, timeout, env=None, cwd=None):
    return subprocess.run(command, capture_output=True, text=True, encoding="utf-8", errors="replace",
                          timeout=timeout, env=env, cwd=cwd)


def runtime(name):
    path = shutil.which(name)
    if not path:
        return {"status": "missing", "path": None, "version": None}
    path = os.path.abspath(path)
    result = {"path": path, "version": None}
    try:
        probe = run([path, "--version"], timeout=5)
    except (OSError, subprocess.TimeoutExpired) as error:
        return dict(result, status="error", detail=str(error))
    version = probe.stdout.strip()
    if probe.returncode or not VERSION.fullmatch(version):
        return dict(result, status="error", detail=f"--version 未返回有效版本（退出码 {probe.returncode}）")
    return dict(result, status="ok", version=version)


def cli_receipt(result, bins):
    records = [line.split(":", 1)[1] for line in (result.stdout + "\n" + result.stderr).splitlines()
               if line.startswith("CLI_VERSION_JSON:")]
    try:
        receipt = json.loads(records[0]) if len(records) == 1 else None
    except ValueError:
        receipt = None
    if not isinstance(receipt, dict):
        return {"status": "failed", "detail": f"官方脚本没有返回唯一且有效的 CLI_VERSION_JSON（退出码 {result.returncode}）"}
    if (result.returncode != 0 or receipt.get("status") not in ("current", "installed", "updated")
            or not isinstance(receipt.get("version"), str) or not VERSION.fullmatch(receipt["version"])
            or receipt.get("env") != "prod" or receipt.get("tag") != "latest"):
        detail = receipt.get("message") or f"门禁回执未通过（退出码 {result.returncode}）"
        return {"status": "failed", "detail": str(detail)[:600]}
    executable = shutil.which("redapp", path=str(bins))
    if not executable or Path(executable).parent.resolve() != bins.resolve():
        return {"status": "failed", "detail": "临时 npm 安装目录未提供 redapp 入口"}
    return {"status": "verified", **{key: receipt[key] for key in ("version", "env", "tag")},
            "gate_status": receipt["status"]}


def verify_cli(entry, node):
    try:
        with TemporaryDirectory(prefix="xhs-doctor-") as temporary:
            base = Path(temporary)
            prefix = base / "npm"
            bins = prefix if os.name == "nt" else prefix / "bin"
            bins.mkdir(parents=True)
            env = {key: value for key, value in os.environ.items()
                   if key.lower() not in {"node_options", "npm_config_prefix", "npm_config_cache", "npm_config_userconfig"}}
            env.update(NPM_CONFIG_PREFIX=str(prefix), NPM_CONFIG_CACHE=str(base / "cache"),
                       NPM_CONFIG_USERCONFIG=str(base / "npmrc"),
                       PATH=os.pathsep.join((str(bins), env.get("PATH", os.defpath))))
            result = run([node, str(Path(entry).parent / ENSURE)], timeout=270, env=env, cwd=base)
            return cli_receipt(result, bins)
    except (OSError, subprocess.TimeoutExpired) as error:
        return {"status": "failed", "detail": str(error)}


def assess(skills, runtimes, verify):
    builder, redapp = skills[BUILDER], skills[REDAPP]
    broken = {"missing", "incomplete"}
    development = {"visible": "ready", "missing": "blocked", "incomplete": "blocked"}.get(builder["status"], "pending")
    node = runtimes["node"]
    major = int(node["version"].lstrip("v").split(".", 1)[0]) if node["status"] == "ok" else 0
    cli = "blocked" if redapp["status"] in broken or major < 18 or runtimes["npm"]["status"] != "ok" else "pending"
    gate = {"status": "unchecked"}
    if verify:
        if cli == "blocked" or redapp["status"] != "visible":
            gate = {"status": "failed", "detail": "先确认当前会话可调用完整、可信的 redapp-cli，且 Node.js 18+ 与 npm 可用"}
        else:
            gate = verify_cli(redapp["path"], node["path"])
        cli = "ready" if gate["status"] == "verified" else "blocked"
    return {"development": development, "cli": cli,
            "simulator": "blocked" if major < 20 or cli == "blocked" else "pending",
            "auth": "pending"}, gate


def print_report(report):
    labels = {"visible": "当前会话可调用", "on_disk": "文件齐全，待确认会话可调用", "missing": "搜索范围内未找到",
              "incomplete": "文件不完整", "unknown": "无法确定", "ambiguous": "发现多个副本，需确认会话使用路径",
              "ok": "可用", "error": "执行失败", "ready": "就绪", "pending": "待验证", "blocked": "缺少前提或检查失败"}
    print(f"Agent {report['agent']} · {report['system']} · {report['workspace']}")
    for name, item in {**report["skills"], **report["runtimes"]}.items():
        print(f"- {name} {labels[item['status']]} {item.get('version') or ''} {item.get('path') or ''}".rstrip())
        for detail in [*item.get("issues", []), item.get("detail")]:
            if detail:
                print(f"  {detail}")
        if item["status"] == "ambiguous":
            for path in item["candidates"]:
                print(f"  {path}")
    print("- PATH 中的 redapp " + (report["redapp_path"] or "未找到"))
    for key, label in zip(("development", "cli", "simulator", "auth"), ("开发与打包", "CLI", "模拟器", "登录授权")):
        print(f"- {label} {labels[report['readiness'][key]]}")
    gate = report["cli_gate"]
    if gate["status"] == "verified":
        print(f"- 官方门禁通过 · {gate['version']} / {gate['tag']} / {gate['env']}（临时环境）")
    elif gate["status"] == "failed":
        print(f"- 官方门禁失败 · {gate['detail']}")
    if report["readiness"]["development"] != "ready" or report["skills"][REDAPP]["status"] != "visible":
        print("下一步：在当前 Agent 的技能列表确认两个官方 Skill，缺项时按开发指南的 doctor 说明安装或刷新。")
    elif report["readiness"]["cli"] == "pending":
        print("下一步：需要验证官方 CLI 时，运行 doctor verify。")
    if report["readiness"]["simulator"] == "blocked":
        print("模拟器前提：CLI 门禁可通过，且 Node.js 20+ 和 npm 可用。")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--agent", choices=AGENT_ROOTS, help="当前 Agent；默认仅在有明确会话特征时识别")
    parser.add_argument("--workspace", type=Path, default=Path.cwd(), help="当前会话的工作目录")
    parser.add_argument("--skill-root", action="append", type=Path, default=[], help="已确认属于当前 Agent 的额外技能目录")
    parser.add_argument("--visible-skill", action="append", type=Path, default=[], help="当前会话确认可调用的 SKILL.md 绝对路径")
    parser.add_argument("--verify-cli", action="store_true", help="对已核实来源的会话可用 redapp-cli 运行官方门禁，联网并在临时目录安装 CLI")
    parser.add_argument("--json", action="store_true", help="输出 JSON 检查结果")
    args = parser.parse_args()
    if any(not path.is_absolute() or path.name != "SKILL.md" for path in args.visible_skill):
        parser.error("--visible-skill 必须是 SKILL.md 的绝对路径")

    agent = args.agent or detect_agent()
    workspace = args.workspace.expanduser().resolve()
    if not workspace.is_dir():
        parser.error("--workspace 必须是存在的目录")
    roots = skill_roots(agent, workspace, args.skill_root)
    skills = {name: find_skill(name, roots, args.visible_skill) for name in REQUIRED}
    runtimes = {name: runtime(name) for name in ("node", "npm")}
    readiness, gate = assess(skills, runtimes, args.verify_cli)
    report = {"agent": agent, "system": f"{platform.system()} {platform.machine()}", "workspace": str(workspace),
              "searched_roots": [str(root) for root in roots], "skills": skills, "runtimes": runtimes,
              "redapp_path": shutil.which("redapp"), "readiness": readiness, "cli_gate": gate}
    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        print_report(report)
    return int("blocked" in readiness.values())


if __name__ == "__main__":
    raise SystemExit(main())
