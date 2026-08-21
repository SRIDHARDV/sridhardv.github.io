#!/usr/bin/env python3
"""Build the generated parts of the site.

One directory per project, holding its source and its generated page side by
side. On a static host the directory path is also the public URL:

    projects/<slug>/index.md      the source you write
    projects/<slug>/index.html    GENERATED — served at /projects/<slug>/

Reads:
    CNAME                     the public origin
    profile.md                author name, socials, contact heading
    projects/<slug>/index.md  one directory per project

Writes:
    projects/<slug>/index.html   a fully static page per project
    projects/manifest.json       ordered card data for the home page grid
    sitemap.xml                  one entry per project, always in step

The project pages are generated rather than rendered in the browser so that
every project URL serves its own title, description, canonical link, and
article text to a crawler that does not run JavaScript. A query-string page
(project.html?p=...) cannot do that on a static host: every one of those URLs
returns byte-identical HTML.

Run it after adding or editing anything under projects/:

    python3 tools/build.py

You can also just push — the GitHub Action in
.github/workflows/projects-index.yml runs this and commits the result.

Order is taken from the project files themselves:
  1. `order:` ascending, if present
  2. then `year:` descending
  3. then title
"""

import html
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "projects"
PROFILE = ROOT / "profile.md"
TEMPLATE = pathlib.Path(__file__).resolve().parent / "project-template.html"
MANIFEST_OUT = SRC / "manifest.json"
SITEMAP_OUT = ROOT / "sitemap.xml"

# Social preview image. Must be a raster format — X/Twitter and several other
# scrapers ignore SVG, which is why the project cover art is not used here.
OG_IMAGE = "assets/img/avatar.jpg"
OG_IMAGE_SIZE = (720, 720)

FRONT_MATTER = re.compile(r"^﻿?---\r?\n(.*?)\r?\n---\r?\n?(.*)$", re.S)


# ── Front matter ────────────────────────────────────────────────────────────

def parse_front_matter(raw: str) -> tuple:
    """Parse the `key: value` block. Mirrors parseFrontMatter() in
    assets/js/app.js, including `key: [a, b, c]` list values — keep the two
    in step."""
    m = FRONT_MATTER.match(raw)
    if not m:
        return {}, raw
    meta = {}
    for line in m.group(1).splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        key, sep, val = line.partition(":")
        if not sep:
            continue
        val = val.strip()
        if val.startswith("[") and val.endswith("]"):
            meta[key.strip()] = [
                v.strip().strip("\"'") for v in val[1:-1].split(",") if v.strip()
            ]
        else:
            meta[key.strip()] = val.strip("\"'")
    return meta, m.group(2)


def as_list(value) -> list:
    if isinstance(value, list):
        return value
    return [value] if value else []


def as_number(value, fallback):
    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


# ── Markdown ────────────────────────────────────────────────────────────────
# A deliberately small renderer covering exactly what the project files use:
# ## / ### headings, unordered lists, paragraphs, and inline **bold**, *italic*,
# `code`, and [links](url). Anything outside that subset is passed through as
# escaped text rather than silently mangled — see check_supported().

INLINE_CODE = re.compile(r"`([^`]+)`")
BOLD = re.compile(r"\*\*(.+?)\*\*", re.S)
ITALIC = re.compile(r"(?<![\*\w])\*(?!\s)(.+?)(?<!\s)\*(?!\*)", re.S)
LINK = re.compile(r"\[([^\]]+)\]\(([^)\s]+)\)")
HEADING = re.compile(r"^(#{1,6})\s+(.*)$")
BULLET = re.compile(r"^[-*]\s+(.*)$")


def inline(text: str) -> str:
    """Escape, then apply inline markup. Code spans are pulled out first so
    their contents are never treated as markup."""
    spans = []

    def stash(m):
        spans.append(html.escape(m.group(1)))
        return "\x00%d\x00" % (len(spans) - 1)

    text = INLINE_CODE.sub(stash, text)
    text = html.escape(text)
    # Both groups are already escaped — the whole string went through
    # html.escape above — so they are interpolated as-is.
    text = LINK.sub(
        lambda m: '<a href="%s"%s>%s</a>'
        % (
            m.group(2),
            ' target="_blank" rel="noopener noreferrer"'
            if m.group(2).startswith(("http://", "https://"))
            else "",
            m.group(1),
        ),
        text,
    )
    text = BOLD.sub(lambda m: "<strong>%s</strong>" % m.group(1), text)
    text = ITALIC.sub(lambda m: "<em>%s</em>" % m.group(1), text)
    return re.sub(r"\x00(\d+)\x00", lambda m: "<code>%s</code>" % spans[int(m.group(1))], text)


