import argparse
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
from tempfile import TemporaryDirectory
from zipfile import ZIP_DEFLATED, ZipFile


ROOT = Path(__file__).resolve().parents[1]
SKILLS = ROOT / "skills"
DIST = ROOT / "dist"
MAX_FILE_BYTES = 10 * 1024 * 1024
MAX_SKILL_BYTES = 30 * 1024 * 1024
ALLOWED_EXTENSIONS = {
    ".md", ".txt", ".html", ".htm", ".css", ".js", ".py", ".java",
    ".cpp", ".c", ".h", ".php", ".sh", ".bat", ".ps1", ".json", ".xml",
    ".sql", ".ini", ".cfg", ".log", ".db", ".sqlite", ".sqlite3", ".mdb",
    ".accdb", ".sys",
}


def tracked_skills():
    result = subprocess.run(
        ["git", "ls-files", "-z", "--deduplicate", "--", "skills/"],
        cwd=ROOT,
        stdout=subprocess.PIPE,
        check=True,
    )
    skills = {}
    for path in os.fsdecode(result.stdout).split("\0"):
        parts = path.split("/", 2)
        if len(parts) == 3:
            _, name, relative = parts
            skills.setdefault(name, []).append(relative)
    return skills


def skill_files(name, paths):
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", name):
        raise ValueError(f"技能目录名格式无效：{name}")
    if "SKILL.md" not in paths:
        raise ValueError(f"{name} 缺少位于根目录且已纳入 Git 的 SKILL.md")

    total = 0
    files = []
    for relative in paths:
        entry = PurePosixPath(relative)
        if "\\" in relative or ":" in relative or any(part.startswith(".") for part in entry.parts):
            raise ValueError(f"{name}/{relative} 使用了不适合上传的路径")
        if entry.suffix.lower() not in ALLOWED_EXTENSIONS:
            raise ValueError(f"{name}/{relative} 的文件格式不受小红书支持")
        source = SKILLS.joinpath(name, *entry.parts)
        if source.resolve() != source or not source.is_file():
            raise ValueError(f"{name}/{relative} 不存在或不是普通文件，打包不接受符号链接")
        size = source.stat().st_size
        if size > MAX_FILE_BYTES:
            raise ValueError(f"{name}/{relative} 超过单文件 10 MiB 上限")
        total += size
        if total > MAX_SKILL_BYTES:
            raise ValueError(f"{name} 的文件总大小超过 30 MiB 上限")
        files.append((source, relative))
    return files


def main():
    parser = argparse.ArgumentParser(description="生成可上传到小红书的技能 ZIP")
    selection = parser.add_mutually_exclusive_group(required=True)
    selection.add_argument("skill", nargs="?", help="要打包的技能目录名")
    selection.add_argument("--all", action="store_true", help="为每项技能生成一个 ZIP")
    args = parser.parse_args()

    try:
        skills = tracked_skills()
        if args.skill is not None and args.skill not in skills:
            raise ValueError(f"找不到技能 {args.skill!r}。可用技能：{', '.join(sorted(skills)) or '无'}")
        names = [args.skill] if args.skill is not None else sorted(skills)
        if not names:
            raise ValueError("skills/ 下没有纳入 Git 的技能")
        packages = {name: skill_files(name, skills[name]) for name in names}
        outputs = {name: DIST / f"{name}.zip" for name in packages}

        if DIST.is_symlink():
            raise ValueError("输出目录 dist 不能是符号链接")
        DIST.mkdir(exist_ok=True)
        for output in outputs.values():
            if output.is_symlink() or (output.exists() and not output.is_file()):
                raise ValueError(f"dist/{output.name} 已存在，且不是可替换的普通文件")

        with TemporaryDirectory(dir=DIST) as temporary:
            temporary_path = Path(temporary)
            for name, files in packages.items():
                with ZipFile(temporary_path / outputs[name].name, "w", ZIP_DEFLATED) as archive:
                    for source, relative in files:
                        archive.write(source, relative)
            for output in outputs.values():
                (temporary_path / output.name).replace(output)
                print(f"dist/{output.name}")
    except (OSError, RuntimeError, subprocess.CalledProcessError, ValueError) as error:
        parser.exit(1, f"打包失败：{error}\n")


if __name__ == "__main__":
    main()
