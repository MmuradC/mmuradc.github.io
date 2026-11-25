#!/usr/bin/env python3
"""
INFO.md -> data.js

INFO.md is the place you edit. This compiles it into a plain JS file that the
pages can load with a <script> tag -- fetch() is blocked when a page is opened
straight from disk (file://), but a <script> tag works everywhere.

Run this after every INFO.md edit:

    python3 build-data.py

Sections parsed:  # Profile, # About (free Markdown), # Resume (Role/Org/
Period/Icon/Desc blocks), # Links, # Research, # Games (Name/Thumbnail/
Description/Technologies blocks).

Exits non-zero only if the hero photo is missing -- that one makes every page
look broken. Missing project art is a warning; those cards fall back to a
pixel-art placeholder tile.
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "INFO.md"
TARGET = ROOT / "data.js"


def read_field(block: str, name: str) -> str:
    """Value either on the same line ('**Field**  value') or the next line."""
    m = re.search(r"^\*\*" + re.escape(name) + r"\*\*[ \t]*(.*)$", block, re.M)
    if not m:
        return ""
    inline = m.group(1).strip()
    if inline:
        return inline
    after = block[m.end():].lstrip(" \t")[1:] if block[m.end():].startswith("\n") else ""
    return after.split("\n")[0].strip()


def read_multiline_field(block: str, name: str) -> str:
    """Value may wrap over lines until the next '**...' or '#'-heading."""
    m = re.search(
        r"^\*\*" + re.escape(name) + r"\*\*[ \t]*\n(.*?)(?=^\*\*|^#|\Z)",
        block, re.M | re.S)
    return m.group(1).strip() if m else ""


def split_list(value: str) -> list:
    return [p.strip() for p in value.split(",") if p.strip()]


def split_heading(text: str, heading: str) -> str:
    parts = re.split(r"^# " + re.escape(heading) + r"[ \t]*$", text,
                     flags=re.M)
    if len(parts) < 2:
        return ""
    tail = parts[1]
    next_h = re.search(r"^# ", tail, re.M)
    return tail[:next_h.start()] if next_h else tail


def item_blocks(section: str) -> list:
    """Split an item section on '**Name**' labels."""
    if not section:
        return []
    return re.split(r"^\*\*Name\*\*.*$", section, flags=re.M)[1:]


def parse_item(block: str) -> dict:
    name_m = re.match(r"^\n?(.+)$", block.lstrip())
    name = name_m.group(1).strip() if name_m else ""
    pipeline = ("Thumbnail", "Description", "Technologies")
    desc = read_field(block, "Description")
    technologies = split_list(read_field(block, "Technologies"))
    return {
        "name": name if name else read_field(block, "Title"),
        "thumbnail": read_field(block, "Thumbnail"),
        "description": desc,
        "technologies": technologies,
    }


def pipeline_items(block: str) -> list:
    return [t.strip() for t in pipeline(block, "Technologies").split(",") if t.strip()]


def pipeline(block: str, name: str) -> str:
    return read_field(block, name)


def parse_resume(section: str) -> list:
    entries = []
    blocks = re.split(r"^\*\*Role\*\*", section, flags=re.M)[1:]
    for b in blocks:
        role = b.lstrip().split("\n", 1)[0].strip() if b.strip() else ""
        if not role:
            continue
        entries.append({
            "role": role,
            "org": read_field(b, "Org"),
            "period": read_field(b, "Period"),
            "icon": read_field(b, "Icon"),
            "desc": read_field(b, "Desc"),
        })
    return entries


def parse_links(section: str) -> dict:
    links = {"Email": "", "GitHub": "", "LinkedIn": "", "itch.io": ""}
    for key in links:
        links[key] = read_field(section, key)
    return links


def check_art(items: list, is_profile: bool = False):
    """Blank out nonexistent thumbnails; profile photo missing is fatal."""
    for item in items:
        thumb = item.get("thumbnail", "")
        if not thumb or thumb == "(placeholder)":
            continue
        if (ROOT / thumb).exists():
            continue
        item["missing"] = thumb
        item["thumbnail"] = ""
        if is_profile:
            print(f"ERROR: profile photo not found: {thumb}", file=sys.stderr)
            return False
        print(f"warning: image not found (placeholder grid tile used): {thumb}",
              file=sys.stderr)
    return True


def main() -> int:
    if not SOURCE.exists():
        print(f"error: {SOURCE} not found", file=sys.stderr)
        return 1

    text = SOURCE.read_text(encoding="utf-8")

    profile_section = split_heading(text, "Profile")
    about_md = split_heading(text, "About").strip()
    resume_section = split_heading(text, "Resume")
    links_section = split_heading(text, "Links")

    profile = {
        "name": read_field(profile_section, "Name"),
        "thumbnail": read_field(profile_section, "Thumbnail"),
        "description": read_field(profile_section, "Description"),
        "technologies": split_list(read_field(profile_section, "Technologies")),
    }
    if not check_art([profile], is_profile=True):
        return 1

    games = []
    for b in item_blocks(split_heading(text, "Games")):
        name = b.lstrip("\n").split("\n", 1)[0].strip()
        pipeline_stub = {
            "name": name,
            "thumbnail": read_field(b, "Thumbnail"),
            "description": read_multiline_field(b, "Description")
                           or read_field(b, "Description"),
            "technologies": split_list(read_field(b, "Technologies")),
        }
        games.append(pipeline_stub)

    research = []
    for b in item_blocks(split_heading(text, "Research")):
        name = b.lstrip("\n").split("\n", 1)[0].strip()
        research.append({
            "name": name,
            "thumbnail": read_field(b, "Thumbnail"),
            "description": read_field(b, "Description"),
            "technologies": split_list(read_field(b, "Technologies")),
        })
    check_art(games + research)

    data = {
        "profile": profile,
        "about_md": about_md,
        "resume": parse_resume(resume_section),
        "links": parse_links(links_section),
        "games": games,
        "research": research,
    }

    TARGET.write_text(
        "/* Auto-generated from INFO.md by build-data.py -- do not edit by hand.\n"
        "   Regenerate with:  python3 build-data.py  */\n"
        "window.SITE_DATA = "
        + json.dumps(data, indent=2, ensure_ascii=False)
        + ";\n",
        encoding="utf-8",
    )

    print(f"data.js written: {len(games)} games, {len(research)} research items, "
          f"{len(data['resume'])} resume entries")

    return 0


if __name__ == "__main__":
    sys.exit(main())