def slugify(text: str) -> str:
    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text).lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    return re.sub(r"^-+|-+$", "", re.sub(r"[\s_]+", "-", text))


def render_markdown(body: str, indent: str = "          ") -> tuple:
    """Return (html, headings) where headings is [(level, id, text), ...].

    Heading ids are de-duplicated, so two identically named sections in one
    document do not collide."""
    out, headings, seen = [], [], {}
    para, items = [], []

    def flush_para():
        if para:
            out.append("<p>%s</p>" % inline(" ".join(para).strip()))
            para.clear()

    def flush_list():
        if items:
            out.append(
                "<ul>\n%s\n</ul>"
                % "\n".join("  <li>%s</li>" % inline(i) for i in items)
            )
            items.clear()

    for line in body.splitlines():
        stripped = line.strip()

        if not stripped:
            flush_para()
            flush_list()
            continue

        h = HEADING.match(stripped)
        if h:
            flush_para()
            flush_list()
            level = len(h.group(1))
            text = inline(h.group(2).strip())
            base = slugify(text) or "section"
            seen[base] = seen.get(base, 0) + 1
            hid = base if seen[base] == 1 else "%s-%d" % (base, seen[base])
            headings.append((level, hid, text))
            out.append('<h%d id="%s">%s</h%d>' % (level, hid, text, level))
            continue

        b = BULLET.match(stripped)
        if b:
            flush_para()
            items.append(b.group(1).strip())
            continue

        flush_list()
        para.append(stripped)

    flush_para()
    flush_list()
    return "\n".join(indent + l for l in "\n".join(out).splitlines()), headings


UNSUPPORTED = (
    (re.compile(r"^\s*```"), "fenced code block"),
    (re.compile(r"^\s*\|.*\|\s*$"), "table"),
    (re.compile(r"^\s*\d+\.\s"), "ordered list"),
    (re.compile(r"^\s*>"), "blockquote"),
    (re.compile(r"^\s{2,}[-*]\s"), "nested list"),
    (re.compile(r"!\[[^\]]*\]\("), "inline image"),
)


def check_supported(path: pathlib.Path, body: str) -> list:
    """Warn loudly instead of quietly emitting wrong HTML."""
    found = []
    for line_no, line in enumerate(body.splitlines(), 1):
        for pattern, name in UNSUPPORTED:
            if pattern.search(line):
                found.append("%s:%d: %s is not supported by tools/build.py"
                             % (path.name, line_no, name))
    return found


# ── Page assembly ───────────────────────────────────────────────────────────

GITHUB_ICON = (
    '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">'
    '<path d="M12 .5C5.7.5.6 5.6.6 11.9c0 5 3.3 9.3 7.8 10.8.6.1.8-.2.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5'
    '-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.1.1 1.7 1.2 1.7 1.2 1 1.8 2.7 1.3 3.4 1 .1-.7.4-1.3.7-1.6'
    '-2.6-.3-5.3-1.3-5.3-5.8 0-1.3.5-2.3 1.2-3.2-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0'
    'c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.9 1.2 1.9 1.2 3.2 0 4.5-2.7 5.5-5.3 5.8.4.4.8 1.1.8 2.2'
    'v3.3c0 .4.2.7.8.6 4.6-1.5 7.8-5.8 7.8-10.8C23.4 5.6 18.3.5 12 .5z"/></svg>'
)


def esc(value) -> str:
    return html.escape(str(value or ""), quote=True)


def build_meta_chips(meta: dict) -> str:
    bits = []
    if meta.get("year"):
        bits.append('<span class="chip">%s</span>' % esc(meta["year"]))
    for tag in as_list(meta.get("tags")):
        bits.append('<span class="chip">%s</span>' % esc(tag))
    if meta.get("repo"):
        bits.append(
            '<a class="btn btn-ghost btn-sm" href="%s" target="_blank" '
            'rel="noopener noreferrer">%s Source</a>' % (esc(meta["repo"]), GITHUB_ICON)
        )
    return "".join(bits)


