/* ============================================================================
 * fan.js — the portfolio nav: a fixed, flip-through stacked deck.
 *
 * Cards overlap in a single column like a pile of prints. Each card pulls the next
 * one up by its own band, so a covered card keeps only its top band showing — and
 * that band is where its own name and category are painted. All of the geometry is
 * CSS — see fan.css.
 *
 * THE DECK IS A FIXED APERTURE. `.page--home` is `position: fixed; inset: 0;
 * overflow: hidden`, and the bands are sized so the pile is exactly as tall as the
 * window — so nothing here scrolls, and nothing here has to make anything scroll.
 * That is why there is no scroll syncing, no IntersectionObserver and no
 * measurement: the only thing a gesture changes is WHICH CARD the deck is built
 * around.
 *
 * This file owns two things:
 *   active   the card the keyboard cursor is on and the live region announces.
 *            Moves with the wheel, with a touch drag, or with the arrow / Home / End
 *            keys — one card per gesture — and is restored for the session. The wheel
 *            is listened for on the WINDOW while this view is mounted, so a scroll
 *            steps the deck no matter what the pointer happens to be over.
 *   --focus  which card the deck is built around, written by the same setFocus()
 *            call that moves `active`. The BAND (which card is exposed), the two
 *            tilt classes and every type metric in fan.css read it.
 *
 * THE FAN IS NOT HERE. It used to be: a `fanIndex` that followed the pointer and
 * wrote a signed `--i`, which CSS turned into a transform. It is now two sibling
 * rules in fan.css, which is the reference's own mechanism
 * (`.ListView_item:hover ~ .ListView_item`). That buys two things a JS index could
 * not: the push is one-way — only the cards AFTER the one under the pointer move —
 * and the whole gesture runs off a single CSS transition, so the easing is applied
 * by the compositor instead of being restarted by every pointerover.
 *
 * HOVER DOES NOT MOVE THE DECK. It never sets --focus, and by default it does not move a
 * card either: the flip belongs to the wheel, a drag and the keyboard. Pointing at a card
 * still accents it and fades in the "->" badge, both of which are CSS. The one thing that
 * COULD move cards on hover — the peel that opens the pile below the pointer — is a
 * preference owned by the menu panel and off unless switched on; see `[data-peel]` in
 * fan.css. This file does not read it.
 *
 * Geometry contract with fan.css — JS sets these:
 *   --pile   the card's FIXED place in the pile — its index, set once at build.
 *   --count  how many cards the deck has to fit. Read by the band arithmetic.
 *   --focus  which card the deck is built around, and therefore which one is EXPOSED.
 *            Written by setFocus() and nowhere else.
 *   class    `fan__item--after` / `fan__item--before` on every card, derived from
 *            --focus in the same call: the two tilts, forward on the cards after the
 *            focus and a deeper forward lean on the focused card and the cards
 *            before it.
 *   z-index  set once at build; LATER cards paint over EARLIER ones, which is what
 *            keeps the visible band of a covered card its TOP edge.
 * ========================================================================== */

import { el, asset } from "./util.js";
import { ordered } from "../content/projects.js";

const LAST_KEY = "nav:last";

const read = (key) => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null; // private mode / storage disabled
  }
};

const write = (key, value) => {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* storage unavailable — harmless */
  }
};

