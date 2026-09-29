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
before it by a per-card overlap (a negative `margin-block-end`), and its height comes from the
picture — `aspect-ratio: 7 / 5` on `.fan__card`, there is no `--card-h`.

**The band is two-tier, and the tier follows the FOCUS.** The card you are looking at is left mostly
exposed and every _other_ card is pulled much further up, so the deck reads as one open card plus a
tight stack of thin bands rather than a column of heroes. Point at a card mid-pile and the deck
closes up **above** it — which is the point: the exposed card is the one you chose, not the one that
happens to be at the front. Both tiers are set as a **percentage pair**, `--overlap` /
`--overlap-tail`, and each card picks one:

```css
--tier:         min(1, max(var(--pile) - var(--focus), var(--focus) - var(--pile)));
--overlap-here: calc(var(--overlap) + var(--tier) * (var(--overlap-tail) - var(--overlap)));
```

`--tier` is 0 on the focused card and 1 on every other card. `max(a - b, b - a)` is `abs(a - b)`
without `abs()`, which is still not safe to lean on everywhere.

⚠️ **Because the tier follows the focus, the band is the one thing in this deck that MOVES LAYOUT —
and layout moving moves hit regions.** That is why the focus is only ever set from real pointer
**movement** (`pointermove`) or the keyboard; see the movement-gate note under Depth.

⚠️ **The percentages are load-bearing, not a style choice.** In `margin-block-end` a percentage
resolves against the containing block's **inline** size, which here _is_ the card width — and the
card's height is 5/7 of that width. So a percentage overlap scales with the card instead of going
stale. The previous `clamp(120px, 18vh, 240px)` did not: a viewport-height value has no relationship
to a width-driven card, and on a wide-but-short window it silently exceeded the card height and the
band went negative. `--overlap-h` restates the result against the card **height** — the base that
`inset-block-end` and gradient stops use — hence the 7/5, which is the one place the card's ratio is
hard-coded.

Paint order is set once at build (`z-index` = `index + 1`), so **card 2 sits over card 1, card 3
over card 2** — the reference's own behaviour, where its index items carry no `z-index` at all and
document order decides. Because each card is pulled _up_ over the previous one, painting the later
card on top is what leaves a covered card's **top** band showing. That ordering is deliberately
_not_ updated as you move around: re-stacking would flip every visible band to the cards'
**bottoms** and the pile would stop reading as a pile.

That is what `--label-lift` is for. The covered strip is the card's own overlap tall, so the
bottom-anchored type sits at `--label-lift` (`--overlap-h` + a small gap) rather than flush to the
card's edge, which would put it underneath the next card. It is derived **per card**, so the type
lands the same small gap above the seam whether the card is the focused one or a thin band in the
tail. `subtitle` and `year` sit on the top band, which is the part a covered card leaves showing.

The deck is in **ordinary document flow**. There is no fixed aperture, no nested scroller, no
scroll-snap and no wheel handling — the page scrolls, so the nav cannot hijack the scroll. (The
old nav was a fixed-aperture `rotateX` "flip column" with Step and Scroll modes; that geometry,
the mode switch and `nav.mode` in `content/site.js` are all gone.)

### Depth — the rake, and which way is "forward"

`--rake` is a **0–1 factor over the whole ramp**, not an angle, so a single value switches the deck
between the tilted deck (`--rake: 1`, the current setting) and the reference's flat stack
(`--rake: 0`). Nothing else differs between the modes: `--persp`, `--persp-origin`, `--tilt-*` and
the JS-set `--pile` all stay in place and go inert at 0, because `rotateX(0deg)` is the identity.

**Sign convention — settled by measurement, because this doc has had it backwards.** With
`transform-origin: center top` and `rotateX(-1 × --rake-deg)`:

| `--rake-deg` | projected width      | projected height | reads as                                            |
| ------------ | -------------------- | ---------------- | --------------------------------------------------- |
| `0`          | 1152 (layout)        | 823 (layout)     | flat                                                |
| **`+20`**    | **1152 — unchanged** | **609**          | bottom recedes → top nearest = **leaning FORWARD**  |
| `−20`        | **3681**             | 1658             | bottom swings at you → magnified, spills the column |

So **positive = leaning forward = the top of the card appears nearest**, and it is also the **safe**
direction: the card holds its full projected width and only shrinks in height. Negative is the
expensive one — perspective magnifies the approaching edge, so a bare `−20°` put a 3681px card into a
1152px column, and that is the direction that needs a long projection and a careful gutter budget.
**Nothing in the deck leans backward.** Both tilt classes lean forward, so both sit on the safe side
of that line, and `--persp-back` is doing a different job entirely — see below.

**There are TWO tilts, BOTH forward, and which one a card gets is decided by the focus.** `fan.js`
puts exactly one of two classes on every card, splitting the deck the same way the band does:

| class               | cards                                       | its angle                    |
| ------------------- | ------------------------------------------- | ---------------------------- |
| `fan__item--after`  | every card _after_ the focus                | the ramp — 18°, 22°, 26° …   |
| `fan__item--before` | the focused card _and_ every card before it | one deep `--tilt-back` — 35° |

