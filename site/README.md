# Millingen Architects — portfolio site

A zero-build static site: **full-bleed stacked-deck portfolio nav → project pages**, plus an
**About** page and a **top-right menu popover**. No `package.json`, no bundler, no framework —
plain HTML/CSS/ES modules, deployable to Netlify as-is.

Built from an internal build spec that is deliberately **not** part of this repo. The decisions
that matter are recorded below instead — in particular the traps documented under
[How the nav works](#how-the-nav-works--a-fixed-flip-through-deck), which are worth reading before
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
│   ├── fan.js                 # fan: render, wheel/drag/keyboard stepping, live region
│   ├── project.js             # project view + lightbox
│   ├── about.js               # About view
│   ├── menu.js                # menu button + popover + the hover-peel switch
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

Every card paints `name` and `category` on the same line, just above `--label-anchor` — the strip the
next card covers. Keep `category` to a single word: it shares that line with the hover badge.

Nothing else changes — no JS, no CSS, no route. The deck measures itself from the array: `fan.js`
writes `--count` at mount, so the bands thin out as the list grows and the pile still fills the
window (see the band invariant below). Ten cards is the density the geometry has been verified at;
past that, re-run the sweep under [How the nav works](#how-the-nav-works--a-fixed-flip-through-deck)
and watch the tail band, which is what the overlaid type has to fit into. The fan, the prev/next
pager, and the live-region announcements all read from the same ordered array, so they cannot drift
apart.

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

## How the nav works — a fixed flip-through deck

Cards overlap in a **single column** like a pile of prints. Each card is pulled up over the one
before it by its own band (a negative `margin-block-end`), and its height comes from the picture —
`aspect-ratio: 7 / 5` on `.fan__card`, there is no `--card-h`.

**The deck is a FIXED APERTURE, and the pile's total height is an invariant.** `.page--home` is
`position: fixed; inset: 0; overflow: hidden`, and the two band values are chosen so that the sum of
every band is exactly the height of the window:

```text
--band-focus + (--count - 1) * --band-tail  ==  --deck-h
```

So the pile fills the frame at **every** focus, nothing can scroll, and no part of the deck ever
needs translating or measuring in JS — the only thing a gesture changes is which card is exposed.
The last card carries a band like all the others, so its body is simply clipped by the aperture;
that clipping is where "overflow below is hidden" comes from.

**The band is two-tier, and the tier follows the FOCUS.** The card you are looking at is left mostly
exposed (42% of the deck height) and every _other_ card shares what is left equally, so the deck reads
as one open card plus a tight stack of thin bands rather than a column of heroes. Move the focus and
the big band moves with it — the exposed card is the one you chose, not the one that happens to be at
the front — while the total stays put:

```css
--tier: min(1, max(var(--pile) - var(--focus), var(--focus) - var(--pile)));
--band-here: calc(var(--band-tail) + (1 - var(--tier)) * (var(--band-focus) - var(--band-tail)));
```

`--tier` is 0 on the focused card and 1 on every other card, so `--band-here` is `--band-focus` on
exactly one of them and `--band-tail` on the rest — which is also why the exposed card needs no class
of its own. `max(a - b, b - a)` is `abs(a - b)` without `abs()`, which is still not safe to lean on
everywhere.

⚠️ **The band is the one thing in this deck that MOVES LAYOUT — and layout moving moves hit
regions.** That is why the focus is never set from hover: only a wheel flick, a touch drag or the
keyboard changes it. See [Stepping](#stepping--wheel-drag-and-keyboard) below.

⚠️ **The bands are LENGTHS in deck-height units, and that is the point of them.** They used to be a
percentage pair, because the card's height came only from its width and the page scrolled; here the
deck height is the master constraint, so the bands are stated against it. `--band-tail` is literally
the leftover space divided by the number of cards — `(deck height − band-focus) / (count − 1)`, with
`--count` written by `fan.js` from the project list and floored at 2, because the CSS divides by
`count − 1`. Add a project and every band gets thinner on its own; nothing else changes.

⚠️ **`--band-focus` must stay shorter than the card itself.** Past that point `margin-block-end` goes
**positive** and the pile grows a gap. The card is only 5/7 of a narrow column, so this bites on
portrait windows — which is what the `@media (max-aspect-ratio: 3/5)` rule at the foot of `fan.css` is
for, dropping `--focus-frac` from 0.42 to 0.28. It cannot be handled by a `min()` cap on the band: a
percentage inside a custom property resolves against the **width** in a margin and against the
**height** in an inset, so one capped value cannot serve both.

Paint order is set once at build (`z-index` = `index + 1`), so **card 2 sits over card 1, card 3
over card 2** — the reference's own behaviour, where its index items carry no `z-index` at all and
document order decides. Because each card is pulled _up_ over the previous one, painting the later
card on top is what leaves a covered card's **top** band showing. That ordering is deliberately
_not_ updated as you move around: re-stacking would flip every visible band to the cards'
**bottoms** and the pile would stop reading as a pile.

That is what `--label-anchor` is for. The covered strip is the card's own overlap tall, so the
bottom-anchored type is lifted clear of it rather than pinned flush to the card's edge, which would
put it underneath the next card. It is `100% - --band-here + --label-gap`, declared **once** on
`.fan__card` and inherited by all five labels — and the two contexts differ on purpose: in
`inset-block-end` a percentage resolves against the containing block's **block** size, which is the
card's full height, so `100% - band` _is_ the strip the next card paints over. `subtitle` and `year`
sit on the top band, which is the part a covered card leaves showing.

Both parts of the type scale with the band — `--label-gap` is `clamp(4px, band × 0.16, 1.1rem)` and
the title's font size is `clamp(0.72rem, band × 0.38, 1.5rem)` — which makes clearance **structural**
rather than tuned: clearance is `band − gap − type` ≈ `0.46 × band`, so it stays positive at any
density. It used to be a viewport clamp, and that is exactly how it came to be negative on large
screens and the first thing to break after any geometry change.

### Stepping — wheel, drag and keyboard

One card per gesture, from three sources, all funnelling into the same `setActive()`:

- **Wheel / trackpad.** Latched rather than free-running, because the two devices look nothing alike:
  a mouse sends one ~100px event per notch, while a trackpad sends a long tail of small deltas with
  momentum behind them, and with no latch one flick would run through the whole deck. The latch is
  released by a **gap in the stream** (`WHEEL_IDLE_MS`), not by a fixed cooldown, so a gesture is
  defined by what the finger does rather than by how long the animation happens to take. Wheels with
  `ctrlKey` are a pinch-zoom and are left to the browser, horizontal deltas are ignored, and the
  vertical is swallowed even below the threshold so the browser cannot start a pull-to-refresh or a
  swipe-back.
- **Touch drag.** `pointerdown/move/up` with a pixel threshold, mouse pointers ignored, one step per
  drag, and the click that ends a drag is swallowed in the **capture** phase on `.fan` so a drag never
  opens a project. `.page--home` is `touch-action: pinch-zoom`: both pan axes belong to the deck, and
  naming `pinch-zoom` keeps pinch-to-zoom working instead of taking that away along with the pans.
- **Keyboard.** `↑`/`↓`/`←`/`→`/`PageUp`/`PageDown`/`Home`/`End`, wrapping at both ends. Tabbing into
  a card flips the deck to it as well, and moves `active` with it so the live region cannot name a
  different project from the one the deck is showing.

`--dur-fan` is 1000ms on a decelerating ease with **no overshoot** (the reference's own curve was a
spring that settles back; over a full-length travel that reads as a wobble). The band animates on the
same clock, but only while a step is in flight — `.fan--stepping`, armed by JS for the length of a
step. Left on permanently it would also fire on every window resize, since a resize re-solves every
band at once, and the deck would visibly trail the window by up to a second.

The deck was an ordinary scrolling document before this — no fixed aperture, no wheel handling — and
a nav that could not hijack the scroll was the point of it. It is now the opposite by design. (The
much older nav was a fixed-aperture `rotateX` "flip column" with Step and Scroll modes; that
geometry, the mode switch and `nav.mode` in `content/site.js` are still gone.)

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

| class               | cards                                       | its angle                      |
| ------------------- | ------------------------------------------- | ------------------------------ |
| `fan__item--after`  | every card _after_ the focus                | the ramp — 24°, 34°, 44°, 45°… |
| `fan__item--before` | the focused card _and_ every card before it | one flat `--tilt-back` — 25°   |

Every card therefore keeps its full width along its **top** edge and narrows downward. What differs is
how hard it narrows, and there the two classes do something counter-intuitive:

| class             | angle             | projection                   | taper (top → bottom, 1280×900) | projected height |
| ----------------- | ----------------- | ---------------------------- | ------------------------------ | ---------------- |
| `--after` at 24°  | the smaller angle | short — `--persp`, 410px     | 1152 → 634 (**45%**)           | 414px            |
| `--after` at 45°  | the ramp's cap    | short — `--persp`, 410px     | 1152 → 476 (**59%**)           | 240px            |
| `--before` at 25° | the larger angle  | long — `--persp-back`, 200vw | 1152 → 1014 (**12%**)          | 657px            |

**A bigger angle under a longer projection tapers LESS.** `--persp-back: 200vw` is what turns the 25°
near side into by far the gentler of the two, so do not read the degrees as how tilted a card looks.
Because that projection is a multiple of `vw`, the taper holds the same fraction of the card at every
width, so the near side reads the same from phone to desktop.

The ramp side is `--tilt-focus + --rel × --tilt-step` (with `--rel` = `--pile − --focus`), capped at
`--tilt-max`, counted from the focus — so `14°, 24°, 34°, 44°, 45°…` at the current settings; where
the stack is short the cap is 22° instead (see the media queries at the bottom of `fan.css`). The near
side is the flat `--tilt-back`.

So the deck reads as **the focused card and the cards above it leaning forward gently, with the cards
below fanning away more steeply.** At rest the focus is the front card, so the deck settles at
`25, 24, 34, 44, 45, 45, 45`; step to card 3 and it re-ramps to `25, 25, 25, 25, 24, 34, 44`; step to
the last card and everything from the front down to it sits at `25`.

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
- **The focus is only ever set by a deliberate gesture, and that gate is load-bearing.** An earlier
  attempt followed the pointer with `pointerover` and had to be abandoned: a **stationary pointer
  walked the focus from card 4 to card 6 unaided**, because a focus change re-geometries the deck
  under the cursor and `pointerover` fires again when the element beneath the pointer changes. The
  band is LAYOUT, so a band change is the one thing here that DOES move hit regions — which is why
  hover no longer sets the focus at all. The wheel, a drag and the keyboard do, and all three step by
  exactly one. Re-verified: `--focus` holds for over a second with the pointer parked inside the
  exposed card's band, and a wheel flick then moves it one card and holds.
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

Hovering a card accents its name, fades in the reference's **"→" badge** (`.fan__go`, a filled disc
that scales `0.33 → 1` over 600ms) and thickens its hairline. `category` is inset to leave the badge
room, so it does not shift when the badge appears.

That is all hover does **by default**. The peel — the pile opening below the card you point at — is a
**preference, off unless it is switched on** from the menu panel:

```text
Fan the pile on hover
Point at a card to open the ones below it
```

The switch is a `<button role="switch">` in the popover, and it is the one place that knows about the
deck's styling: its state is `data-peel` on the root element, remembered in `localStorage` (a
_setting_, unlike the deck's `nav:last` _position_), and the deck picks it up in CSS — so nothing has
to pass it around and the toggle keeps working whether or not the deck is mounted. Turning it on is
also applied before the deck's first paint, because `mountMenu()` runs before `render()` in `main.js`.

Off is the default because the deck's job is to be **stepped** — the scroll, the drag and the arrow
keys each move it exactly one card — and a pile that shifts a little every time the pointer crosses a
card competes with that.

Switched on, the peel is **CSS-only and one-way**. Pointing at a card sets `--fan-y` on the cards
_after_ it:

```css
[data-peel="on"] .fan__item:has(.fan__card:hover) ~ .fan__item .fan__flip {
  --fan-y: var(--fan-spread);
}
```

That is the reference's own mechanism — `.ListView_item:hover ~ .ListView_item { translate3d(0,
12.4rem, 0) }` — and it buys two things the previous JS index could not.

The push is **one-way**: the pointed-at card and every card _above_ it stay exactly where they are,
and only the tail below opens, so the gesture reads as the card under the pointer peeling open at its
bottom edge. Measured at 1280×900 hovering card 2, card tops move `0, 0, 0, +18, +18, +18, +18` —
the spread and nothing else. It runs on the deck's own 1000ms `--ease-fan`, and it never moves the
deck: pointing at a card changes nothing about the focus, and so nothing about the exposed band.

Because the movement is uniform rather than cumulative, the deck's overhang is capped at one
`--fan-spread` instead of `(n − 1) × spread`. Both peel rules are gated on `[data-peel="on"]`; the
`:hover` one also sits inside `@media (hover: hover)`, exactly as the reference's does, so a stuck
`:hover` on a touch device cannot leave the deck hanging open — and the `:focus-visible` one is
deliberately _outside_ that query, because a touch device still has a keyboard.

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
--count              how many cards the deck has to fit. JS-written; the CSS fallback is 7
--deck-top           the inset that clears the fixed site bar
--deck-h             what the pile must fill — 100svh minus that inset and the bottom safe area
--focus-frac         the exposed card's share of the deck. Lowered on portrait windows
--band-focus         ← derived: --deck-h × --focus-frac
--band-tail          ← derived: the leftover divided by --count - 1
--band-here          ← derived per card: whichever of those two this card is showing
--label-gap          the gap above the seam, as a fraction of the band
--label-anchor       ← derived: where the bottom-anchored type sits, NOT 0
--fan-spread         how far the tail opens on hover — a fraction of a band, see below
--dur-fan            the deck's transition duration (1000ms)
--ease-fan           the deck's easing — decelerating, no overshoot
--rake               0 = flat (the reference). 1 = the raked deck. A FACTOR, not an angle
--tilt-focus         where the tail ramp starts, on the card after the focus
--tilt-step          how much further forward each card after the focus leans
--tilt-max           the ramp's cap
--tilt-min           the ramp clamp's floor — inert at its current value
--tilt-back          the near side's lean (focused card + every card above it). 25° FORWARD —
                     the name is stale, it has not leaned back since that was reversed
--focus              which card the deck is built around; JS-written
--persp              projection depth for the TAIL ramp. SHORT on purpose — see above
--persp-back         projection depth for the NEAR side. LONG on purpose — it is what softens
                     that 25° down to a 12% taper
--persp-origin       the vanishing point; keep it at the card's TOP EDGE
```

