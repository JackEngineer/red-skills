import json
import os
from pathlib import Path
import shlex
import subprocess
import sys
import tempfile
import textwrap
import unittest


SCRIPT = Path(__file__).resolve().parents[1] / "skills/xhs-minitool-guide/scripts/doctor.py"
BUILDER = "minitool-zip-builder"
MANAGER = "redapp-cli"
SKILL_FILES = {
    BUILDER: (
        "references/js-api.md",
        "references/zip-artifact-spec.md",
        "references/performance-budget.md",
        "scripts/audit_artifact.py",
    ),
    MANAGER: (
        "scripts/ensure-cli.mjs",
        "references/operations.md",
        "references/dev.md",
        "references/workflows.md",
    ),
}


class MinitoolDoctorTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve()
        self.home = self.root / "home"
        self.workspace = self.root / "workspace"
        self.bin = self.root / "bin"
        for directory in (self.home, self.workspace, self.bin):
            directory.mkdir()
        self.skills = self.home / ".agents" / "skills"
        self.unexpected_command = self.root / "unexpected-command"
        self.environment = {
            **os.environ,
            "HOME": str(self.home),
            "USERPROFILE": str(self.home),
            "CODEX_HOME": str(self.home / ".codex"),
            "PATH": str(self.bin),
            "TEMP": str(self.root),
            "TMP": str(self.root),
            "TMPDIR": str(self.root),
            "MINITOOL_TEST_UNEXPECTED_COMMAND": str(self.unexpected_command),
        }
        self.executable("node", "v22.14.0")
        self.executable("npm", "10.9.2")
        self.executable("redapp")

    def write(self, path, text):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
        return path

    def executable(self, name, version=None):
        if os.name == "nt":
            path = self.bin / f"{name}.cmd"
            body = "@echo off\n"
            if version:
                body += (
                    'if "%~1"=="--version" goto version\n'
                    'if "%~1"=="-v" goto version\n'
                )
            body += 'echo unexpected>>"%MINITOOL_TEST_UNEXPECTED_COMMAND%"\nexit /b 91\n'
            if version:
                body += f":version\necho {version}\nexit /b 0\n"
        else:
            path = self.bin / name
            body = "#!/bin/sh\n"
            if version:
                body += f"case \"$1\" in --version|-v) printf '%s\\n' '{version}'; exit 0;; esac\n"
            body += 'printf "unexpected\\n" >> "$MINITOOL_TEST_UNEXPECTED_COMMAND"\nexit 91\n'
        self.write(path, body).chmod(0o755)
        return path

    def install_fixture(self, name, root=None, extra_links=""):
        directory = (root or self.skills) / name
        entry = self.write(
            directory / "SKILL.md",
            f"---\nname: {name}\ndescription: 测试技能\nmetadata:\n"
            f"  version: '1.11.1'\n---\n\n# 测试技能\n\n{extra_links}\n",
        )
        for relative in SKILL_FILES[name]:
            self.write(directory / relative, "# 测试文件\n")
        return entry

    def doctor(self, *visible, verify=False):
        arguments = ["--agent", "codex", "--workspace", str(self.workspace), "--json"]
        for entry in visible:
            arguments.extend(("--visible-skill", str(entry)))
        if verify:
            arguments.append("--verify-cli")
        result = subprocess.run(
            [sys.executable, str(SCRIPT), *arguments],
            cwd=self.workspace,
            env=self.environment,
            capture_output=True,
            encoding="utf-8",
            timeout=10,
        )
        self.assertFalse(self.unexpected_command.exists(), "体检运行了版本查询以外的命令")
        self.assertTrue(result.stdout, result.stderr)
        return result.returncode, json.loads(result.stdout)

    def fake_gate(self, manager, receipt, *, exit_code=0, install_binary=True):
        observation = self.root / "gate-environment.json"
        if observation.exists():
            observation.unlink()
        gate = self.write(self.root / "fake_node.py", textwrap.dedent(f"""\
            import json
            import os
            from pathlib import Path
            import sys

            if sys.argv[1:] == ["--version"]:
                print("v22.14.0")
                sys.exit(0)

            assert sys.argv[1:] == [{str(manager.parent / "scripts/ensure-cli.mjs")!r}]
            prefix = Path(os.environ["NPM_CONFIG_PREFIX"])
            cache = Path(os.environ["NPM_CONFIG_CACHE"])
            bins = prefix if os.name == "nt" else prefix / "bin"
            assert Path(os.environ["PATH"].split(os.pathsep)[0]) == bins
            assert prefix.parent.resolve() == cache.parent.resolve() == Path.cwd().resolve()
            Path({str(observation)!r}).write_text(json.dumps({{
                "prefix": str(prefix), "cache": str(cache)
            }}), encoding="utf-8")
            cache.mkdir()
            if {install_binary!r}:
                redapp = bins / ("redapp.cmd" if os.name == "nt" else "redapp")
                redapp.write_text("fixture", encoding="utf-8")
                redapp.chmod(0o755)
            receipt = {receipt!r}
            if receipt is not None:
                print("CLI_VERSION_JSON:" + json.dumps(receipt))
            sys.exit({exit_code})
            """))
        if os.name == "nt":
            wrapper = f'@echo off\n"{sys.executable}" "{gate}" %*\nexit /b %errorlevel%\n'
            node = self.bin / "node.cmd"
        else:
            wrapper = f"#!/bin/sh\nexec {shlex.quote(sys.executable)} {shlex.quote(str(gate))} \"$@\"\n"
            node = self.bin / "node"
        self.write(node, wrapper).chmod(0o755)
        return observation

    def readiness(self, report, key):
        readiness = report["readiness"][key]
        return readiness["status"] if isinstance(readiness, dict) else readiness

    def assert_skill(self, report, name, status, path):
        self.assertEqual(report["skills"][name]["status"], status)
        actual = report["skills"][name]["path"]
        self.assertEqual(Path(actual).resolve() if actual else None, path)

    def test_visible_skills_make_development_ready_without_running_redapp(self):
        builder = self.install_fixture(BUILDER)
        manager = self.install_fixture(MANAGER)

        code, report = self.doctor(builder, manager)

        self.assertEqual(code, 0)
        self.assertEqual(report["agent"], "codex")
        self.assert_skill(report, BUILDER, "visible", builder)
        self.assert_skill(report, MANAGER, "visible", manager)
        for runtime in ("node", "npm"):
            self.assertEqual(report["runtimes"][runtime]["status"], "ok")
        self.assertEqual(self.readiness(report, "development"), "ready")
        self.assertEqual(self.readiness(report, "cli"), "pending")
        self.assertEqual(self.readiness(report, "auth"), "pending")

    def test_disk_installation_is_distinct_from_visible_and_missing_skills(self):
        builder = self.install_fixture(BUILDER)

        _, report = self.doctor()

        self.assert_skill(report, BUILDER, "on_disk", builder)
        self.assert_skill(report, MANAGER, "missing", None)
        self.assertEqual(self.readiness(report, "development"), "pending")
        self.assertEqual(self.readiness(report, "cli"), "blocked")

    def test_break_in_nested_reference_blocks_development_even_when_visible(self):
        builder = self.install_fixture(BUILDER, extra_links="[附录](references/nested/intro.md#细节)")
        self.write(builder.parent / "references/nested/intro.md", "[说明](../missing.md)\n")
        manager = self.install_fixture(MANAGER)

        code, report = self.doctor(builder, manager)

        self.assertEqual(code, 1)
        self.assert_skill(report, BUILDER, "incomplete", builder)
        self.assertEqual(self.readiness(report, "development"), "blocked")

    def test_wrong_frontmatter_name_does_not_count_as_valid_skill(self):
        builder = self.install_fixture(BUILDER)
        document = builder.read_text(encoding="utf-8").replace(f"name: {BUILDER}", "name: unrelated")
        self.write(builder, document)

        code, report = self.doctor(builder)

        self.assertEqual(code, 1)
        self.assertEqual(self.readiness(report, "development"), "blocked")

    def test_codex_does_not_count_skills_from_claude_private_directory(self):
        claude_skills = self.home / ".claude" / "skills"
        self.install_fixture(BUILDER, root=claude_skills)
        self.install_fixture(MANAGER, root=claude_skills)

        code, report = self.doctor()

        self.assertEqual(code, 1)
        self.assert_skill(report, BUILDER, "missing", None)
        self.assert_skill(report, MANAGER, "missing", None)

    def test_node_18_permits_development_but_blocks_simulator(self):
        builder = self.install_fixture(BUILDER)
        manager = self.install_fixture(MANAGER)
        self.executable("node", "v18.20.8")

        _, report = self.doctor(builder, manager)

        self.assertEqual(self.readiness(report, "development"), "ready")
        self.assertEqual(self.readiness(report, "cli"), "pending")
        self.assertEqual(self.readiness(report, "simulator"), "blocked")

    def test_missing_node_and_npm_do_not_prevent_reading_development_skill(self):
        builder = self.install_fixture(BUILDER)
        manager = self.install_fixture(MANAGER)
        self.executable("node", "v22.14.0").unlink()
        self.executable("npm", "10.9.2").unlink()

        _, report = self.doctor(builder, manager)

        self.assertEqual(report["runtimes"]["node"]["status"], "missing")
        self.assertEqual(report["runtimes"]["npm"]["status"], "missing")
        self.assertEqual(self.readiness(report, "development"), "ready")
        self.assertEqual(self.readiness(report, "cli"), "blocked")
        self.assertEqual(self.readiness(report, "simulator"), "blocked")

    def test_ambiguous_disk_copies_resolve_only_with_session_evidence(self):
        self.install_fixture(BUILDER)
        second = self.install_fixture(BUILDER, root=self.workspace / ".agents" / "skills")

        _, report = self.doctor()
        self.assert_skill(report, BUILDER, "ambiguous", None)

        _, report = self.doctor(second)
        self.assert_skill(report, BUILDER, "visible", second)

    def test_official_gate_success_cleans_temporary_npm_environment(self):
        builder = self.install_fixture(BUILDER)
        manager = self.install_fixture(MANAGER)
        observation = self.fake_gate(manager, {"status": "installed", "version": "1.1.2", "tag": "latest", "env": "prod"})

        code, report = self.doctor(builder, manager, verify=True)

        self.assertEqual(code, 0, report["cli_gate"])
        self.assertEqual(self.readiness(report, "cli"), "ready")
        self.assertEqual(self.readiness(report, "auth"), "pending")
        self.assertEqual(report["cli_gate"]["status"], "verified")
        self.assertEqual(report["cli_gate"]["version"], "1.1.2")
        for path in json.loads(observation.read_text(encoding="utf-8")).values():
            self.assertFalse(Path(path).exists(), f"临时 npm 路径未清理：{path}")

    def test_official_gate_rejects_false_success(self):
        builder = self.install_fixture(BUILDER)
        manager = self.install_fixture(MANAGER)
        success = {"status": "updated", "version": "1.1.2", "tag": "latest", "env": "prod"}
        for receipt, exit_code, install_binary in (
            (None, 0, True),
            ({"status": "error", "message": "安装失败"}, 0, True),
            (success, 1, True),
            (success, 0, False),
        ):
            with self.subTest(receipt=receipt, exit_code=exit_code, install_binary=install_binary):
                observation = self.fake_gate(manager, receipt, exit_code=exit_code, install_binary=install_binary)

                code, report = self.doctor(builder, manager, verify=True)

                self.assertEqual(code, 1)
                self.assertEqual(self.readiness(report, "cli"), "blocked")
                self.assertEqual(report["cli_gate"]["status"], "failed")
                for path in json.loads(observation.read_text(encoding="utf-8")).values():
                    self.assertFalse(Path(path).exists(), f"临时 npm 路径未清理：{path}")


if __name__ == "__main__":
    unittest.main()
