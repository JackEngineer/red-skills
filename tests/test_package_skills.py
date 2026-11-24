from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
import zipfile


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "package_skills.py"


class PackageSkillsTests(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary_directory.cleanup)
        self.root = Path(self.temporary_directory.name)
        (self.root / "scripts").mkdir()
        shutil.copyfile(SCRIPT, self.root / "scripts" / SCRIPT.name)
        self.git("init", "--quiet")

    def git(self, *arguments):
        return subprocess.run(
            ["git", *arguments], cwd=self.root, check=True, capture_output=True
        )

    def write(self, relative_path, content):
        path = self.root / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        return path

    def skill(self, name):
        self.write(f"skills/{name}/SKILL.md", f"# {name}\n".encode())
        self.git("add", f"skills/{name}")

    def package(self, *arguments):
        return subprocess.run(
            [sys.executable, "scripts/package_skills.py", *arguments],
            cwd=self.root,
            capture_output=True,
            text=True,
        )

    def archive_contents(self, name):
        with zipfile.ZipFile(self.root / "dist" / f"{name}.zip") as archive:
            return {entry: archive.read(entry) for entry in archive.namelist()}

    def test_single_skill_uses_current_bytes_and_git_registered_paths(self):
        self.skill("sample")
        root_content = "# 当前内容\r\n".encode()
        reference_content = "保留原始字节\r\n".encode()
        self.write("skills/sample/SKILL.md", root_content)
        self.write("skills/sample/references/中文 说明.md", reference_content)
        self.git("add", "skills/sample/references")
        self.write("skills/sample/local-notes.md", b"must stay local")
        self.skill("other")

        result = self.package("sample")

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.archive_contents("sample"), {
            "SKILL.md": root_content,
            "references/中文 说明.md": reference_content,
        })
        self.assertFalse((self.root / "dist/other.zip").exists())

    def test_all_packages_each_registered_skill(self):
        self.skill("alpha")
        self.skill("beta")
        self.write("skills/beta/scripts/query.js", b"console.log('ok');\n")
        self.git("add", "skills/beta/scripts/query.js")

        result = self.package("--all")

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.archive_contents("alpha"), {"SKILL.md": b"# alpha\n"})
        self.assertEqual(self.archive_contents("beta"), {
            "SKILL.md": b"# beta\n",
            "scripts/query.js": b"console.log('ok');\n",
        })

    def test_invalid_and_unknown_names_do_not_write_archives(self):
        self.skill("sample")
        sentinel = b"existing archive must survive"
        archive = self.write("dist/sample.zip", sentinel)

        for name in ("../sample", "sample/child", "unknown"):
            with self.subTest(name=name):
                self.assertNotEqual(self.package(name).returncode, 0)
                self.assertEqual(archive.read_bytes(), sentinel)
                self.assertEqual(list((self.root / "dist").iterdir()), [archive])

    def test_missing_root_or_unsupported_extension_preserves_existing_archive(self):
        for name, relative_path in (
            ("missing-root", "references/guide.md"),
            ("unsupported", "private.exe"),
        ):
            with self.subTest(name=name):
                if name == "unsupported":
                    self.skill(name)
                self.write(f"skills/{name}/{relative_path}", b"fixture")
                self.git("add", f"skills/{name}")
                archive = self.write(f"dist/{name}.zip", b"keep existing ZIP")

                self.assertNotEqual(self.package(name).returncode, 0)
                self.assertEqual(archive.read_bytes(), b"keep existing ZIP")

    def test_tracked_symlink_is_rejected_without_replacing_archive(self):
        self.skill("sample")
        target = self.write("outside.md", b"must not be followed")
        try:
            (self.root / "skills/sample/reference.md").symlink_to(target)
        except OSError:
            if sys.platform != "win32":
                raise
            self.skipTest("当前 Windows 环境无法创建符号链接")
        self.git("add", "skills/sample/reference.md")
        archive = self.write("dist/sample.zip", b"keep existing ZIP")

        result = self.package("sample")

        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(archive.read_bytes(), b"keep existing ZIP")

    def test_size_limits_preserve_existing_archive(self):
        self.skill("sample")
        references = [self.write(f"skills/sample/{name}.md", b"") for name in ("a", "b", "c")]
        self.git("add", "skills/sample")
        archive = self.write("dist/sample.zip", b"keep existing ZIP")
        for reference in references:
            with reference.open("r+b") as stream:
                stream.truncate(10 * 1024 * 1024)

        result = self.package("sample")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("30 MiB", result.stderr)
        self.assertEqual(archive.read_bytes(), b"keep existing ZIP")

        with references[0].open("r+b") as stream:
            stream.truncate(10 * 1024 * 1024 + 1)

        result = self.package("sample")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("10 MiB", result.stderr)
        self.assertEqual(archive.read_bytes(), b"keep existing ZIP")

    def test_all_preserves_existing_archives_if_a_destination_is_a_directory(self):
        self.skill("alpha")
        self.skill("beta")
        archive = self.write("dist/alpha.zip", b"keep existing ZIP")
        blocked = self.root / "dist/beta.zip"
        blocked.mkdir()

        result = self.package("--all")

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("beta.zip", result.stderr)
        self.assertEqual(archive.read_bytes(), b"keep existing ZIP")
        self.assertTrue(blocked.is_dir())


if __name__ == "__main__":
    unittest.main()
