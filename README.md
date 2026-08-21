# dvstronics.in — web profile

A static profile site. No framework, no dependencies to install, nothing running
on the server. All content lives in markdown files under `content/`.

The home page renders itself in the browser from `content/profile.md`. Project
pages are **generated ahead of time** by `tools/build.py` into `p/<slug>/`, so
each one serves its own title, description, canonical link and article text to a
crawler or a reader with JavaScript switched off.

---

## Updating the site

### Edit your profile

Open `content/profile.md`. The block at the top between `---` lines controls the
hero and the links. Lines starting with `#` are comments and are ignored; a
field left blank simply does not render (an empty `available:` hides the small
badge above your name, an empty `email:` drops the mail icon):

```yaml
---
name: Sridhar D V
role: Embedded Systems & IoT Engineer
tagline: One or two sentences that sit under your name.
location: Coimbatore, Tamil Nadu, India
available: Open to interesting embedded & IoT problems
avatar: assets/img/avatar.jpg
contact_heading: Let's build in the open.
github: https://github.com/SRIDHARDV
linkedin: https://www.linkedin.com/in/sridhardv/
x: https://x.com/SRIDHARDV
reddit: https://www.reddit.com/user/dvs-circuit
email: you@example.com
resume: assets/Sridhar-DV-Resume.pdf
---
```

Leave a field blank (`email:`) and it simply does not appear — no broken icon,
no empty row.

Below that block, each `## Heading` is a section of the page:

| Section         | How it renders                                              |
|-----------------|-------------------------------------------------------------|
| `## About`      | Prose in the About block                                     |
| `## Skills`     | Each `### Group` becomes a card; items separated by `·` or `,` become chips |
| `## Experience` | Each `### Title` becomes an entry on the timeline            |
| `## Contact`    | The closing block on every page; its headline comes from the `contact_heading:` field above |
| anything else   | A new full-width section, added to the page automatically    |

So adding `## Publications` or `## Certifications` to `profile.md` creates that
section on the site. Nothing else to change.

### Add a project

Create `content/projects/my-project.md`, commit, push. The GitHub Action builds
the page for it. To see it locally first, run `python3 tools/build.py`.

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

Opening paragraph.

## A topic

