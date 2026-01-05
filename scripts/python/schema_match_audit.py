#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable


REPO_DEFAULT_EXCLUDES = {
    ".git",
    "node_modules",
    "dist",
    "build",
    ".next",
    ".turbo",
    ".cache",
    ".venv",
    "__pycache__",
    "coverage",
}

DEFAULT_SCOPES = [
    "src",
    "supabase/functions",
    "tests",
    "archive",
]

DEFAULT_EXCLUDE_FILES = {
    Path("src/integrations/supabase/types.ts"),
}


SCAN_CODE_EXTENSIONS = {".ts", ".tsx", ".js", ".jsx"}
SCAN_TEXT_EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".md", ".sql", ".txt"}


FROM_RE = re.compile(r"""\.from\(\s*(?P<q>['"`])(?P<table>[^'"`]+)(?P=q)\s*\)""")
SELECT_RE = re.compile(r"""\.select\(\s*(?P<q>['"`])(?P<sel>[^'"`]*)(?P=q)""")


OP_MARKERS = {
    "select": re.compile(r"\.select\("),
    "insert": re.compile(r"\.insert\("),
    "update": re.compile(r"\.update\("),
    "upsert": re.compile(r"\.upsert\("),
    "delete": re.compile(r"\.delete\("),
    "rpc": re.compile(r"\.rpc\("),
}


BANNED_PATTERNS: dict[str, re.Pattern[str]] = {
    'from("transactions")': re.compile(r"""\.from\(\s*['"`]transactions['"`]\s*\)"""),
    "tx_type": re.compile(r"\btx_type\b"),
    "effective_date": re.compile(r"\beffective_date\b"),
    "full_name": re.compile(r"\bfull_name\b"),
    "ib_source": re.compile(r"\bib_source\b"),
}


CREATE_TABLE_RE = re.compile(r'^CREATE TABLE IF NOT EXISTS "public"\."(?P<table>[^"]+)" \($')
CREATE_TYPE_ENUM_RE = re.compile(r'^CREATE TYPE "public"\."(?P<type>[^"]+)" AS ENUM \($')
COLUMN_RE = re.compile(r'^\s+"(?P<col>[^"]+)"\s+')
ENUM_VALUE_RE = re.compile(r"^\s+'(?P<val>[^']+)'\s*,?\s*$")


def iter_repo_files(repo_root: Path, extensions: set[str], scopes: list[Path]) -> Iterable[Path]:
    for path in repo_root.rglob("*"):
        if not path.is_file():
            continue
        if any(part in REPO_DEFAULT_EXCLUDES for part in path.parts):
            continue
        if path.suffix.lower() not in extensions:
            continue
        if scopes:
            try:
                rel = path.relative_to(repo_root)
            except ValueError:
                continue
            if not any(rel.is_relative_to(scope) for scope in scopes):
                continue
            if rel in DEFAULT_EXCLUDE_FILES:
                continue
        yield path


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def split_select_columns(select_expr: str) -> list[str]:
    """
    Splits a Supabase/PostgREST select string by commas, ignoring commas inside parentheses.
    Example: "id, funds(code), profiles(first_name,last_name)" -> ["id", "funds(code)", "profiles(first_name,last_name)"]
    """
    parts: list[str] = []
    buf: list[str] = []
    depth = 0
    for ch in select_expr:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth = max(depth - 1, 0)
        elif ch == "," and depth == 0:
            part = "".join(buf).strip()
            if part:
                parts.append(part)
            buf = []
            continue
        buf.append(ch)
    tail = "".join(buf).strip()
    if tail:
        parts.append(tail)
    return parts


def parse_schema_dump(schema_dump_path: Path) -> dict[str, Any]:
    text = read_text(schema_dump_path)
    lines = text.splitlines()

    tables: dict[str, dict[str, Any]] = {}
    enums: dict[str, list[str]] = {}

    idx = 0
    while idx < len(lines):
        line = lines[idx]

        m_table = CREATE_TABLE_RE.match(line)
        if m_table:
            table_name = m_table.group("table")
            cols: list[str] = []
            idx += 1
            while idx < len(lines):
                if lines[idx].strip() == ");":
                    break
                m_col = COLUMN_RE.match(lines[idx])
                if m_col:
                    cols.append(m_col.group("col"))
                idx += 1
            tables[table_name] = {"columns": sorted(set(cols))}
            idx += 1
            continue

        m_enum = CREATE_TYPE_ENUM_RE.match(line)
        if m_enum:
            enum_name = m_enum.group("type")
            vals: list[str] = []
            idx += 1
            while idx < len(lines):
                if lines[idx].strip() == ");":
                    break
                m_val = ENUM_VALUE_RE.match(lines[idx])
                if m_val:
                    vals.append(m_val.group("val"))
                idx += 1
            enums[enum_name] = vals
            idx += 1
            continue

        idx += 1

    return {"tables": tables, "enums": enums}


