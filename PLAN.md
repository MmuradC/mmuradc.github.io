# Website Remake Plan — Multi-page, Animated-background Portfolio

Goal: replace the single `index.html` with a 4-route site based on the
hand-drawn wireframes. Keep the existing architecture philosophy:
INFO.md is the single source of truth → build script → data.js → DOM render.

## Target routes

| Route | Page | Background (animated, canvas/CSS) | Content |
|---|---|---|---|
| `/` | index.html | Rain falling on dark water + click ripples | "welcome" hero + router nav (about me / game / code) |
| `/about-me.html` | about me | Cozy-room tone, coffee cup + rising steam | Photo/tile left, markdown-rendered description right |
| `/game.html` | resume (games+research) | Subtle ping-pong ball bouncing behind cards | Scrollable card grid: screenshot + name + desc, groups "game" and "research" |
| `/code.html` | code | Fake linux terminal, typed commands looping | Resume rows (icon + name), click a row → scrollable desc panel |

## File hierarchy (proposed)

```
mmuradc.github.io/
├── index.html                 # `/` — can be built later from template
├── about-me.html
├── game.html
├── code.html
├── INFO.md                    # EXTENDED: + resume, + research, + links (source of truth)
├── build-data.py              # EXTENDED: parse new sections -> data.js (script tag, file://-safe)
├── projects.js                # generated (kept temporarily for compat)
├── data.js                    # generated: window.SITE_DATA (profile, about_md, projects, research, resume, links)
├── blocks.js                  # RETIRED (tetrominoes replaced per-page backgrounds)
├── assets/
│   ├── css/
│   │   ├── base.css           # :root tokens, reset, nav, shared components
│   │   ├── main.css           # `/` page styles
│   │   ├── about.css
│   │   ├── game.css           # + ping-pong animation styles
│   │   └── code.css           # terminal styling
│   ├── js/
│   │   ├── data.js → (generated, stays at root)
│   │   ├── router.js          # nav stack + active-section handling
│   │   ├── sfx.js             # procedural WebAudio SFX (no audio files) + [SND] nav mute + 'M' shortcut
│   │   ├── bg-water.js        # `/`: rain + ripples (pointer events)
│   │   ├── bg-coffee.js       # about: steam particles
│   │   ├── bg-pong.js         # game: 2-AI paddle bounce loop
│   │   ├── bg-terminal.js     # code: typing loop of real-ish linux commands
│   │   ├── render-game.js     # card grid renderer (screenshots lazy-load)
│   │   ├── render-code.js     # resume rows + desc panel
│   │   └── md.js              # tiny markdown -> HTML (~headings, bold, links, lists only)
│   └── img/
│       ├── ...existing project previews (moved from _assets/)
│       └── coffee/, misc art for about page
└── _assets/                   # kept for old links; 301 via GitHub Pages not needed (flat repo)
```

## Data model (INFO.md additions)

```
# Profile            (exists)
# About              NEW — long markdown bio rendered on /about-me
# Projects  (game)   exists: Name/Thumbnail/Description/Technologies
# Research           NEW — same schema as Projects
# Resume             NEW — list of entries: Role / Org / Period / Desc / Icon
# Links              NEW — email, github, linkedin
```

build-data.py compiles everything into data.js; no fetch() anywhere
(works from file:// — keep that constraint).

## Shared components

- One canvas per page (`#bgCanvas`), one IIFE script each, requestAnimationFrame,
  `prefers-reduced-motion` respected, capped device-pixel-ratio = 2.
- Same header/nav bar markup across all 4 pages, current page highlighted.
- Cards/rows styled from base.css tokens so pages stay visually coherent.

## Build order (milestones)

1. **Skeleton + shared assets** — base.css, router.js/nav, extend INFO.md
   schema, extend build-data.py → data.js. Pages static-structure first.
2. **`/` main** — water rain + click-ripple canvas; nav stack.
3. **`/about-me`** — coffee/steam tile, md.js, markdown desc from INFO.md.
4. **`/game`** — card grid from data, ping-pong background.
5. **`/code`** — terminal typing background, resume rows + desc panel.
6. **Migration/cleanup** — old index → new, retire blocks.js/projects.js,
   404.html, favicon, verify file:// open works, deploy.

Admin "edit" = edit INFO.md + run build-data.py (documented in README/PLAN).
No backend/CMS — static GitHub Pages only.