Every card therefore keeps its full width along its **top** edge and narrows downward. What differs is
how hard it narrows, and there the two classes do something counter-intuitive:

| class | angle | projection | taper (top → bottom, 1280×900) | projected height |
| --- | --- | --- | --- | --- |
| `--after` at 26°  | the smaller angle | short — `--persp`, 410px      | 1149 → 612 (**47%**) | 393px |
| `--before` at 35° | the larger angle  | long — `--persp-back`, 200vw  | 1150 → 971 (**16%**) | 569px |

**A bigger angle under a longer projection tapers LESS.** `--persp-back: 200vw` is what turns the 35°
near side into the gentler of the two, so do not read the degrees as how tilted a card looks. Because
that projection is a multiple of `vw`, the taper holds the same fraction of the card at every width,
so the near side reads the same from phone to desktop.

The ramp side is `--tilt-focus + --rel × --tilt-step` (with `--rel` = `--pile − --focus`), capped at
`--tilt-max`, counted from the focus; where the stack is short the cap is 22° instead (see the media
queries at the bottom of `fan.css`). The near side is the flat `--tilt-back`.

So the deck reads as **the focused card and the cards above it leaning forward gently, with the cards
below fanning away more steeply.** At rest the focus is the front card, so the deck settles at
`35, 18, 22, 26, 26, 26, 26`; point at card 3 and it re-ramps to `35, 35, 35, 35, 18, 22, 26`; point
at the last card and everything from the front down to it sits at `35`.

A rising ramp is safe _here_ even though it used to collapse the pile: a forward card is a **shorter**
card, and visual overlap is `projHeight − band`, so each forward step eats into the seam. It holds
because the tail band is now only ~7% of the card, which absorbs the step. The old failure was the
opposite shape at a 46–77px band.

Everything below still holds:

- **`--persp` has to stay short.** The visible trapezoid is roughly
  `(card height × sin(rake)) / perspective`, so a long projection makes even a large rake
  invisible. That is why the reference uses `20vw` where it does use one, and why this file uses
  `clamp(340px, 32vw, 880px)`. Reaching for `1000px` here silently flattens the deck.
- **`--persp-origin` must be the card's TOP EDGE (`50% 0%`).** It used to be `50% 45%`, which put
  the vanishing point _below_ the band the type occupies — so a receding card pushed its own
  top-row type **downward**, toward the seam, and the tighter the tail band the worse it got.
  Measured tail-type clearance at `45%`: `+10px` at 390 wide, `+2` at 1280, `0` at 1440, `−8` at
  1920, `−18` at 2560 — the type was buried on any large display. At `0%` the same sweep reads
  `+14, +23, +25, +29, +34`. It also matches `transform-origin: center top`: the card narrows as it
  recedes rather than pivoting about a point inside its own middle.
- **The focus is only ever set from real pointer MOVEMENT, and that gate is load-bearing.** An
  earlier attempt followed the pointer with `pointerover` and had to be abandoned: a **stationary
  pointer walked the focus from card 4 to card 6 unaided**, because a focus change re-geometries the
  deck under the cursor and `pointerover` fires again when the element beneath the pointer changes.
  Two things make that impossible now. `pointermove` cannot fire without movement, so a focus change
  can never feed itself — and the band is LAYOUT, so re-tilting a card cannot move a hit region at
  all. The band moving is the one thing here that DOES move hit regions, which is exactly why the
  gate is not optional. Re-verified: `--focus` holds steady for over a second with the pointer parked
  inside the focused card's wide band, and pointing at a different card then re-focuses in one step
  and holds.
- **The overlap has to stay well under the card height**, tiered or not: the band a covered card
  keeps is `card height − overlap`, and at zero the card is invisible and unclickable.

For the record, on the reference itself: its **index items carry no 3D of their own**. The origin
and sign the raked mode borrows come from the transforms it does have — `.ShowcaseView_picture`
(`transform-origin: top; rotateX(-1.5deg)`) and `.GalleryView_item > picture`
(`transform-origin: top; rotateX(-5deg)`), both inside `perspective: 20vw` — and from
`.NextProject_picture`, which takes the same sign the long way round
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

**JS owns `active` and `--focus`.** `active` drives the live region and
`sessionStorage("nav:last")`, moves with `↑`/`↓`/`←`/`→`/`PageUp`/`PageDown`/`Home`/`End`, wraps at
both ends, and is restored for the session; `--focus` is the index the whole deck is built around —
which card is exposed, and which of the two tilts each card gets (see "Depth" above). The _fan_ is
still pure CSS: there is no `fanIndex` and no `--i`, and the `--fan-y` push never consults JS, so the
pointer and the keyboard cannot fight over the gesture.

Two knobs are set from the same `setFocus`, and they are deliberately different kinds of thing:
`--focus` is **one value** the CSS computes from, and the tilt classes are **per card**, because a
named class is easier to tune than a branch inside a single `calc()`. Because both come from one
call they can never disagree.

### Tuning