@dataclass(frozen=True)
class FromCall:
    file: str
    line: int
    table: str
    operation: str
    snippet: str


@dataclass(frozen=True)
class SelectCall:
    file: str
    line: int
    select: str


@dataclass(frozen=True)
class BannedRef:
    key: str
    file: str
    line: int
    text: str


def find_from_calls(repo_root: Path, scopes: list[Path]) -> list[FromCall]:
    results: list[FromCall] = []
    for path in iter_repo_files(repo_root, SCAN_CODE_EXTENSIONS, scopes):
        rel = str(path.relative_to(repo_root))
        lines = read_text(path).splitlines()
        for i, line in enumerate(lines, start=1):
            m = FROM_RE.search(line)
            if not m:
                continue
            table = m.group("table")
            window_lines = [line]
            for j in range(i, min(i + 12, len(lines) + 1)):
                if j == i:
                    continue
                window_lines.append(lines[j - 1])
                if ";" in lines[j - 1]:
                    break
            window = "\n".join(window_lines)

            op = "unknown"
            for candidate, marker in OP_MARKERS.items():
                if marker.search(window):
                    op = candidate
                    break

            snippet = window[:800]
            results.append(
                FromCall(file=rel, line=i, table=table, operation=op, snippet=snippet)
            )
    return results


def find_select_calls(repo_root: Path, scopes: list[Path]) -> list[SelectCall]:
    results: list[SelectCall] = []
    for path in iter_repo_files(repo_root, SCAN_CODE_EXTENSIONS, scopes):
        rel = str(path.relative_to(repo_root))
        lines = read_text(path).splitlines()
        for i, line in enumerate(lines, start=1):
            m = SELECT_RE.search(line)
            if not m:
                continue
            sel = m.group("sel")
            results.append(SelectCall(file=rel, line=i, select=sel))
    return results


def find_banned_refs(repo_root: Path, scopes: list[Path]) -> list[BannedRef]:
    results: list[BannedRef] = []
    for path in iter_repo_files(repo_root, SCAN_TEXT_EXTENSIONS, scopes):
        rel = str(path.relative_to(repo_root))
        lines = read_text(path).splitlines()
        for i, line in enumerate(lines, start=1):
            for key, pattern in BANNED_PATTERNS.items():
                if pattern.search(line):
                    results.append(BannedRef(key=key, file=rel, line=i, text=line.rstrip()))
    return results


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def write_csv(path: Path, rows: list[dict[str, Any]], fieldnames: list[str]) -> None:
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate Supabase schema/query mismatch audit artifacts.")
    parser.add_argument("--repo-root", type=Path, default=Path("."))
    parser.add_argument("--schema-dump", type=Path, default=Path("/tmp/indigo_yield_remote.sql"))
    parser.add_argument("--out-dir", type=Path, default=Path("docs/audit"))
    parser.add_argument(
        "--scopes",
        type=str,
        default=",".join(DEFAULT_SCOPES),
        help="Comma-separated list of repo-relative paths to scan (default: src,supabase/functions,tests,archive).",
    )
    args = parser.parse_args()

    repo_root = args.repo_root.resolve()
    out_dir = (repo_root / args.out_dir).resolve()
    scopes = [Path(p.strip()) for p in args.scopes.split(",") if p.strip()]

    ensure_dir(out_dir)

    schema = parse_schema_dump(args.schema_dump)
    write_json(out_dir / "live_schema_summary.json", schema)

    from_calls = find_from_calls(repo_root, scopes=scopes)
    select_calls = find_select_calls(repo_root, scopes=scopes)
    banned_refs = find_banned_refs(repo_root, scopes=scopes)

    write_json(
        out_dir / "query_inventory.json",
        {
            "from_calls": [fc.__dict__ for fc in from_calls],
            "select_calls": [sc.__dict__ for sc in select_calls],
        },
    )

    write_json(out_dir / "banned_refs.json", [br.__dict__ for br in banned_refs])

    write_csv(
        out_dir / "from_calls.csv",
        [fc.__dict__ for fc in from_calls],
        fieldnames=["file", "line", "table", "operation", "snippet"],
    )
    write_csv(
        out_dir / "banned_refs.csv",
        [br.__dict__ for br in banned_refs],
        fieldnames=["key", "file", "line", "text"],
    )

    summary = {
        "repo_root": str(repo_root),
        "schema_dump": str(args.schema_dump),
        "scopes": [str(s) for s in scopes],
        "counts": {
            "from_calls": len(from_calls),
            "select_calls": len(select_calls),
            "banned_refs": len(banned_refs),
        },
        "banned_refs_counts": {
            k: sum(1 for br in banned_refs if br.key == k) for k in BANNED_PATTERNS.keys()
        },
        "note": "These artifacts are generated. Re-run after refactors to confirm counts drop to zero for banned refs.",
    }
    write_json(out_dir / "audit_summary.json", summary)


if __name__ == "__main__":
    main()
