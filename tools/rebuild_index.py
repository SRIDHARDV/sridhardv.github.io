#!/usr/bin/env python3
"""Regenerate content/projects.json from whatever .md files are in
content/projects/.

You do not normally run this. The GitHub Action in
.github/workflows/projects-index.yml runs it on every push that touches
content/projects/, so the index in the repo is always current — adding a
project means adding one markdown file and pushing, nothing else.

Run it by hand only if you want the index refreshed without pushing:

    python3 tools/rebuild_index.py

(Local preview does not need it either: dev servers expose a directory
listing that the site reads directly.)

Order is taken from the project files themselves:
  1. `order:` ascending, if present
  2. then `year:` descending
  3. then title
"""

import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "content" / "projects"
OUT = ROOT / "content" / "projects.json"

FRONT_MATTER = re.compile(r"^﻿?---\r?\n(.*?)\r?\n---", re.S)


def front_matter(path: pathlib.Path) -> dict:
    """Parse the simple `key: value` front matter block. Mirrors the
    parser in assets/js/app.js — keep the two in step."""
    m = FRONT_MATTER.match(path.read_text(encoding="utf-8"))
    if not m:
        return {}
    meta = {}
    for line in m.group(1).splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        key, sep, val = line.partition(":")
        if not sep:
            continue
        meta[key.strip()] = val.strip().strip("\"'")
    return meta


def as_number(value, fallback):
    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


def main() -> int:
    if not SRC.is_dir():
        print(f"error: {SRC} does not exist", file=sys.stderr)
        return 1

    entries = []
    for path in sorted(SRC.glob("*.md")):
        meta = front_matter(path)
        entries.append((
            as_number(meta.get("order"), float("inf")),      # explicit order first
            -as_number(meta.get("year"), float("-inf")),     # then newest year
            str(meta.get("title") or path.stem).lower(),     # then title
            path.stem,
        ))

    slugs = [e[3] for e in sorted(entries)]
    new = json.dumps(slugs, indent=2) + "\n"
    old = OUT.read_text(encoding="utf-8") if OUT.exists() else ""

    if new == old:
        print(f"content/projects.json already up to date ({len(slugs)} projects)")
        return 0

    OUT.write_text(new, encoding="utf-8")
    print(f"wrote content/projects.json ({len(slugs)} projects)")
    for slug in slugs:
        print(f"  {slug}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