```
--card-w             card width (100% = the content column)
--aspect             card ratio; this is what sets the height. 7/5 is the reference's
--overlap            the focused card's exposure, as a % of card WIDTH
--overlap-tail       every card after it, as a % of card WIDTH
--overlap-h          ← derived per card: the same distance on the HEIGHT axis (× 7/5)
--label-lift         where the bottom-anchored type sits — --overlap-h + a gap, NOT 0
--fan-spread         how far the tail opens on hover
--dur-fan            fan transition duration
--ease-spring        the fan's overshoot curve
--rake               0 = flat (the reference). 1 = the raked deck. A FACTOR, not an angle
--tilt-focus         where the tail ramp starts, on the card after the focus
--tilt-step          how much further forward each card after the focus leans
--tilt-max           the ramp's cap
--tilt-min           the ramp clamp's floor — inert at its current value
--tilt-back          the near side's lean (focused card + every card above it). 35° FORWARD —
                     the name is stale, it has not leaned back since that was reversed
--focus              which card the deck is built around; JS-written
--persp              projection depth for the TAIL ramp. SHORT on purpose — see above
--persp-back         projection depth for the NEAR side. LONG on purpose — it is what softens
                     that 35° down to a 16% taper
--persp-origin       the vanishing point; keep it at the card's TOP EDGE
```

All of them live at the top of `fan.css`. The JS-set values are `--pile` (the card's fixed position
in the pile), `--focus` (which card the deck is built around — set on `pointermove`, by the keyboard
cursor, and handed back to the cursor on `pointerleave`), the two tilt classes derived from it, and
the `z-index` paint order; the fan's `--fan-y` is set by the sibling rules in `fan.css`.

Verified with `--rake: 1` and 7 cards — **no horizontal overflow at any size**:

| Viewport  | Card (layout) | Focused band | Tail band | Tail label clearance |
| --------- | ------------- | ------------ | --------- | -------------------- |
| 1920×1080 | 1792×1280     | 707px        | 133px     | 29–37px              |
| 1440×900  | 1312×937      | 518px        | 97px      | 25–31px              |
| 1280×900  | 1152×823      | 455px        | 85px      | 23–28px              |
| 844×390   | 760×543       | 215px        | 49px      | 15–17px              |
| 390×844   | 351×251       | 132px        | 54px      | 14–16px              |
| 320×568   | 288×206       | 107px        | 45px      | 13–15px              |

"Label clearance" is how far the bottom-anchored type sits above the next card's top edge, and it
has to stay positive on every card but the last. **It is the first thing to break** — it was
negative at 1920 and 2560 before `--persp-origin` moved to the top edge — so re-check it after any
change to `--overlap`, `--label-lift`, `--aspect` or `--persp-origin`. A card shorter than its own
overlap is the same failure in its worst form: the card vanishes and cannot be clicked.

The table is the **resting** deck. Two separate things re-centre on the focus, so sweep **both ends**:

- **The band**, which means the exposed card moves and the cards above the focus close up. At focus 3
  on 1280×900 the exposed card is card 3 (455px band) and cards 0–2 and 4–6 are all 85–86px — the
  cards _below_ the focus keep the positions they had at rest.
- **The tilt**, which is the *safer* case for the type here. Both classes lean forward, and a forward
  lean lifts a card's own content UP toward its top edge, away from the seam that covers it — so the
  exposed near-side card reads 129px of clearance at 1280×900 against the tail's 23–28px, and the thin
  near-side cards above it 30px. That is the opposite of what a backward lean would do, which is why
  the deck does not use one.

Measured with the near side applied at all seven viewports: **every card is top-wider than bottom**,
the near taper holds at 15.4–16.3% (constant, because `--persp-back` is vw-based), minimum clearance
is 13px at 320×568 rising to 34px at 2560×1440, and there is **no horizontal overflow at any width** —
a forward lean cannot spill, because the card can only narrow.

Four traps when re-verifying interactively. **The fan is a CSS transition, so it does not advance
while the page is not visible** — a probe on a background tab reads the transform as the identity
matrix even though `--fan-y` is correctly set on the tail; inject `* { transition: none !important }`.
**Make sure the fan is not engaged before calling a reading "resting"** — any `:hover` or
`:focus-visible` on a card pushes every card after it down by `--fan-spread` (117px at 900 tall),
which inflates label clearance by exactly that much; load the page and leave the pointer off the
deck, and do **not** "press Home" to force the resting focus, because focusing a card engages the
fan. **Setting `--focus` by hand only moves the BAND** — the tilt lives in the two classes, and only
`setFocus()` writes both, so a probe that pokes the CSS variable shows the deck re-tiered while every
card keeps its old tilt. And **measure the card or the `.fan__flip`, never the `<li>`** — the fan is
a transform on a child, so the `<li>`'s rect never moves and a hover check against it reports a false
all-zeros.

### Three traps worth knowing before you touch this

**The `.fan__scrim` ramps are measured against `--band` — the strip a card actually leaves showing,
`100% - --overlap-h` — never against `--overlap`.** Those were the same thing while every band was
uniform; now that the tail is drawn up tight, `--overlap` reaches most of the way up the card, so a
ramp measured against it would darken the whole band and leave the type on bare photograph.

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