All of them live at the top of `fan.css`. The JS-set values are `--pile` (the card's fixed position
in the pile), `--count` (how many cards the deck must fit), `--focus` (which card the deck is built
around — written only by `setFocus`, from a wheel flick, a drag, the keyboard or a tab), the two tilt
classes derived from it, and the `z-index` paint order; the fan's `--fan-y` is set by the sibling
rules in `fan.css`.

⚠️ **`--fan-spread` is tied to a band, not to the viewport, and it has to be.** In a scrolling
document, pushing the tail down merely made the page taller; here the aperture clips, so the peel is
bounded by what the frame can afford — and the binding constraint is the **last** card, whose band
ends exactly on the fold and whose name therefore has only a little room below it. Measured headroom
between the last label's projected bottom and the fold, as a fraction of a band: 0.44–0.48 on desktop
(37px at an 81px band, 58px at 133px) but only 0.24 on a short landscape phone (9px at a 38px band),
because the tail rake is much shallower there and compresses the label less. `0.22` clears all of
them. A larger peel pushes the last card's name through the fold and cuts it in half. **It is inert
unless the peel switch is on** (see [Hover](#hover-keyboard-and-the-front-card)), which is also the
only reason the deck's default state is completely still.

Verified with `--rake: 1` and 7 cards at ten viewports — **nothing scrolls and nothing overflows at
any size**. `bands` is what the pile's bands add up to against `--deck-h`, which is the invariant all
of this rests on; `clearance` is the tightest gap between a card's overlaid name and the seam that
covers it:

| Viewport  | Card (layout) | Exposed | Tail  | Bands / deck | Clearance |
| --------- | ------------- | ------- | ----- | ------------ | --------- |
| 2560×1440 | 2432×1737     | 578px   | 133px | 1376 / 1376  | 32px      |
| 1920×1080 | 1792×1280     | 427px   | 98px  | 1015 / 1016  | 26px      |
| 1440×900  | 1312×937      | 351px   | 81px  | 837 / 836    | 21px      |
| 1280×900  | 1152×823      | 351px   | 81px  | 837 / 836    | 22px      |
| 1024×768  | 922×658       | 296px   | 68px  | 704 / 704    | 18px      |
| 768×1024  | 691×494       | 403px   | 93px  | 961 / 960    | 27px      |
| 390×844   | 351×251       | 218px   | 94px  | 782 / 780    | 23px      |
| 320×568   | 288×206       | 141px   | 60px  | 501 / 504    | 13px      |
| 844×390   | 760×543       | 98px    | 38px  | 326 / 326    | 8px       |
| 640×360   | 576×411       | 89px    | 35px  | 299 / 296    | 7px       |

The bands are a pixel or two off `--deck-h` at some sizes, because each one is laid out rounded to a
whole pixel; the pile still ends exactly on the fold.

`clearance` is how far the bottom-anchored type sits above the next card's top edge, and it has to
stay positive on every card but the last. **It used to be the first thing to break** — it was negative
at 1920 and 2560 before `--persp-origin` moved to the top edge — so it is still worth re-checking
after any change to `--focus-frac`, `--label-gap`, the title's size or `--persp-origin`. It is far
harder to break now that both the gap and the type are fractions of the band, but **`--focus-frac` has
taken its place as the sharp edge**: a band taller than the card puts `margin-block-end` above zero
and the pile grows a gap. `marginBlockEnd > 0` on any card is the tell, and it is the first check to
run.

**The count is the other axis to sweep.** The deck is sized for however many projects exist, so the
case that matters is the most it should ever have to hold. At 1280×900 ten cards read `351 + 9 × 54`
(exposed + tail), bands summing to 837 with a 12px minimum clearance, and the pile still ends on the
fold — and because the total is an invariant, that holds at **any** focus: at focus 4 the bands are
`54, 54, 54, 54, 351, 54, 54, 54, 54, 54`; at focus 9 the exposed band is the last card's. To check it,
clone three `<li>`s, renumber `--pile` on all of them and set `--count: 10` — overriding the count
alone will _not_ fill the frame, because with seven cards in the DOM the pile is legitimately shorter
than the deck.

Four traps when re-verifying interactively. **The fan is a CSS transition, so it does not advance
while the page is not visible** — a probe on a background tab reads the transform as the identity
matrix even though `--fan-y` is correctly set on the tail; inject `* { transition: none !important }`.
**Make sure the fan is not engaged before calling a reading "resting"** — any `:hover` or
`:focus-visible` on a card pushes every card after it down by `--fan-spread` (18px at 900 tall, and
only when the peel switch is on), which inflates label clearance by exactly that much. The deck now
fills the whole window, so there is no "off the deck" left to park the pointer in — park it on the
**sitebar** instead, and do **not** "press Home" to force the resting focus, because focusing a card
engages the fan. **Setting `--focus`
by hand only moves the BAND** — the tilt lives in the two classes, and only `setFocus()` writes both,
so a probe that pokes the CSS variable shows the deck re-tiered while every card keeps its old tilt.
And **measure the card or the `.fan__flip`, never the `<li>`** — the fan is a transform on a child, so
the `<li>`'s rect never moves: a hover check against it reports a false all-zeros, and a clearance
measured against it silently loses the peel.

### Three traps worth knowing before you touch this

**The `.fan__scrim` ramps are measured against `--band-here` — the strip a card actually leaves
showing — never against the overlap.** The band is the layout unit, so the ramp reads it straight
rather than deriving it; the stops stay behind a `max()` so that a band at or below zero cannot put
them in reverse order and invert the gradient.

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