def build_toc(headings: list) -> str:
    top = [h for h in headings if h[0] in (2, 3)]
    if len(top) < 2:
        return ""
    rows = []
    for level, hid, text in top:
        style = ' style="padding-left:26px;font-size:.83rem"' if level == 3 else ""
        rows.append('            <li><a href="#%s"%s>%s</a></li>' % (hid, style, text))
    return (
        '        <aside class="toc" id="toc">\n'
        "          <h4>On this page</h4>\n"
        '          <ul id="tocList">\n%s\n          </ul>\n'
        "        </aside>" % "\n".join(rows)
    )


def build_nav(projects: list, index: int) -> str:
    links = []
    if index > 0:
        links.append(("Previous", projects[index - 1]))
    if index < len(projects) - 1:
        links.append(("Next", projects[index + 1]))
    if not links:
        return '      <nav class="detail-nav" id="detailNav" aria-label="More projects"></nav>'
    rows = "\n".join(
        '        <a href="../%s/"><div><span>%s</span>%s</div></a>'
        % (p["slug"], direction, esc(p["meta"].get("title") or p["slug"]))
        for direction, p in links
    )
    return (
        '      <nav class="detail-nav" id="detailNav" aria-label="More projects">\n'
        "%s\n      </nav>" % rows
    )


def build_hero(meta: dict, root: str) -> str:
    cover = meta.get("cover")
    if not cover:
        return ""
    src = cover if re.match(r"^(https?:)?//|^/", cover) else root + cover
    return (
        '      <div class="detail-hero" id="detailHero"><img src="%s" alt="" '
        "onerror=\"this.closest('.detail-hero').remove()\"></div>\n" % esc(src)
    )


# ── Main ────────────────────────────────────────────────────────────────────

def read_origin() -> str:
    cname = ROOT / "CNAME"
    host = cname.read_text(encoding="utf-8").strip() if cname.exists() else ""
    return "https://%s" % host if host else ""


def footer_domain(origin: str) -> str:
    """The bare domain shown in the footer copyright line: the last two
    labels of the host, so profile.dvstronics.in reads as dvstronics.in."""
    return ".".join(origin.split("//", 1)[-1].split(".")[-2:])


def sort_key(entry: dict):
    meta = entry["meta"]
    return (
        as_number(meta.get("order"), float("inf")),       # explicit order first
        -as_number(meta.get("year"), float("-inf")),      # then newest year
        str(meta.get("title") or entry["slug"]).lower(),  # then title
    )


def rel(path: pathlib.Path) -> str:
    """Repo-relative path, for readable log lines."""
    return path.relative_to(ROOT).as_posix()


def find_source(folder: pathlib.Path):
    """The markdown source inside a project directory. `index.md` if it is
    there, otherwise the single .md file in the folder. Two or more candidates
    with no index.md is ambiguous, so nothing is chosen."""
    preferred = folder / "index.md"
    if preferred.is_file():
        return preferred
    candidates = sorted(folder.glob("*.md"))
    return candidates[0] if len(candidates) == 1 else None


def write_if_changed(path: pathlib.Path, text: str) -> bool:
    old = path.read_text(encoding="utf-8") if path.exists() else None
    if old == text:
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    return True