Body text, **bold**, *italic*, `code`, [links](https://example.com), and
`-` bullet lists.
```

There is no list to update — the build script finds the file on its own. Every
`##` heading in the body becomes an entry in the "On this page" sidebar, with a
numbered suffix if two headings share a name.

**Supported markdown** is the subset above: `##`/`###` headings, paragraphs,
`-` bullets, `**bold**`, `*italic*`, `` `code` `` and `[links](url)`. Ordered
lists, tables, fenced code blocks, blockquotes, nested lists and inline images
are **not** rendered. The build script reports the file and line and exits
non-zero if it finds any, so unsupported syntax fails the build instead of
shipping as wrong HTML — it never silently mangles your text.

**Ordering** comes from the project files themselves:

1. `order:` ascending, when present
2. then `year:`, newest first
3. then title

The six existing projects carry `order: 1` to `6`, so they hold their current
positions. A new project with no `order:` sorts after them by year; give it an
`order:` number to slot it in, or `order: 0` to put it first. Renumbering means
editing the projects you want to move — nothing else.

### What the build generates

`tools/build.py` reads `CNAME`, `content/profile.md` and `content/projects/*.md`
and writes three things. None of them are edited by hand:

| Output | What it is |
|---|---|
| `content/projects.json` | The manifest the home page grid renders from — title, summary, cover, tags and year for each project, already in display order. One request, no sorting in the browser. |
| `sitemap.xml` | One entry per project. Generated from the same list as everything else, so it cannot drift out of step. |
| `p/<slug>/index.html` | A complete static page per project. |

The GitHub Action in `.github/workflows/projects-index.yml` runs the script on
every push that touches `content/`, `tools/` or `CNAME`, and commits the result.
So pushing a new `.md` file is enough. Running `python3 tools/build.py` yourself
does exactly the same thing, and is what you want before a local preview.

Delete a project's `.md` file and the next build deletes its page too.

#### Why project pages are generated rather than rendered in the browser

They used to live at `project.html?p=<slug>`. On a static host every one of
those URLs returns the *same* file, so all six projects shared one title, one
description and no canonical link — a crawler that does not run JavaScript saw
six identical pages. Static pages at `p/<slug>/` are the only way to fix that
without a server.

`project.html` is still there as a redirect to the new URL, marked `noindex`,
so old links and bookmarks keep working.

### Add images

Drop files into `assets/img/` and reference them by path:

- Project card cover → the `cover:` field in the project's front matter
- Inside a project write-up → `![alt text](assets/img/projects/photo.jpg)`
- Your portrait → `assets/img/avatar.jpg` (square; ~720×720 is plenty)

Two portraits ship with the site. `avatar.jpg` is the workbench photograph and
is what `avatar:` points at. `avatar.svg` is a drawn illustration of the same
scene, in the site's palette — point `avatar:` at it instead if you ever want
the site to carry no photograph of you. If the file at `avatar:` is missing,
the frame falls back to an "SD" monogram rather than breaking.

If an image is missing the site degrades gracefully — no broken-image icons.

**Card covers look best at 1600×900** (16:9). Anything wider or taller still
works — the card crops to fill — but a 16:9 source means you control what gets
cropped instead of the browser deciding.

## Does the live site need Python? No.

Worth being explicit, because Python appears twice below and neither use is
part of the running site.

**GitHub Pages serves HTML, CSS, JavaScript, markdown, and images. Nothing
else runs.** Pages cannot execute Python (or Ruby, or Node) — it is a plain
file host, and this site does not ask it to be anything more. Every part of
the site works inside the visitor's browser: `app.js` fetches the markdown
files and renders them. There is no server-side code.

The two Python references:

| Command | What it is for | Do you run it? |
|---|---|---|
| `python3 -m http.server` | Previewing locally before you push | Only if you want a preview |
| `tools/build.py` | Generating the project pages, manifest and sitemap | Optional — a GitHub Action runs it on push |

`build.py` runs **on GitHub's servers** inside an Action, not on Pages. Its
output — `p/`, `content/projects.json`, `sitemap.xml` — is committed to the
repo as ordinary static files, which is all Pages ever serves. It uses only the
Python standard library; there is nothing to `pip install`.

## Previewing locally

Browsers refuse to read local files from a page opened with `file://`, so open
the folder over a local web server instead:

```bash
cd path/to/this/folder
python3 -m http.server 8000
```

Then visit <http://localhost:8000>. If you have added or edited a project, run
`python3 tools/build.py` first so its page exists. Any Python 3 install has both
built in — no packages to install. If you would rather not use Python, `npx serve` or the VS
Code "Live Server" extension do the same job. This step is purely a convenience;
skipping it and pushing straight to GitHub works fine.

---

## Deploying to GitHub Pages

Target: repository **`sridhardv.github.io`** on the account **`SRIDHARDV`**,
which serves the site from the root of `https://sridhardv.github.io/`.

> ### The repository must be public
>
> **GitHub Pages does not publish from a private repository on the Free plan.**
> From GitHub's own documentation: *"GitHub Pages is available in public
> repositories with GitHub Free and GitHub Free for organizations, and in public
> and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise
> Cloud, and GitHub Enterprise Server."*
>
> So either make the repository **public**, or hold a **GitHub Pro** plan. There
> is nothing private in this repo — every file is served to visitors anyway — so
> public is the normal choice for a profile site. If you leave it private on the
> Free plan, Settings → Pages will simply refuse to publish.
>
> Note also that the repo name must match your username for the root-domain
> behaviour. `sridhardv.github.io` works because your account is `SRIDHARDV`
> (the match is case-insensitive). A repo of that name under any other account
> would just be an ordinary project site.

### 1. Create the repository on github.com

New repository → Owner **SRIDHARDV**, name **`sridhardv.github.io`**,
visibility **Public**. Do not add a README, .gitignore, or licence — this folder
already has its own history and an extra initial commit would need merging.

### 2. Push this folder

The distributed folder carries no git history, so start one:

```bash
cd path/to/this/folder

git init -b main
git add .
git commit -m "Initial profile site"
git remote add origin https://github.com/SRIDHARDV/sridhardv.github.io.git
git push -u origin main
```

That is the whole thing. `git init -b main` names the branch `main` from the
start; on an older git that does not accept `-b`, use `git init` followed by
`git branch -M main`.

If `git remote add` says `origin` already exists, point it at the new repo:

```bash
git remote set-url origin https://github.com/SRIDHARDV/sridhardv.github.io.git
```

**Credentials.** GitHub no longer accepts account passwords over HTTPS. When the
first push prompts you, give a **personal access token** as the password —
github.com → Settings → Developer settings → Personal access tokens →
Fine-grained tokens, with *Contents: read and write* on this repository. Or use
SSH instead, if you already have a key on the account:

```bash
git remote set-url origin git@github.com:SRIDHARDV/sridhardv.github.io.git
```

### 3. Turn on Pages

Repository → **Settings** → **Pages** → *Build and deployment* →
**Source: Deploy from a branch** → Branch `main`, folder `/ (root)` → **Save**.

A minute later the site is live at `https://sridhardv.github.io/`.

> **One wrinkle if you want to look at it before setting up DNS.** This repo
> ships a `CNAME` file, so Pages immediately claims `profile.dvstronics.in` as
> the custom domain and *redirects* `sridhardv.github.io` there — which will not
> resolve until the DNS record below exists. Either add the DNS record first, or
> delete `CNAME`, push, look at the github.io URL, then restore it. Nothing is
> broken; the redirect is just ahead of the DNS.

### 4. Publishing an update

```bash
git add .
git commit -m "Add project X"
git push
```

Live in roughly a minute. That's the whole update loop — edit a markdown file,
commit, push.

---

## Pointing `profile.dvstronics.in` at it

The repo already contains a `CNAME` file holding `profile.dvstronics.in`, and
`robots.txt`, `sitemap.xml`, and the canonical/Open Graph tags in `index.html`
all point there. So there are only two things left to do.

### 1. Add the DNS record

At whichever provider manages `dvstronics.in`:

| Type  | Name      | Value                  | TTL    |
|-------|-----------|------------------------|--------|
| CNAME | `profile` | `sridhardv.github.io.` | 1 hour |

The value is your **account** host, `sridhardv.github.io` — never the repository
name and never the full path. It stays the same whatever the repo is called.

Some control panels want the fully-qualified `profile.dvstronics.in` in the Name
field instead of just `profile` — follow whichever convention the rest of your
records use. The trailing dot on the value is correct; some panels add it for
you, some strip it, and either behaviour is fine.

This does not touch `blog.dvstronics.in`, so your Google Site keeps serving
until you decide to retire it. That is the nice part about a new subdomain —
you can run both side by side and switch when you are satisfied.

### 2. Confirm it in the repo

**Settings → Pages → Custom domain** should already show
`profile.dvstronics.in`, picked up from the `CNAME` file. If it is empty, type
it in and **Save**.

Wait for the DNS check to go green, then tick **Enforce HTTPS**.

### If something looks wrong

- Propagation is usually minutes, occasionally a few hours. `dig profile.dvstronics.in`
  (or `nslookup`) tells you whether the record has landed.
- **Enforce HTTPS** stays greyed out until GitHub can see the DNS record and has
  issued a certificate. Check back later rather than re-entering the domain —
  re-saving restarts the process.
- If Pages reports the domain is already taken, it is usually a leftover `CNAME`
  or `A` record on the same name at your DNS provider.

### Later, if you want the apex `dvstronics.in` too

An apex domain cannot use a CNAME, so it needs A records instead:

```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

Plus, optionally, AAAA records for IPv6:

```
2606:50c0:8000::153
2606:50c0:8001::153
2606:50c0:8002::153
2606:50c0:8003::153
```

> Verified against GitHub's documentation on 20 August 2026. Re-check
> <https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site>
> before pasting — these change rarely, but they do change.

---

## Files

```
index.html                 Home page — renders content/profile.md in the browser
project.html               Redirect from the old ?p=<slug> URLs; noindex
content/
  profile.md               Your profile — hero, about, skills, experience
  projects/*.md            One file per project — the source of truth
  projects.json            GENERATED manifest for the home grid; never edit
p/<slug>/index.html        GENERATED static page per project; never edit
sitemap.xml                GENERATED from the project list; never edit
.github/workflows/         Action that runs tools/build.py on push
assets/
  css/style.css            All styling. Colours are the variables at the top.
  js/app.js                Renders the home page; hydrates the project footer
  js/marked.min.js         Markdown parser (vendored, MIT — no CDN, no npm)
  img/                     Images, including generated project covers
tools/build.py             Generates the three files marked GENERATED above
tools/project-template.html  The shell those project pages are stamped into
CNAME                      The custom domain, and the origin for canonical URLs
robots.txt                 Search engine hints
.nojekyll                  Tells GitHub Pages to serve files as-is
```

### Changing the colours

Everything comes from custom properties at the top of `assets/css/style.css` —
one block for dark, one for light.

- `--accent` is the primary blue. Change it and the whole site follows: buttons,
  links, headings, timeline dots, focus rings.
- `--accent-2` is the warm red, deliberately rationed so it stays an accent
  rather than a second theme. It appears in the brand mark gradient, the small
  rule beside each section title, the hero glow, inline `code`, and blockquote
  bars.

Every colour pairing in both themes is checked for WCAG AA (worst case 4.79:1
in dark, 4.82:1 in light). If you swap either accent, verify it stays at 4.5:1
or better against `--bg`, `--bg-alt`, and `--surface-2` — light mode is where
the margin is thinnest.

One thing the variables do not reach: the project cover art in
`assets/img/projects/*.svg` and the illustrated portrait `assets/img/avatar.svg`
have the palette baked into them as literal hex values (`#5b9dff` blue,
`#ff7a70` red, `#080b12` background). After a colour change, either
find-and-replace those values in the SVGs or leave them — they are decorative,
and a slight mismatch reads as intentional more often than not.

---

## A note on search engines

Project pages are generated, so the raw HTML at `p/<slug>/` already contains the
full article, a unique `<title>`, a unique description, and a canonical link.
Crawlers and link-preview bots that do not run JavaScript see the real page.

The home page is still rendered in the browser from `content/profile.md`, so its
About and Skills text is not in the raw HTML. Its `<title>`, description and
Open Graph tags are static, so link previews and the search result snippet are
correct, and Google renders JavaScript for the rest. That trade is deliberate:
the home page is one URL, and keeping it live-rendered is what lets you edit
`profile.md` without regenerating anything.

Open Graph images are `assets/img/avatar.jpg` — a raster file, because X and
several other scrapers ignore SVG, and declared as a `summary` card because it
is square. `summary_large_image` expects roughly 1.91:1 and would crop it.
