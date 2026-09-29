# Millingen Architects — portfolio site

A zero-build static site: **full-bleed stacked-deck portfolio nav → project pages**, plus an
**About** page and a **top-right menu popover**. No `package.json`, no bundler, no framework —
plain HTML/CSS/ES modules, deployable to Netlify as-is.

Built from an internal build spec that is deliberately **not** part of this repo. The decisions
that matter are recorded below instead — in particular the traps documented under
[How the nav works](#how-the-nav-works--a-full-bleed-stacked-deck), which are worth reading before
restructuring the nav.

## Contents

```
site/
├── index.html                 # one page shell; the router swaps views inside <main>
├── css/
│   ├── tokens.css             # brand tokens, mirrored from the deck
│   ├── base.css               # reset, focus states, utilities
│   ├── layout.css             # site bar, page shell, About blocks, footer
│   ├── fan.css                # ⭐ the nav deck (full-bleed stacked pile)
│   ├── popover.css            # the menu panel
│   └── project.css            # project page, facts, gallery, lightbox
├── js/
│   ├── util.js                # el(), asset(), prose helpers, footer
│   ├── router.js              # History-API router + link interception
│   ├── fan.js                 # fan: render, keyboard, live region
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

`name`, `subtitle`, `category` and `year` are the four strings painted on the card. `name` is the
big overlaid title **and** the link's accessible name — the other three are `aria-hidden`, so a
screen reader announces the project name once and does not read the whole card. `subtitle` and
`year` are the small top-band labels; `category` is the bottom-right word.

Every card paints `name` and `category` on the same line, just above `--label-lift` — the strip the
next card covers. Keep `category` to a single word: it shares that line with the hover badge.

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

## How the nav works — a full-bleed stacked deck

Cards overlap in a **single column** like a pile of prints. Each card is pulled up over the one
before it by `--overlap` (a negative `margin-block-end`), and its height comes from the picture —
`aspect-ratio: 7 / 5` on `.fan__card`, there is no `--card-h`. At 1440×900 that is a 1312×937 card
showing a 775px band, so the deck reads as **roughly one project per screen**, with the next one
sliding up over the strip below.

Paint order is set once at build (`z-index` = `index + 1`), so **card 2 sits over card 1, card 3
over card 2** — the reference's own behaviour, where its index items carry no `z-index` at all and
document order decides. Because each card is pulled *up* over the previous one, painting the later
card on top is what leaves a covered card's **top** band showing. That ordering is deliberately
_not_ updated as you move around: re-stacking would flip every visible band to the cards'
**bottoms** and the pile would stop reading as a pile.

That is what `--label-lift` is for. The covered strip is `--overlap` tall, so the bottom-anchored
type sits at `--label-lift` (`--overlap` + a small gap) rather than flush to the card's edge, which
would put it underneath the next card. `subtitle` and `year` sit on the top band, which is the part
a covered card leaves showing.

The deck is in **ordinary document flow**. There is no fixed aperture, no nested scroller, no
scroll-snap and no wheel handling — the page scrolls, so the nav cannot hijack the scroll. (The
old nav was a fixed-aperture `rotateX` "flip column" with Step and Scroll modes; that geometry,
the mode switch and `nav.mode` in `content/site.js` are all gone.)

### Depth — the rake is off by default

`--rake` is a **0–1 factor over the whole ramp**, not an angle, so a single value switches the deck
between the reference's flat stack (`--rake: 0`) and the tilted deck the client asked for
(`--rake: 1`). Nothing else differs between the two modes: `--persp`, `--persp-origin`, `--tilt-*`
and the JS-set `--pile` all stay in place and go inert at 0, because `rotateX(0deg)` is the
identity.

With `--rake: 1` every card rotates about its **top edge** — `transform-origin: center top`,
`rotateX(-1 × --rake-deg)` — so it renders as a trapezoid with the **top edge wider than the
bottom**: the bottom edge swings away from the viewer and therefore projects smaller. The rake ramps
back from the front card: `--tilt-focus` + `--pile × --tilt-step`, capped at `--tilt-max`.

⚠️ **The rake does not survive the current density.** It was tuned when a card showed a 46–77px
band; at the reference's density a card shows ~775px, and foreshortening removes more height than
`--overlap` can absorb. Measured at 1280×900 with `--rake: 1`: projected heights
`658, 573, 506, 448, 409, 409, 409` against a 661px band. The cards stop overlapping, the pile
reads as a spaced column, and the bottom-anchored type falls outside its band. Making `--rake: 1`
usable again needs its own pass: raise `--overlap` to clear the projection loss **and** re-derive
where the labels go, because under rotation a point at distance *d* from the top edge no longer
renders at *d* — and with no `cos`/`sin` in CSS, a single `--label-lift` cannot be corrected per
card. Treat `--rake: 1` as a working switch, not a signed-off look.

Everything below still holds whenever the rake is used:

- **`--persp` has to stay short.** The visible trapezoid is roughly
  `(card height × sin(rake)) / perspective`, so a long projection makes even a large rake
  invisible. That is why the reference uses `20vw` where it does use one, and why this file uses
  `clamp(340px, 32vw, 880px)`. Reaching for `1000px` here silently flattens the deck again.
- **The rake is keyed to `--pile` — the card's fixed place in the pile — never to the focus.**
  Making it follow the pointer is unstable, because un-rakening a card re-geometries the deck while
  the pointer is over it, so the card beneath the cursor keeps changing. Measured with a
  focus-relative ramp: a **stationary pointer walked the focus from card 4 to card 6 unaided.**
- **`--overlap` has to stay well under the card height**, raked or not: the band a covered card
  keeps is `card height − --overlap`, and at zero the card is invisible and unclickable. The phone
  breakpoint caps the overlap at a third of the card height for exactly that reason.

For the record, on the reference itself: its **index items carry no 3D of their own**, which is why
`--rake` defaults to 0. The origin and sign the raked mode borrows come from the transforms the
reference does have — `.ShowcaseView_picture` (`transform-origin: top; rotateX(-1.5deg)`) and
`.GalleryView_item > picture` (`transform-origin: top; rotateX(-5deg)`), both inside
`perspective: 20vw` — and from `.NextProject_picture`, which takes the same sign the long way round
(`transform-origin: center bottom; rotateX(progress × 50deg − 90deg)`, so progress 0 is edge-on and
invisible). Its one index-level depth cue is `filter: grayscale(1)` on whatever you are not
pointing at. There is **no `rotateY` anywhere** in that stylesheet, so nothing here leans
sideways either.

### Hover, keyboard and the front card

The fan is **CSS-only, one-way and springy**. Pointing at a card sets `--fan-y` on the cards
_after_ it:

```css
.fan__item:has(.fan__card:hover) ~ .fan__item .fan__flip {
  --fan-y: var(--fan-spread);
}
```

That is the reference's own mechanism — `.ListView_item:hover ~ .ListView_item { translate3d(0,
12.4rem, 0) }` — and it buys two things the previous JS index could not.

The push is **one-way**: the pointed-at card and every card _above_ it stay exactly where they are,
and only the tail below opens, so the gesture reads as the card under the pointer peeling open at
its bottom edge. Measured at 1280×900 hovering card 2, card tops move
`0, 0, +117, +117, +117, +117, +117` — the spread and nothing else. And because it is a single CSS
transition it is **springy**: `--ease-spring` is `cubic-bezier(.1, .2, .165, 1.3)`, the reference's
own curve, whose `y2 = 1.3` overshoots the target and settles back. A plain ease-out makes a 117px
push read as a dead slide.

Because the movement is uniform rather than cumulative, the deck's overhang is capped at one
`--fan-spread` instead of `(n − 1) × spread`. The `:hover` rule sits inside
`@media (hover: hover)`, exactly as the reference's does, so a stuck `:hover` on a touch device
cannot leave the deck hanging open; the `:focus-visible` rule is deliberately _outside_ that
query, because a touch device still has a keyboard.

Hovering also fades in the reference's **"→" badge** (`.fan__go`) — a filled disc that scales
`0.33 → 1` over 600ms — turns the project name to the accent colour, and thickens the card's
hairline. `category` is inset to leave the badge room, so it does not shift when the badge appears.

**JS now owns exactly one thing: `active`.** It drives the live region and
`sessionStorage("nav:last")`, moves with `↑`/`↓`/`←`/`→`/`PageUp`/`PageDown`/`Home`/`End`, wraps at
both ends, and is restored for the session. There is no longer any `fanIndex` and no `--i`: the fan
never consults JS, so the pointer and the keyboard can no longer fight over it.

### Tuning

```
--card-w             card width (100% = the content column)
--aspect             card ratio; this is what sets the height. 7/5 is the reference's
--overlap            how much of a card the next one covers
--label-lift         where the bottom-anchored type sits — --overlap + a gap, NOT 0
--fan-spread         how far the tail opens on hover
--dur-fan            fan transition duration
--ease-spring        the fan's overshoot curve
--rake               0 = flat (the reference). 1 = the raked deck. A FACTOR, not an angle
--tilt-focus/-step/-max   the rake ramp; read only while --rake is non-zero
--persp              projection depth, applied per card. SHORT on purpose — see above
--persp-origin       the vanishing point within each card
```

All of them live at the top of `fan.css`. The only JS-set values are `--pile` (the card's fixed
position in the pile, read only by the rake) and the `z-index` paint order; the fan's `--fan-y` is
set by the sibling rules in `fan.css`.

Verified flat (`--rake: 0`) with 7 cards — no horizontal overflow at any size:

| Viewport | Card     | Band  | Label clearance |
| -------- | -------- | ----- | --------------- |
| 1440×900 | 1312×937 | 775px | 18–19px         |
| 1280×900 | 1152×823 | 661px | 18–19px         |
| 390×844  | 351×251  | 153px | 12–13px         |
| 320×568  | 288×206  | 125px | 12px            |
| 844×390  | 760×242  | 153px | 14–15px         |

"Label clearance" is how far the bottom-anchored type sits above the next card's top edge. It has
to stay positive on every card but the last, and does at every size. Re-check it after any change
to `--overlap`, `--label-lift` or `--aspect`: a negative value means the label is buried under the
next card. A card shorter than `--overlap` is the same failure in its worst form — the card
vanishes and cannot be clicked.

One trap when re-verifying interactively: **the fan is a CSS transition, so it does not advance
while the page is not visible.** A probe on a background tab reads the transform as the identity
matrix even though `--fan-y` is correctly set on the tail. Inject
`* { transition: none !important }` before measuring — that is how the numbers above were taken.

### Three traps worth knowing before you touch this

**Both ramps in `.fan__scrim` are measured in `--overlap` / `--label-lift`, not in percentages.**
The covered strip _is_ `--overlap` tall and the type sits at `--label-lift`, just above it, so a
percentage ramp darkens exactly the strip the next card paints over — the part nobody can see — and
leaves the type sitting on bare photograph.

**The `<li>` must not be hit-testable.** `.fan__item` carries `pointer-events: none` and
`.fan__card` puts it back. Dormant while `--rake` is 0, because the two boxes then coincide, but
load-bearing the moment the rake comes back: the `<li>` is the only box in the pile that is _not_
foreshortened, so the li in front sticks out well past the card it actually shows, and a
transparent box still hit-tests. Measured on the old geometry: card 3's title fell inside li 2's
box, so it was **visible but dead** to both click and hover.

**Both transforms — the fan and the rake — live on `.fan__flip`.** Nothing may be added to
`.fan__card`: a transform there would fight the flip's, and emphasis is the hairline, the shadow
and the focus ring, nothing else.

## Deployment — two Netlify sites from one repo

This repo hosts **two independent sites**, distinguished by their Netlify **base directory**:

|     | Site                    | Base dir      | Publish dir         | Config              |
| --- | ----------------------- | ------------- | ------------------- | ------------------- |
| #1  | the presentation deck   | _(repo root)_ | `presentation_site` | root `netlify.toml` |
| #2  | **this portfolio site** | `site`        | `.`                 | `site/netlify.toml` |

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

| Slot            | Target          |
| --------------- | --------------- |
| Project hero    | ≤ 180 KB        |
| Gallery image   | ≤ 120 KB        |
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
