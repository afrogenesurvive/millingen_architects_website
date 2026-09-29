/* ============================================================================
 * fan.js — the portfolio nav: a FULL-BLEED STACKED DECK.
 *
 * Cards overlap in a single column like a pile of prints. Each card pulls the next
 * one up by --overlap, so a covered card keeps only its top band showing — and
 * that band is where its own name and category are painted. All of the geometry is
 * CSS — see fan.css.
 *
 * The deck sits in ordinary document flow and the PAGE scrolls, so nothing in this
 * file can hijack the scroll the way the old fixed-aperture column had to in order
 * to step one folder at a time.
 *
 * This file owns ONE thing now:
 *   active   the card the keyboard cursor is on and the live region announces.
 *            Moves with arrows / Home / End, and is restored for the session.
 *
 * THE FAN IS NOT HERE ANY MORE. It used to be: a `fanIndex` that followed the
 * pointer and wrote a signed `--i`, which CSS turned into a transform. It is now
 * two sibling rules in fan.css, which is the reference's own mechanism
 * (`.ListView_item:hover ~ .ListView_item`). That buys two things a JS index could
 * not: the push is one-way — only the cards AFTER the one under the pointer move —
 * and the whole gesture runs off a single CSS transition, so the spring easing is
 * applied by the compositor instead of being restarted by every pointerover.
 *
 * The one piece of pointer state that IS still here is `--focus`, and it is a single
 * index rather than a signed offset: it picks WHICH CARD the deck is built around.
 * See the geometry contract below.
 *
 * Geometry contract with fan.css — JS sets these:
 *   --pile   the card's FIXED place in the pile — its index, set once at build.
 *   --focus  which card the deck is built around. Read by the BAND (the focused card
 *            is the exposed one, every other card is drawn up tight) and by the TILT.
 *            Set on pointermove, by the keyboard cursor, and handed back to the cursor
 *            on pointerleave.
 *   class    `fan__item--after` / `fan__item--before` on every card, derived from
 *            --focus: the two tilts, forward on the cards after the focus and
 *            backward on the focused card and every card before it.
 *   z-index  set once at build; LATER cards paint over EARLIER ones, which is what
 *            keeps the visible band of a covered card its TOP edge.
 * ========================================================================== */

import { el, asset, scrollBehavior } from "./util.js";
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

  const view = el("section", { class: "page page--home" });

  const years = ordered.map((p) => Number(p.year)).filter(Number.isFinite);
  const span = years.length ? `, ${Math.min(...years)} — ${Math.max(...years)}` : "";

  view.append(
    el(
      "div",
      { class: "page__head" },
      el("h1", { class: "page__title" }, "Selected works"),
      el("p", { class: "page__lede" }, `${ordered.length} projects${span}. `, el("span", { class: "chip" }, "Placeholder content")),
    ),
  );

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

  const status = el("div", { class: "sr-only", role: "status", "aria-live": "polite" });

  view.append(fan, status);

  /* WHICH CARD THE DECK IS BUILT AROUND. Two things read it, and this is the only
   * place either of them changes:
   *   - the BAND, through `--focus` in fan.css: the focused card is the exposed one
   *     and every other card is drawn up tight, so focusing mid-pile closes the
   *     deck above the focused card;
   *   - the TILT, through one of the two classes, because a named class is easier to
   *     tune than a branch inside a single calc().
   * The guard earns its keep: pointermove fires continuously, and rewriting seven
   * class lists per event would be wasteful. */
  let focus = -1; /* -1, so the first call always applies */

  const setFocus = (i) => {
    if (i === focus) return;
    focus = i;

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
    /* The keyboard cursor IS a focused card, so moving it re-ramps the deck exactly
     * as pointing at one does. */
    setFocus(active);

    if (moved) {
      remember();
      announceSoon();
    }

    if (focus) {
      items[active].querySelector("a").focus({ preventScroll: true });
      items[active].scrollIntoView({ block: "nearest", behavior: scrollBehavior() });
    }
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

  /* --------------------------------------------------------------- focus --- */

  /* POINTERMOVE, deliberately not pointerover. `pointerover` also fires when the
   * deck re-geometries UNDER a stationary pointer, so a focus change can feed itself
   * — that is how an earlier build let a resting pointer walk the focus from card 4
   * to card 6. `pointermove` cannot fire without real movement, so the loop is closed
   * by construction: park the pointer and the deck stays put however the layout
   * shifts beneath it. */
  fan.addEventListener("pointermove", (e) => {
    const item = e.target.closest?.(".fan__item");
    if (item) setFocus(items.indexOf(item));
  });

  /* Tabbing re-ramps the same way pointing does. */
  fan.addEventListener("focusin", (e) => {
    const item = e.target.closest?.(".fan__item");
    if (item) setFocus(items.indexOf(item));
  });

  /* Pointer away: hand the deck back to the keyboard cursor. Not a hardcoded 0 —
   * `active` is restored from the last session, so 0 would leave the deck built
   * around a different card than the one the live region is announcing. */
  fan.addEventListener("pointerleave", () => setFocus(active));

  /* --------------------------------------------------------------- boot ---- */

  /* Build the deck around the card the keyboard cursor is already on, so the first
   * paint and the live region agree, and a pointer that then leaves the deck is a
   * no-op rather than a rearrangement. A mouse-only visitor never writes `nav:last`,
   * so for them this is card 0 and the deck opens on the front card. */
  container.append(view);

  setFocus(active);
  announce();

  /* Listeners live on `fan`, inside `view`, so the router discards them with the
   * subtree when it swaps views. Only the announcement timer needs clearing. */
  return {
    title: "Millingen Architects — Selected works",
    destroy() {
      clearTimeout(announceTimer);
    },
  };
}
