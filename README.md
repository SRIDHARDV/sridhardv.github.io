# dvstronics.in — web profile

Static profile site at <https://profile.dvstronics.in>. No framework, no
dependencies to install, nothing running on the server.

Content is markdown. The home page renders `content/profile.md` in the browser.
Each project is a directory holding its source and its generated page:

```
projects/<slug>/index.md      you write this
projects/<slug>/index.html    generated — served at /projects/<slug>/
```

---

## Add a project

**1. Create `projects/my-project/index.md`:**

```markdown
---
title: My Project
summary: One sentence for the card on the home page.
cover: assets/img/projects/my-project.jpg
tags: [Hardware, Firmware]
year: 2026
order: 2
repo: https://github.com/SRIDHARDV/my-project
---

Opening paragraph, no heading — this sits under the title.

## A topic

Body text with **bold**, *italic*, `code` and [links](https://example.com).

- A bullet
- Another bullet

## Another topic

More body text.
```

Every field except `title` is optional. `repo:` left empty hides the Source
button; `cover:` left empty drops the card image.

**2. Build:**

```bash
python3 tools/build.py
```

**3. Commit and push.** The GitHub Action runs the same script and commits
whatever you missed, so pushing without step 2 also works — step 2 is what lets
you see the page locally first.

That is the whole process. Nothing else needs editing: not the sitemap, not a
project list, not the home page.

---

## Supported markdown

The generator handles exactly this:

| Works | Syntax |
|---|---|
| Headings | `## Section`, `### Subsection` |
| Paragraphs | blank-line separated |
| Bullet lists | `- item` |
| Bold / italic | `**bold**`, `*italic*` |
| Inline code | `` `code` `` |
| Links | `[text](https://example.com)` |

**Not supported:** tables, fenced code blocks, ordered lists, blockquotes,
nested lists, inline images.

Using one of those is not silently mangled — the build prints the file and line
and exits non-zero, so it fails instead of shipping wrong HTML.

Every `##` and `###` becomes an entry in the "On this page" sidebar, with a
numbered suffix if two headings share a name.

---

## Ordering

Taken from the project files themselves:

1. `order:` ascending, when present
2. then `year:`, newest first
3. then title

The six existing projects carry `order: 1` to `6`. A new project with no
`order:` sorts after them by year; give it a number to slot it in, or `order: 0`
to put it first.

---

## Images

Drop files into `assets/img/` and reference them by path from the site root:

- **Card cover** → the `cover:` field, e.g. `assets/img/projects/my-project.jpg`.
  Looks best at 1600×900; anything else still works, the card crops to fill.
- **Portrait** → `assets/img/avatar.jpg`, square, ~720×720. `avatar.svg` is a
  drawn alternative in the site palette if you ever want no photograph.

A missing image degrades gracefully — no broken-image icons, and the portrait
falls back to an "SD" monogram.

Images cannot go inside a project write-up; inline images are not supported.

---

## Editing your profile

`content/profile.md` — the front matter drives the hero, socials and contact
heading; the `## About`, `## Skills`, `## Experience` and `## Contact` sections
drive the rest. It renders live in the browser, so **no rebuild is needed** after
editing it.

Leave a social field empty and its icon disappears. Any extra `## Section` you
add becomes its own block on the page.

---

## Previewing locally

Browsers refuse to read local files from `file://`, so serve the folder:

```bash
python3 tools/build.py        # if you added or edited a project
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

---

## Removing a project

Delete `projects/<slug>/index.md` and run the build. The generated `index.html`
goes with it. Anything else you keep in that directory is left alone.

---

## What the build generates

`tools/build.py` reads `CNAME`, `content/profile.md` and `projects/*/index.md`,
and writes three things. None are edited by hand:

| Output | What it is |
|---|---|
| `projects/<slug>/index.html` | The static page for one project |
| `projects/manifest.json` | Card data for the home page grid, in display order |
| `sitemap.xml` | One entry per project |

It uses only the Python standard library — nothing to `pip install`. It runs on
your machine or inside the Action, never on GitHub Pages, which serves static
files and nothing else.

### Why pages are generated instead of rendered in the browser

Project pages used to live at `project.html?p=<slug>`. On a static host every one
of those URLs returns the *same* file, so all six projects shared one `<title>`,
one description and no canonical link — a crawler that does not run JavaScript
saw six identical pages. Generating a real page per directory is the only way to
fix that without a server.

`project.html` remains as a `noindex` redirect so old links keep working.

---

## Files

```
index.html                 Home page — renders content/profile.md in the browser
project.html               Redirect from the old ?p=<slug> URLs; noindex
content/profile.md         Your profile — hero, about, skills, experience
projects/<slug>/index.md   One directory per project — the source of truth
projects/<slug>/index.html GENERATED page; never edit
projects/manifest.json     GENERATED card data; never edit
sitemap.xml                GENERATED; never edit
tools/build.py             Generates the three files marked GENERATED
tools/project-template.html  The shell project pages are stamped into
.github/workflows/         Action that runs tools/build.py on push
assets/css/style.css       All styling. Colours are the variables at the top.
assets/js/app.js           Renders the home page; hydrates the project footer
assets/js/marked.min.js    Markdown parser (vendored, MIT — no CDN, no npm)
assets/img/                Images
CNAME                      Custom domain, and the origin for canonical URLs
robots.txt                 Search engine hints
.nojekyll                  Tells GitHub Pages to serve files as-is
```

---

## Changing the colours

Both themes are CSS custom properties at the top of `assets/css/style.css`,
under `[data-theme="dark"]` and `[data-theme="light"]`. `--accent` is the blue
used for links, buttons and highlights; change that one and the whole site
follows.

---

## A note on search engines

Project pages are generated, so the raw HTML at `/projects/<slug>/` already
contains the full article, a unique `<title>`, a unique description and a
canonical link. Crawlers and link-preview bots that do not run JavaScript see
the real page.

The home page is still rendered in the browser, so its About and Skills text is
not in the raw HTML. Its `<title>`, description and Open Graph tags are static,
so previews and search snippets are correct, and Google renders JavaScript for
the rest. That trade is deliberate: keeping the home page live-rendered is what
lets you edit `profile.md` without regenerating anything.

Open Graph images point at `assets/img/avatar.jpg` — a raster file, because X
and several other scrapers ignore SVG — and are declared as a `summary` card
because it is square.