def main() -> int:
    if not SRC.is_dir():
        print("error: %s does not exist" % SRC, file=sys.stderr)
        return 1
    if not TEMPLATE.exists():
        print("error: %s is missing" % TEMPLATE, file=sys.stderr)
        return 1

    origin = read_origin()
    if not origin:
        print("error: CNAME is empty — canonical URLs need an origin", file=sys.stderr)
        return 1

    profile_meta, _ = parse_front_matter(PROFILE.read_text(encoding="utf-8"))
    author = profile_meta.get("name") or "Profile"
    twitter = profile_meta.get("x") or ""
    twitter_handle = "@" + twitter.rstrip("/").split("/")[-1] if twitter else ""

    projects, warnings = [], []
    for folder in sorted(d for d in SRC.iterdir() if d.is_dir()):
        source = find_source(folder)
        if source is None:
            print("warning: %s has no markdown file — skipped" % rel(folder), file=sys.stderr)
            continue
        meta, body = parse_front_matter(source.read_text(encoding="utf-8"))
        warnings.extend(check_supported(source, body))
        projects.append({"slug": folder.name, "dir": folder, "meta": meta, "body": body})
    projects.sort(key=sort_key)

    if warnings:
        for w in warnings:
            print("warning: %s" % w, file=sys.stderr)

    changed = []

    # 1. The manifest the home page grid renders from. It carries everything a
    #    card needs, already in display order, so the grid costs one request
    #    and the browser never parses front matter or re-sorts.
    manifest = [
        {
            "slug": p["slug"],
            "title": p["meta"].get("title") or p["slug"],
            "summary": p["meta"].get("summary") or "",
            "cover": p["meta"].get("cover") or "",
            "tags": as_list(p["meta"].get("tags")),
            "year": p["meta"].get("year") or "",
        }
        for p in projects
    ]
    if write_if_changed(MANIFEST_OUT, json.dumps(manifest, indent=2) + "\n"):
        changed.append(rel(MANIFEST_OUT))

    # 2. Sitemap. Generated from the same list, so it cannot drift.
    urls = ["  <url><loc>%s/</loc><priority>1.0</priority></url>" % origin]
    urls += ["  <url><loc>%s/projects/%s/</loc></url>" % (origin, p["slug"]) for p in projects]
    sitemap = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        "<!-- Generated by tools/build.py — do not edit by hand. -->\n"
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        "%s\n</urlset>\n" % "\n".join(urls)
    )
    if write_if_changed(SITEMAP_OUT, sitemap):
        changed.append("sitemap.xml")

    # 3. One static page per project, written next to its own source.
    template = TEMPLATE.read_text(encoding="utf-8")
    root = "../../"          # projects/<slug>/ is two levels below the site root

    for i, project in enumerate(projects):
        meta, slug = project["meta"], project["slug"]
        body_html, headings = render_markdown(project["body"].strip())
        title = meta.get("title") or slug
        summary = meta.get("summary") or ""

        page = template
        for key, value in {
            "{{SLUG}}": slug,
            "{{ROOT}}": root,
            "{{TITLE}}": esc(title),
            "{{DESCRIPTION}}": esc(summary),
            "{{AUTHOR}}": esc(author),
            "{{TWITTER}}": esc(twitter_handle),
            "{{CANONICAL}}": "%s/projects/%s/" % (origin, slug),
            "{{OG_IMAGE}}": "%s/%s" % (origin, OG_IMAGE),
            "{{OG_IMAGE_W}}": str(OG_IMAGE_SIZE[0]),
            "{{OG_IMAGE_H}}": str(OG_IMAGE_SIZE[1]),
            "{{OG_IMAGE_ALT}}": esc("Portrait of %s" % author),
            "{{CONTACT_HEADING}}": esc(profile_meta.get("contact_heading") or "Get in touch."),
            "{{DOMAIN}}": esc(footer_domain(origin)),
            "{{META}}": build_meta_chips(meta),
            "{{HERO}}": build_hero(meta, root),
            "{{BODY}}": body_html,
            "{{TOC}}": build_toc(headings),
            "{{NAV}}": build_nav(projects, i),
        }.items():
            page = page.replace(key, value)

        left = re.findall(r"\{\{[A-Z_]+\}\}", page)
        if left:
            print("error: unreplaced placeholders in %s: %s" % (slug, ", ".join(sorted(set(left)))),
                  file=sys.stderr)
            return 1

        out = project["dir"] / "index.html"
        if write_if_changed(out, page):
            changed.append(rel(out))

    # 4. Drop generated pages whose source is gone. Only the generated file is
    #    removed, never the directory — anything else you keep beside a project
    #    (images, notes, a schematic) is yours and is left alone.
    live = {p["dir"] for p in projects}
    for folder in sorted(d for d in SRC.iterdir() if d.is_dir() and d not in live):
        orphan = folder / "index.html"
        if orphan.exists():
            orphan.unlink()
            changed.append("removed %s" % rel(orphan))

    print("%d project%s" % (len(projects), "" if len(projects) == 1 else "s"))
    if changed:
        for item in changed:
            print("  %s" % item)
    else:
        print("  everything already up to date")
    return 2 if warnings else 0


if __name__ == "__main__":
    sys.exit(main())
