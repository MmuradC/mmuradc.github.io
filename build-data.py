#!/usr/bin/env python3
"""
INFO.md -> projects.js

INFO.md is the place you edit. This turns it into a plain JS file that the
page can load with a <script> tag, which matters because fetch() is blocked
when a page is opened straight from disk (file://) -- that is why the photos
used to disappear. A <script> tag works everywhere.

Run this after every INFO.md edit:

    python3 build-data.py

Exits non-zero only if the hero photo is missing -- that one makes the page
look broken. Missing project art is a warning; those cards just fall back to
their placeholder tile.
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "INFO.md"
TARGET = ROOT / "projects.js"


def read_field(block: str, name: str) -> str:
    """Value on the line after '**Name**'."""
    m = re.search(r"^\*\*" + re.escape(name) + r"\*\*[ \t]*\n(.*)$", block, re.M)
    return m.group(1).strip() if m else ""


def split_list(value: str) -> list:
    return [p.strip() for p in value.split(",") if p.strip()]


def main() -> int:
    if not SOURCE.exists():
        print(f"error: {SOURCE} not found", file=sys.stderr)
        return 1

    text = SOURCE.read_text(encoding="utf-8")

    # ── profile: everything up to the first '---' separator ──────────────
    profile_part = text.split("# Profile", 1)[1].split("---", 1)[0]
    profile = {
        "name": read_field(profile_part, "Name"),
        "thumbnail": read_field(profile_part, "Thumbnail"),
        "description": read_field(profile_part, "Description"),
        "technologies": split_list(read_field(profile_part, "Technologies")),
    }

    # ── projects ─────────────────────────────────────────────────────────
    projects_part = text.split("# Projects", 1)[1]
    blocks = re.split(r"\*\*Name\*\*", projects_part)[1:]

    projects = []
    for block in blocks:
        name = block.lstrip("\n").split("\n", 1)[0].strip()
        if not name:
            continue
        projects.append({
            "name": name,
            "thumbnail": read_field(block, "Thumbnail"),
            "description": read_field(block, "Description"),
            "technologies": split_list(read_field(block, "Technologies")),
        })

    # ── validate every referenced image actually exists ──────────────────
    # The hero photo is load-bearing: a wrong path there makes the page look
    # broken, so it is a hard error. Project art is decorative, so a missing
    # file is only a warning and the card falls back to its placeholder tile.
    # Either way the bad path is blanked out, because a path that does not
    # exist renders as a broken-image icon in the browser.
    hard_error = False
    warnings = []

    for item in [profile] + projects:
        thumb = item.get("thumbnail", "")
        if not thumb or thumb == "(placeholder)":
            continue
        if (ROOT / thumb).exists():
            continue

        item["missing"] = thumb
        item["thumbnail"] = ""

        if item is profile:
            hard_error = True
            print(f"ERROR: profile photo not found: {thumb}", file=sys.stderr)
        else:
            warnings.append((item["name"], thumb))

    data = {"profile": profile, "projects": projects}

    TARGET.write_text(
        "/* Auto-generated from INFO.md by build-data.py -- do not edit by hand.\n"
        "   Regenerate with:  python3 build-data.py  */\n"
        "window.SITE_DATA = "
        + json.dumps(data, indent=2, ensure_ascii=False)
        + ";\n",
        encoding="utf-8",
    )

    print(f"projects.js written: {len(projects)} projects")

    if warnings:
        print(f"\nwarning: {len(warnings)} project image(s) not on disk yet, "
              "placeholder art used instead:", file=sys.stderr)
        for name, path in warnings:
            print(f"  {name}: {path}", file=sys.stderr)

    if hard_error:
        print("\nThe hero photo is required. Fix its path in INFO.md, then "
              "run this again.", file=sys.stderr)
        return 1

    placeholders = [p["name"] for p in projects if p["thumbnail"] == "(placeholder)"]
    if placeholders:
        print(f"note: {len(placeholders)} project(s) still on the placeholder art:")
        for name in placeholders:
            print(f"  - {name}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
