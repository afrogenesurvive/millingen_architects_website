# Millingen Architects — portfolio site

A zero-build static site: **vertical flip-column portfolio nav → project pages**, plus an
**About** page and a **top-right menu popover**. No `package.json`, no bundler, no framework —
plain HTML/CSS/ES modules, deployable to Netlify as-is.

Built from an internal build spec that is deliberately **not** part of this repo. The decisions
that matter are recorded below instead — in particular the two traps documented under
[How the nav works](#how-the-nav-works--a-vertical-flip-column), which are worth reading before
restructuring the nav.

## Contents

```
site/
├── index.html                 # one page shell; the router swaps views inside <main>
├── css/
│   ├── tokens.css             # brand tokens, mirrored from the deck
│   ├── base.css               # reset, focus states, utilities
│   ├── layout.css             # site bar, page shell, About blocks, footer
│   ├── fan.css                # ⭐ the nav column (vertical flip)
│   ├── popover.css            # the menu panel
│   └── project.css            # project page, facts, gallery, lightbox
├── js/
│   ├── util.js                # el(), asset(), prose helpers, footer
│   ├── router.js              # History-API router + link interception
│   ├── fan.js                 # fan: render, geometry, keyboard, scroll sync
│   ├── project.js             # project view + lightbox
│   ├── about.js               # About view
│   ├── menu.js                # menu button + popover
│   └── main.js                # route table + boot
├── content/
│   ├── projects.js            # ⭐ SINGLE SOURCE OF TRUTH — portfolio
│   └── site.js                # ⭐ company, services, policies, CV, contact
├── tools/gen-placeholders.mjs # writes the placeholder drawings
├── assets/img/projects/<id>/  # generated placeholders, replaced by real photography
├── netlify.toml               # config for Netlify site #2
└── _redirects                 # SPA fallback
```

## Local preview

Deep links (`/project/001`, `/about`) need a server with an SPA fallback.

```sh
npx serve -s site          # -s = SPA fallback
```

⚠️ `python3 -m http.server` (the method documented for the deck) **will 404 and throw a
module MIME error on refresh** at a deep URL, because it has no fallback. That is the server's
behaviour, not a bug in the router. Refresh at `/` only if you must use it.

## Adding a project

1. Append an object to `projects` in `content/projects.js` (copy an existing one).
2. Create `assets/img/projects/<id>/` and drop in `hero.*` plus numbered gallery images.
3. Point `hero.src` and `gallery[].src` at them.

Nothing else changes — no JS, no CSS, no route. The fan, the prev/next pager, and the live-region
announcements all read from the same ordered array, so they cannot drift apart.

Set `placeholder: true` while copy is still staging: the UI then shows a "Placeholder" chip, which
keeps a half-populated site reading as staging rather than as finished work.

### Asset paths

Paths in `content/*.js` are written **relative to the site root** (`assets/img/projects/001/hero.svg`).
They are passed through `asset()` in `util.js`, which anchors them to `/`. That matters: on a deep
link such as `/project/001` a bare relative path would resolve against `/project/` and 404.
CSS and JS in `index.html` are likewise root-absolute (`/css/...`, `/js/main.js`).

### Regenerating the placeholder drawings

```sh
node site/tools/gen-placeholders.mjs
```

Writes one hero + one image per gallery entry, per project. Deterministic — re-running produces
byte-identical files, so a placeholder pass never shows up as a spurious diff.

## Editing the About page

Everything comes from `content/site.js` → `site.sections[]`, rendered in order:
`Practice` (prose) · `Services` (string list) · `Policies` (label + note, add a `url` to make an
item a link) · `Founder` (CV block) · `Contact` (rendered from `site.contact`).

Add, remove, or reorder sections by editing that array. To add a section with a shape that does
not exist yet, add a branch to `renderSection()` in `js/about.js`.

## How the nav works — a vertical flip column

Items sit in a **single column** and are flipped through about the **horizontal axis**
(`rotateX`), which is the axis the group8.ch reference uses. There is no horizontal fan, and
nothing rotates about Y.

The active card stands upright and centred. Every other card rotates about the edge **nearest**
the active card, so neighbours tip *away* from it and the column reads as a tent receding into
perspective (`--tilt` per step, plus Z-recession and shrink). Rotating every card about the same
edge instead makes the card *above* lean out over the active one and hide it — that is exactly
what the `data-side` attribute exists to prevent.

It is a real vertical scroll container, which buys two things hand-rolled gesture code cannot:
**native momentum** on touch, and automatic clamping so the first and last card can both be
centred without running off the end.

### Two advancing modes

Switchable live with the **Step / Scroll** control under the page heading, so the feel can be
compared without a redeploy. The default is `nav.mode` in `content/site.js`, and a visitor's
choice wins for the rest of their session.

| Mode | Behaviour |
|---|---|
| **Step** (default) | One folder at a time. `scroll-snap-type: y mandatory` plus the browser's own fling gives touch momentum that always lands on exactly one card; wheel and arrow keys step exactly one card. |
| **Scroll** | Free scrolling with native momentum; the flip follows the scroll position continuously. |

### Tuning

```
--card-w   card width
--card-h   card height — the column's unit
--step     vertical advance per card. Less than --card-h = overlap.
--tilt     rotation per step, about the card's NEAR edge
--recede   how far each step is pushed back in Z
--shrink   how much far cards shrink
```

All six live at the top of `fan.css`. The only JS-set values are `--i` (signed relative index),
`--a` (`Math.abs(--i)`), `data-side`, `data-depth` and `data-mode`.

Verified geometry: the column advances a uniform `--step`, `scrollHeight - clientHeight` is
exactly `(n − 1) × --step`, and the active card centres to the pixel at both index 0 and index
n−1.

### Two traps worth knowing before you touch this

**The transform lives on `.fan__flip`, not on the `<li>`.** The `<li>` is the scroll snap target,
and a transform on it displaces its computed snap position — with the transform on the `<li>`,
every snap point landed 22px off centre and the column appeared stuck.

**Nothing depends on `requestAnimationFrame`.** Browsers suspend animation frames for a hidden or
occluded page, so a rAF-driven scroll tween silently never advances and the nav looks frozen in a
background tab or an editor's preview pane. Programmatic moves use native `smooth` scrolling with
a `setTimeout` safety check (timers still fire while hidden), and the scroll-position sync uses
`setTimeout` too.

## Deployment — two Netlify sites from one repo

This repo hosts **two independent sites**, distinguished by their Netlify **base directory**:

| | Site | Base dir | Publish dir | Config |
|---|---|---|---|---|
| #1 | the presentation deck | *(repo root)* | `presentation_site` | root `netlify.toml` |
| #2 | **this portfolio site** | `site` | `.` | `site/netlify.toml` |

Netlify reads the `netlify.toml` found at the site's base directory, which is why the two files
coexist without one overriding the other.

To create site #2: Netlify → **Add new site → Import an existing project** → same repo →
**Base directory: `site`** → **Publish directory: `.`** → build command empty.

The `[[redirects]]` rule in `site/netlify.toml` (and the equivalent `_redirects`) is what makes
deep links work in production. Without it `/project/001` returns a Netlify 404.

### Popover link to the deck

`js/menu.js` has `const DECK_URL = ""`. Paste the deck site's URL there to add the
"Presentation" item; while it is empty that item is omitted rather than shipping a dead link.

## Media budget

Placeholder drawings are SVG (a few KB each) and are not representative. Real photography must
hit these targets or the nav will feel broken on a phone:

| Slot | Target |
|---|---|
| Project hero | ≤ 180 KB |
| Gallery image | ≤ 120 KB |
| Video (if used) | ≤ 4 MB for ~20s |

```sh
# hero, responsive set
for w in 800 1200 1600 2400; do
  npx sharp-cli -i raw/hero.jpg -o "assets/img/projects/<id>/hero-$w.jpg" \
    resize $w --withoutEnlargement jpeg --quality 78 --mozjpeg
done

# video
ffmpeg -i raw/clip.mp4 -vf scale=1280:-2 -c:v libx264 -crf 26 -preset slow \
  -movflags +faststart -c:a aac -b:a 96k assets/vid/<id>.mp4
```

Then add `srcset`/`sizes` to the hero in `js/project.js`. Rules that matter:

- The hero gets `fetchpriority="high"` and **never** `loading="lazy"`.
- Everything below the fold gets `loading="lazy" decoding="async"`.
- Always set `width`/`height` (CLS).
- Prefer AVIF/WebP with a JPEG fallback.

For reference, the assets in `presentation_site/` are **2.6 MB** (`hero02.png`) and **~230 MB** of
video — do not copy those in as-is.

## Accessibility

- The column is a list of real `<a>` elements — keyboard, middle-click, and "open in new tab" all work.
- `↓`/`↑` and `PageDown`/`PageUp` step one card, `Home`/`End` jump to the ends; the column follows focus.
- A `role="status"` live region announces "Name, id, n of N" as the active card changes, debounced
  so a fling across several cards does not read the whole list aloud.
- The popover is a non-modal disclosure button (`aria-expanded` + `aria-controls`); `Esc` closes it
  and returns focus to the button. It also closes on outside pointer-down, on focus leaving the
  panel, and on any route change.
- The lightbox is a native `<dialog>` with `showModal()` — real focus trapping and a real backdrop.
- Every page has two independent routes back to the nav: the brand link and the `← All projects`
  breadcrumb.
- `prefers-reduced-motion` collapses every transition to 1ms and makes programmatic moves instant.
- Transitions are sized off the `--dur*` tokens in `tokens.css`.

## Known limitations

- **Verification gap:** geometry and keyboard/wheel stepping were verified at 693×781. Not yet
  checked on a real touch device, where the native fling and snap behaviour matter most. Note that
  smooth programmatic scrolling cannot be observed while the preview pane is hidden — browsers
  suspend animation frames, so the move degrades to an instant jump. That is correct either way,
  but it means the animation itself is unverified here.
- No custom-domain, analytics, sitemap, or `robots.txt` yet.
- No Open Graph / social preview images.
- Content is placeholder throughout; every fake value is marked in the UI or in a code comment.
- The contact block is text only — no working form (a Netlify Form is ~0.5 day).
