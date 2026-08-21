/* ============================================================
   dvstronics.in — site logic
   Loads markdown from /content, renders it, no build step.
   ============================================================ */
(function () {
  'use strict';

  /* ── Markdown setup ──────────────────────────────────────
     `mangle` and `headerIds` were removed in marked v9; passing them to v12
     does nothing. Heading ids are assigned explicitly where they are needed
     (tools/build.py for project pages), so their absence is intended. */
  marked.setOptions({ gfm: true, breaks: false });

  /* ── Where the site root is, relative to this page ───────
     Pages under /p/<slug>/ declare data-root="../../"; the top-level pages
     leave it unset. Everything the site fetches or links to is built from
     this, so the site works at a domain root, in a subdirectory, and from a
     plain `python3 -m http.server` alike. */
  var ROOT = document.documentElement.getAttribute('data-root') || '';

  /* ── Tiny helpers ────────────────────────────────────── */
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fetchText(path) {
    var url = ROOT + path;
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(url + ' → ' + r.status);
      return r.text();
    });
  }

  function slugify(s) {
    return String(s).toLowerCase().trim()
      .replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, '');
  }

  /* ── Front-matter parser ─────────────────────────────────
     Supports:  key: value        key: [a, b, c]        key:
     Values are plain strings; no nesting, no anchors.        */
  function parseFrontMatter(raw) {
    var out = { meta: {}, body: raw };
    var m = /^﻿?---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
    if (!m) return out;
    out.body = m[2];
    m[1].split(/\r?\n/).forEach(function (line) {
      if (!line.trim() || /^\s*#/.test(line)) return;
      var i = line.indexOf(':');
      if (i < 0) return;
      var key = line.slice(0, i).trim();
      var val = line.slice(i + 1).trim();
      if (/^\[.*\]$/.test(val)) {
        val = val.slice(1, -1).split(',')
          .map(function (v) { return v.trim().replace(/^["']|["']$/g, ''); })
          .filter(Boolean);
      } else {
        val = val.replace(/^["']|["']$/g, '');
      }
      out.meta[key] = val;
    });
    return out;
  }

  /* ── Split a markdown body on "## " headings ─────────── */
  function splitSections(body, level) {
    var marker = level === 3 ? '###' : '##';
    var re = new RegExp('^' + marker + ' +(.+)$');
    var lines = body.split(/\r?\n/);
    var sections = [], cur = null, preamble = [];

    lines.forEach(function (line) {
      // Do not treat a deeper heading as a split point.
      var isDeeper = level === 3
        ? /^#{4,} /.test(line)
        : /^#{3,} /.test(line);
      var m = isDeeper ? null : re.exec(line);
      if (m) {
        cur = { title: m[1].trim(), lines: [] };
        sections.push(cur);
      } else if (cur) {
        cur.lines.push(line);
      } else {
        preamble.push(line);
      }
    });

    sections.forEach(function (s) { s.content = s.lines.join('\n').trim(); delete s.lines; });
    return { preamble: preamble.join('\n').trim(), sections: sections };
  }

  function findSection(sections, name) {
    var want = name.toLowerCase();
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].title.toLowerCase() === want) return sections[i];
    }
    return null;
  }

  /* ── Social icons ────────────────────────────────────── */
  var ICONS = {
    github:   '<path d="M12 .5C5.7.5.6 5.6.6 11.9c0 5 3.3 9.3 7.8 10.8.6.1.8-.2.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.1.1 1.7 1.2 1.7 1.2 1 1.8 2.7 1.3 3.4 1 .1-.7.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.8 0-1.3.5-2.3 1.2-3.2-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.9 1.2 1.9 1.2 3.2 0 4.5-2.7 5.5-5.3 5.8.4.4.8 1.1.8 2.2v3.3c0 .4.2.7.8.6 4.6-1.5 7.8-5.8 7.8-10.8C23.4 5.6 18.3.5 12 .5z"/>',
    linkedin: '<path d="M20.4 20.4h-3.6v-5.6c0-1.3 0-3-1.9-3s-2.1 1.5-2.1 2.9v5.7H9.3V9h3.4v1.6h.1c.5-.9 1.7-1.9 3.4-1.9 3.6 0 4.3 2.4 4.3 5.5v6.2zM5.3 7.4a2.1 2.1 0 1 1 0-4.2 2.1 2.1 0 0 1 0 4.2zm1.8 13H3.5V9h3.6v11.4zM22.2 0H1.8C.8 0 0 .8 0 1.7v20.6c0 .9.8 1.7 1.8 1.7h20.4c1 0 1.8-.8 1.8-1.7V1.7c0-.9-.8-1.7-1.8-1.7z"/>',
    x:        '<path d="M18.2 2.3h3.4l-7.4 8.4 8.7 11.5h-6.8l-5.3-7-6.1 7H1.3l7.9-9-8.3-11h7l4.8 6.4 5.5-6.3zm-1.2 17.9h1.9L7.1 4.2H5l12 16z"/>',
    reddit:   '<path d="M24 11.8a2.6 2.6 0 0 0-4.4-1.8 12.8 12.8 0 0 0-6.9-2.2l1.2-3.6 3.1.7a1.9 1.9 0 1 0 .2-1.1L13.6 3a.6.6 0 0 0-.7.4l-1.4 4.4a12.8 12.8 0 0 0-7 2.2 2.6 2.6 0 1 0-2.9 4.2 5 5 0 0 0 0 .8c0 4 4.7 7.3 10.4 7.3s10.4-3.3 10.4-7.3a5 5 0 0 0 0-.8 2.6 2.6 0 0 0 1.6-2.4zM6.4 13.6a1.9 1.9 0 1 1 3.7 0 1.9 1.9 0 0 1-3.7 0zm10.5 5a6.8 6.8 0 0 1-4.9 1.5 6.8 6.8 0 0 1-4.9-1.5.6.6 0 0 1 .8-.9 5.7 5.7 0 0 0 4.1 1.2 5.7 5.7 0 0 0 4.1-1.2.6.6 0 1 1 .8.9zm-.3-3.1a1.9 1.9 0 1 1 0-3.8 1.9 1.9 0 0 1 0 3.8z"/>',
    email:    '<path d="M2 4h20a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm10 8.1L3.9 6H20L12 12.1zM3 8v10h18V8l-8.4 6.3a1 1 0 0 1-1.2 0L3 8z"/>',
    resume:   '<path d="M6 2h8l6 6v14H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm7 1.5V9h5.5L13 3.5zM8 13h8v1.6H8V13zm0 3.4h8V18H8v-1.6zM8 9.6h3.5v1.6H8V9.6z"/>'
  };

  var SOCIAL_ORDER = [
    { key: 'github',   label: 'GitHub' },
    { key: 'linkedin', label: 'LinkedIn' },
    { key: 'x',        label: 'X (Twitter)',  alt: 'twitter' },
    { key: 'reddit',   label: 'Reddit' },
    { key: 'email',    label: 'Email',  mail: true },
    { key: 'resume',   label: 'Résumé' }
  ];

  function renderSocials(meta, el) {
    if (!el) return;
    var html = '';
    SOCIAL_ORDER.forEach(function (s) {
      var url = meta[s.key] || (s.alt ? meta[s.alt] : '');
      if (!url || !String(url).trim()) return;
      if (s.mail && !/^mailto:/i.test(url)) url = 'mailto:' + url;
      var ext = /^https?:/i.test(url) ? ' target="_blank" rel="noopener noreferrer"' : '';
      html += '<li><a href="' + esc(url) + '"' + ext + ' aria-label="' + esc(s.label) + '" title="' + esc(s.label) + '">' +
              '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[s.key] + '</svg></a></li>';
    });
    el.innerHTML = html;
  }

  /* ── Theme toggle ────────────────────────────────────── */
  function initTheme() {
    var btn = $('#themeToggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  }

  /* ── Sticky header shadow ────────────────────────────── */
  function initHeader() {
    var h = $('#siteHeader');
    if (!h) return;
    var onScroll = function () { h.classList.toggle('is-stuck', window.scrollY > 8); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ── Reveal on scroll ──────────────────────────────────
     Fail-safe by design: the hidden state only exists while
     html[data-anim="on"] is set, and a watchdog clears that
     attribute if anything goes wrong, so content can never be
     left permanently invisible. */
  var animOn = ('IntersectionObserver' in window) &&
               !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function revealAll() {
    document.documentElement.removeAttribute('data-anim');
    $$('.reveal').forEach(function (e) { e.classList.add('is-visible'); });
  }

  function initReveal(root) {
    if (!animOn) { revealAll(); return; }
    document.documentElement.setAttribute('data-anim', 'on');

    var els = $$('.reveal', root || document).filter(function (e) {
      return !e.classList.contains('is-visible') && !e.dataset.observed;
    });
    if (!els.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
      });
    }, { rootMargin: '120px 0px -6% 0px', threshold: 0 });

    els.forEach(function (e) { e.dataset.observed = '1'; io.observe(e); });

    // Watchdog: whatever happens, nothing stays hidden for long.
    clearTimeout(initReveal._t);
    initReveal._t = setTimeout(revealAll, 2600);
  }

  // Printing must never hide content.
  if (window.matchMedia) {
    var mq = window.matchMedia('print');
    if (mq.addEventListener) mq.addEventListener('change', function (e) { if (e.matches) revealAll(); });
  }
  window.addEventListener('beforeprint', revealAll);

  /* ── Fill simple [data-field] slots ──────────────────── */
  function fillFields(meta) {
    $$('[data-field]').forEach(function (el) {
      var v = meta[el.getAttribute('data-field')];
      if (v && !Array.isArray(v)) el.textContent = v;
      else if (!v) {
        // Hide the whole eyebrow/meta row if its only content is empty.
        if (el.classList.contains('eyebrow')) el.style.display = 'none';
      }
    });
  }

  function initials(name) {
    return String(name || '').trim().split(/\s+/).slice(0, 2)
      .map(function (w) { return w[0]; }).join('').toUpperCase();
  }

  /* ── Avatar with graceful fallback ───────────────────── */
  function initAvatar(meta) {
    var img = $('#avatar'), fb = $('#avatarFallback');
    if (!img || !fb) return;
    fb.textContent = initials(meta.name) || 'SD';
    if (!meta.avatar) { img.hidden = true; return; }
    img.alt = meta.name ? 'Portrait of ' + meta.name : '';
    img.onerror = function () { img.hidden = true; };
    img.onload = function () { fb.style.display = 'none'; };
    img.src = meta.avatar;
  }

  /* ── Skills ──────────────────────────────────────────── */
  function renderSkills(section) {
    var host = $('#skillGroups');
    if (!host) return;
    if (!section) { var s = $('#skills'); if (s) s.hidden = true; return; }

    var groups = splitSections(section.content, 3).sections;
    if (!groups.length) {
      host.outerHTML = '<div class="prose">' + marked.parse(section.content) + '</div>';
      return;
    }

    host.innerHTML = groups.map(function (g) {
      var chips = g.content
        .split(/\n+/).join(' ')
        .split(/\s+[·•|]\s+|\s*,\s*/)
        .map(function (t) { return t.trim().replace(/^[-*]\s*/, ''); })
        .filter(Boolean);

      // "### Hardware — self-taught" renders the part after the em dash
      // as a small qualifier line beneath the group name.
      var parts = g.title.split(/\s+[—–]\s+/);
      var head = '<h3>' + esc(parts[0]) +
        (parts[1] ? '<span class="skill-note">' + esc(parts.slice(1).join(' — ')) + '</span>' : '') +
        '</h3>';

      return '<div class="skill-group reveal">' + head + '<div class="skill-chips">' +
        chips.map(function (c) { return '<span class="chip">' + esc(c) + '</span>'; }).join('') +
        '</div></div>';
    }).join('');
  }

  /* ── Experience timeline ─────────────────────────────── */
  function renderExperience(section) {
    var host = $('#experience');
    if (!host) return;
    if (!section) { var side = $('.about-side'); if (side) side.hidden = true; return; }

    var items = splitSections(section.content, 3).sections;
    if (!items.length) { host.innerHTML = '<div class="prose">' + marked.parse(section.content) + '</div>'; return; }

    host.innerHTML = items.map(function (it) {
      return '<div class="tl-item reveal"><h4>' + esc(it.title) + '</h4><p>' +
             esc(it.content.replace(/\s*\n\s*/g, ' ')) + '</p></div>';
    }).join('');
  }

  /* ── Contact block ───────────────────────────────────── */
  function renderContact(meta, sections) {
    var head = $('#contactHeading');
    if (head && meta.contact_heading) head.textContent = meta.contact_heading;
    var body = $('#contactBody');
    if (!body) return;
    var sec = sections && findSection(sections, 'Contact');
    if (sec) body.innerHTML = marked.parse(sec.content);
  }

  /* ── Any additional "## Section" becomes its own block ── */
  function renderExtraSections(sections) {
    var host = $('#extraSections');
    if (!host) return;
    var known = ['about', 'skills', 'experience', 'contact'];
    var extras = sections.filter(function (s) { return known.indexOf(s.title.toLowerCase()) === -1; });
    host.innerHTML = extras.map(function (s) {
      return '<section class="section" id="' + esc(slugify(s.title)) + '"><div class="wrap">' +
             '<h2 class="section-title"><span class="rule"></span>' + esc(s.title) + '</h2>' +
             '<div class="prose reveal">' + marked.parse(s.content) + '</div></div></section>';
    }).join('');
  }

  /* ── Project cards ───────────────────────────────────── */
  var ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>';

  function projectCard(p) {
    var tags = Array.isArray(p.tags) ? p.tags : (p.tags ? [p.tags] : []);
    var media = p.cover
      ? '<div class="card-media"><img src="' + esc(ROOT + p.cover) + '" alt="" loading="lazy" ' +
        'onerror="this.closest(\'.card-media\').remove()"></div>'
      : '';
    return '<a class="card reveal" href="' + esc(ROOT + 'p/' + p.slug + '/') + '">' + media +
      '<div class="card-body">' +
        (p.year ? '<div class="card-year">' + esc(p.year) + '</div>' : '') +
        '<h3 class="card-title">' + esc(p.title || p.slug) + '</h3>' +
        '<p class="card-summary">' + esc(p.summary || '') + '</p>' +
        (tags.length ? '<div class="card-tags">' + tags.map(function (t) {
          return '<span class="chip">' + esc(t) + '</span>'; }).join('') + '</div>' : '') +
        '<span class="card-cta">Read more ' + ARROW + '</span>' +
      '</div></a>';
  }

  /* ── The project manifest ──────────────────────────────
     content/projects.json holds everything the grid needs — slug, title,
     summary, cover, tags, year — already in display order. One request, no
     per-file parsing, no sorting here: tools/build.py writes it from the
     markdown, and the GitHub Action runs that on every push. Adding a
     project means adding one .md file and running the build (or pushing
     and letting the Action do it).                                       */
  function loadProjects() {
    var grid = $('#projectGrid');
    if (!grid) return;

    fetchText('content/projects.json')
      .then(function (t) {
        var list = JSON.parse(t);
        if (!Array.isArray(list)) throw new Error('projects.json is not an array');
        list = list.filter(function (p) {
          return p && typeof p.slug === 'string' && /^[a-z0-9._-]+$/i.test(p.slug);
        });
        grid.innerHTML = list.length
          ? list.map(projectCard).join('')
          : '<p class="loading">No projects yet.</p>';
        initReveal(grid);
      })
      .catch(function (err) {
        grid.innerHTML = '<div class="notice"><strong>Projects could not be loaded.</strong><br>' +
          'If you opened this file directly from disk, run <code>python3 -m http.server</code> ' +
          'in the site folder and visit <code>http://localhost:8000</code> instead — ' +
          'browsers block file reads from <code>file://</code> pages.</div>';
        console.error(err);
      });
  }

  /* ── Home page ───────────────────────────────────────── */
  function initHome() {
    var y = $('#year'); if (y) y.textContent = new Date().getFullYear();

    fetchText('content/profile.md').then(function (raw) {
      var fm = parseFrontMatter(raw);
      var meta = fm.meta;

      document.title = (meta.name || 'Profile') + (meta.role ? ' — ' + meta.role : '');
      fillFields(meta);
      initAvatar(meta);
      renderSocials(meta, $('#socials'));
      renderSocials(meta, $('#socialsFooter'));

      var parsed = splitSections(fm.body, 2);
      var sections = parsed.sections;

      var about = findSection(sections, 'About');
      var aboutBody = $('#aboutBody');
      if (aboutBody) aboutBody.innerHTML = marked.parse(about ? about.content : parsed.preamble);

      renderSkills(findSection(sections, 'Skills'));
      renderExperience(findSection(sections, 'Experience'));
      renderContact(meta, sections);
      renderExtraSections(sections);

      initReveal();
    }).catch(function (err) {
      console.error(err);
      var aboutBody = $('#aboutBody');
      if (aboutBody) {
        aboutBody.innerHTML = '<div class="notice"><strong>Profile content could not be loaded.</strong><br>' +
          'If you opened this file directly from disk, run <code>python3 -m http.server</code> in the ' +
          'site folder and open <code>http://localhost:8000</code> instead.</div>';
      }
    });

    loadProjects();
    initReveal();
  }

  /* ── Project page ────────────────────────────────────────
     Pages under /p/<slug>/ are generated by tools/build.py and arrive
     complete: title, summary, meta chips, article body, table of contents
     and prev/next are all in the HTML. That is what lets a crawler — or a
     reader with JavaScript off — see the actual project. Everything below
     is enhancement on top of a page that already works.                 */
  function initProjectPage() {
    var y = $('#year'); if (y) y.textContent = new Date().getFullYear();

    // The footer block is hydrated from profile.md so that editing the
    // profile does not mean regenerating every project page.
    fetchText('content/profile.md').then(function (raw) {
      var fm = parseFrontMatter(raw), meta = fm.meta;
      fillFields(meta);
      renderSocials(meta, $('#socialsFooter'));
      renderContact(meta, splitSections(fm.body, 2).sections);
    }).catch(function () {});   // header/footer already have static text

    // Highlight the current section in the table of contents.
    var links = $$('#tocList a');
    if (links.length && 'IntersectionObserver' in window) {
      var heads = links.map(function (a) {
        return document.getElementById(a.getAttribute('href').slice(1));
      }).filter(Boolean);
      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          links.forEach(function (a) {
            a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id);
          });
        });
      }, { rootMargin: '-80px 0px -70% 0px' });
      heads.forEach(function (h) { spy.observe(h); });
    }

    initReveal();
  }

  /* ── Boot ────────────────────────────────────────────── */
  initTheme();
  initHeader();
  if (document.documentElement.hasAttribute('data-project')) initProjectPage();
  else initHome();
})();