export function mountHome(container) {
  const restored = ordered.findIndex((p) => p.id === read(LAST_KEY));
  let active = restored >= 0 ? restored : 0;
  let announceTimer = 0;
  let bandTimer = 0;

  const view = el("section", { class: "page page--home" });

  /* The heading is for the document outline and a screen reader only now. The deck is
   * the whole visual design — the title row, the project count and the placeholder
   * chip that used to sit above it are gone. */
  const heading = el("h1", { class: "sr-only" }, "Selected works");

  const fan = el("ul", { class: "fan", "aria-label": "Projects" });

  const items = ordered.map((p, i) => {
    const link = el(
      "a",
      { class: "fan__card", href: `/project/${p.id}` },
      el(
        "span",
        { class: "fan__thumb" },
        el("img", {
          src: asset(p.hero.src),
          alt: "", // the card's own title names the link — a real alt would double-read
          width: 1200,
          height: 800,
          loading: i < 2 ? "eager" : "lazy",
          decoding: "async",
        }),
      ),
      /* One gradient, two jobs: legibility for the overlaid type, and the soft
       * bottom edge that makes the next card look like it slides out from under
       * this one. See .fan__scrim in fan.css. */
      el("span", { class: "fan__scrim", "aria-hidden": "true" }),
      /* The top band only ever shows on the front card, so these two are decoration. */
      el("span", { class: "fan__tag", "aria-hidden": "true" }, p.subtitle),
      el("span", { class: "fan__year", "aria-hidden": "true" }, p.year),
      el("span", { class: "fan__title" }, p.name),
      el("span", { class: "fan__cat", "aria-hidden": "true" }, p.category),
      /* the reference's hover badge — see .fan__go in fan.css */
      el("span", { class: "fan__go", "aria-hidden": "true" }, "→"),
    );

    const li = el("li", { class: "fan__item", dataset: { index: String(i) } }, el("div", { class: "fan__flip" }, link));

    /* Static paint order: card 2 over card 1, card 3 over card 2 … Because each
     * card is pulled UP over the one before it, painting the LATER card on top is
     * what leaves a covered card's TOP band showing. That is the reference's own
     * behaviour — its index items carry no z-index at all and document order
     * decides. Deliberately NOT updated when the front card changes: re-stacking
     * would flip every visible band to the cards' BOTTOMS and the pile would stop
     * reading as a pile. */
    li.style.zIndex = String(i + 1);

    /* --pile is this card's fixed place in the pile — the CSS half of the ramp
     * needs it alongside `--focus`, which is written further down. */
    li.style.setProperty("--pile", String(i));

    fan.append(li);
    return li;
  });

  /* How many cards the deck has to fit. fan.css divides by `--count - 1`, so a
   * one-project list would divide by zero and take the whole pile's geometry down with
   * it — hence the floor of 2. */
  fan.style.setProperty("--count", String(Math.max(2, items.length)));

  const status = el("div", { class: "sr-only", role: "status", "aria-live": "polite" });

  view.append(heading, fan, status);

  /* WHICH CARD THE DECK IS BUILT AROUND. Two things read it, and this is the only
   * place either of them changes:
   *   - the BAND, through `--focus` in fan.css: whichever card is focused is the
   *     EXPOSED one and every other card is drawn up tight. The pile's total height
   *     does not change with it — the bands are sized so their sum lands on the deck
   *     height at any focus — so this simply moves the big band down the pile;
   *   - the TILT, through one of the two classes, because a named class is easier to
   *     tune than a branch inside a single calc().
   * The guard earns its keep: a wheel flick arrives as dozens of events, and
   * rewriting every card's class list on each of them would be wasteful. */
  let focus = -1; /* -1, so the first call always applies */

  /* The BAND is layout, so it cannot be animated off the compositor the way the
   * transforms on .fan__flip are. Its transition therefore lives behind `.fan--stepping`
   * in fan.css and is armed for the length of a step. Arming it per step is what keeps a
   * window resize out: a resize re-solves every band at once, and animating that would
   * make the deck trail the window by a second. Slightly longer than the CSS duration,
   * so the class is still on for the last frame of the move. */
  const armBandTransition = () => {
    fan.classList.add("fan--stepping");
    clearTimeout(bandTimer);
    bandTimer = setTimeout(() => fan.classList.remove("fan--stepping"), 1100);
  };

  const setFocus = (i) => {
    if (i === focus) return;
    const opening = focus < 0; /* the very first call is the deck's opening geometry */
    focus = i;

    /* A focus change is the ONLY thing in the deck that moves a band — and the opening
     * one is not a change at all, so it is not animated. */
    if (!opening) armBandTransition();
    fan.style.setProperty("--focus", String(i));
    items.forEach((li, n) => {
      li.classList.toggle("fan__item--after", n > i);
      li.classList.toggle("fan__item--before", n <= i);
    });
  };

  /* --------------------------------------------------------------- status -- */

  const announce = () => {
    const p = ordered[active];
    status.textContent = `${p.name}, ${p.id}, ${active + 1} of ${items.length}`;
  };

  const remember = () => write(LAST_KEY, ordered[active].id);

  /* The live region is debounced: a held arrow key crosses several cards, and
   * announcing each one would read the whole list aloud. */
  const announceSoon = () => {
    clearTimeout(announceTimer);
    announceTimer = setTimeout(announce, 180);
  };

  const setActive = (i, { focus = false } = {}) => {
    const next = (i + items.length) % items.length;
    const moved = next !== active;

    active = next;
    /* The exposed card follows `active`, so the deck re-ramps itself around whatever
     * step just happened. */
    setFocus(active);

    if (moved) {
      remember();
      announceSoon();
    }

    /* `preventScroll` because the deck is a fixed aperture: the card is on screen by
     * construction, so there is nothing to bring into view. The old `scrollIntoView()`
     * that lived here went with the scrolling document. */
    if (focus) items[active].querySelector("a").focus({ preventScroll: true });
  };

  /* ------------------------------------------------------------ keyboard --- */

  fan.addEventListener("keydown", (e) => {
    if (e.key === "Home") {
      e.preventDefault();
      return setActive(0, { focus: true });
    }
    if (e.key === "End") {
      e.preventDefault();
      return setActive(items.length - 1, { focus: true });
    }

    /* The deck runs vertically, so the horizontal arrows are accepted too — the
     * reference's own index reads as a left-to-right fan of a vertical pile. */
    const forward = e.key === "ArrowDown" || e.key === "ArrowRight" || e.key === "PageDown";
    const back = e.key === "ArrowUp" || e.key === "ArrowLeft" || e.key === "PageUp";
    if (!forward && !back) return;

    e.preventDefault();
    setActive(active + (forward ? 1 : -1), { focus: true });
  });

  /* ------------------------------------------------------------- stepping --- */

  /* ONE CARD PER GESTURE, from the wheel and from a touch drag alike; the keyboard's
   * one-step-per-keypress path is above.
   *
   * The wheel is LATCHED rather than free-running, because the two devices look
   * nothing alike. A mouse sends one ~100px event per notch; a trackpad sends a long
   * tail of small deltas with momentum behind them, so with no latch a single flick
   * would run through the entire deck. The latch is released by a GAP in the stream
   * rather than by a fixed cooldown, so a gesture is defined by what the finger does
   * instead of by how long the animation happens to take. */
  const WHEEL_STEP_PX = 24;
  const WHEEL_IDLE_MS = 140;
  const DRAG_STEP_PX = 40;

  let wheelAcc = 0;
  let wheelLatched = false;
  let wheelIdleTimer = 0;

  const step = (dir) => setActive(active + dir);

  /* The menu popover is a sibling of the header, not part of this view. */
  const menuPanel = () => document.getElementById("menuPanel");

  const onWheel = (e) => {
    /* A trackpad pinch arrives as a wheel event with ctrlKey set. That is a zoom, not
     * a flip, so it is left to the browser. */
    if (e.ctrlKey) return;

    /* Two fingers sideways are not ours either. */
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;

    /* While the menu is up it owns the pointer, so the deck does not flip behind it. */
    if (menuPanel()?.dataset.open === "true") return;

    /* Swallowed even below the threshold and while latched: the deck owns the vertical
     * axis for the whole view, and letting an unhandled wheel through would let the
     * browser start a pull-to-refresh or a swipe-back on a page that cannot scroll. */
    e.preventDefault();

    const delta = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY; /* deltaMode 1 = lines */
    wheelAcc += delta;

    clearTimeout(wheelIdleTimer);
    wheelIdleTimer = setTimeout(() => {
      wheelLatched = false; /* the gesture is over: the next one may step again */
      /* The RESIDUE is carried rather than thrown away, and capped at one step short. A
       * slow two-finger scroll is a stream of small deltas with pauses in it, so zeroing
       * the total at every pause means a gentle scroll never reaches the threshold and
       * the deck does not move at all. The cap is what stops a flick's leftover MOMENTUM
       * from arming an extra step the moment the latch releases. */
      wheelAcc = Math.sign(wheelAcc) * Math.min(Math.abs(wheelAcc), WHEEL_STEP_PX - 1);
    }, WHEEL_IDLE_MS);

    if (wheelLatched || Math.abs(wheelAcc) < WHEEL_STEP_PX) return;

    wheelLatched = true;
    wheelAcc = 0;
    step(Math.sign(delta));
  };

  /* ON THE WINDOW, NOT ON THE DECK. The deck has to own the vertical axis for the whole
   * view, and the pointer spends much of its time somewhere the deck is not — over the
   * site bar's brand or its menu button, or in the strip above the pile — none of which
   * are inside `.fan`, so a listener there never fired for them and a scroll in those
   * places did nothing. The listener is scoped to this view's lifetime by destroy(), so
   * every other route keeps its own scrolling.
   * `passive: false` is required — a passive listener may not preventDefault. */
  window.addEventListener("wheel", onWheel, { passive: false });

  /* A drag steps the deck ONCE, in the direction of the drag, and the release must not
   * then follow the card's link: a finger that dragged the deck has not asked to open a
   * project. Mouse drags are ignored — a mouse has the wheel. */
  let dragFrom = null;
  let dragUsed = false;
  let swallowClick = false;

  const onPointerDown = (e) => {
    if (e.pointerType === "mouse" || !e.isPrimary) return;
    dragFrom = e.clientY;
    dragUsed = false;
    swallowClick = false; /* start each gesture clean */
  };

  const onPointerMove = (e) => {
    /* `isPrimary` also excludes the second finger of a pinch. */
    if (dragFrom === null || dragUsed || !e.isPrimary) return;

    const dy = e.clientY - dragFrom;
    if (Math.abs(dy) < DRAG_STEP_PX) return;

    dragUsed = true;
    swallowClick = true;
    step(dy < 0 ? 1 : -1); /* drag up = the next card, as the wheel does */
  };

  const onPointerUp = () => {
    dragFrom = null;
  };

  /* Capture phase, so the router's document-level link interception never sees the
   * click that ends a drag. */
  const onClickCapture = (e) => {
    if (!swallowClick) return;
    swallowClick = false;
    e.preventDefault();
    e.stopPropagation();
  };

  fan.addEventListener("pointerdown", onPointerDown);
  fan.addEventListener("pointermove", onPointerMove);
  fan.addEventListener("pointerup", onPointerUp);
  fan.addEventListener("pointercancel", onPointerUp);
  fan.addEventListener("click", onClickCapture, true);

  /* --------------------------------------------------------------- focus --- */

  /* Tabbing into a card flips the deck to it, exactly as a step does — and it moves
   * `active` too, so the live region and the exposed card cannot disagree about which
   * project the deck is on.
   *
   * This is now the ONLY thing besides a gesture that writes --focus. Pointing at a
   * card deliberately does not: the band is layout, so a hover-driven focus could move
   * a hit region under a stationary pointer, and an earlier pointer-following build had
   * to be abandoned for exactly that reason. */
  fan.addEventListener("focusin", (e) => {
    const item = e.target.closest?.(".fan__item");
    if (item) setActive(items.indexOf(item));
  });

  /* --------------------------------------------------------------- boot ---- */

  /* Build the deck around the card the keyboard cursor is already on, so the first
   * paint and the live region agree. A mouse-only visitor never writes `nav:last`, so
   * for them this is card 0 and the deck opens on the front card. */
  container.append(view);

  setFocus(active);
  announce();

  /* Listeners live on `fan`, inside `view`, so the router discards them with the
   * subtree when it swaps views. Only the timers need clearing. */
  return {
    title: "Millingen Architects — Selected works",
    destroy() {
      window.removeEventListener("wheel", onWheel);
      clearTimeout(announceTimer);
      clearTimeout(wheelIdleTimer);
      clearTimeout(bandTimer);
    },
  };
}
