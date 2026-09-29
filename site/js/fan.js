/* ============================================================================
 * fan.js — the portfolio nav: a FLAT STACKED DECK.
 *
 * Cards overlap in a single column like a pile of prints. Each card stays
 * readable at its bottom edge, the card in front covers the ones behind it, and
 * the deck fans open around whichever card you point at. All of that geometry is
 * CSS — see fan.css.
 *
 * There is no 3D and no nested scroller here: the deck sits in ordinary document
 * flow and the PAGE scrolls, so nothing in this file can hijack the scroll the
 * way the old fixed-aperture column had to in order to step one folder at a time.
 *
 * This file owns two things:
 *   active     the card the keyboard cursor is on and the live region announces.
 *              Moves with arrows / Home / End, and is restored for the session.
 *   fanIndex   which card the deck fans out from — the pointer wins while it is
 *              over the deck, otherwise it follows `active`. Written to CSS as --i.
 *
 * Geometry contract with fan.css — JS sets only these:
 *   --i    signed relative index (index - fanIndex); 0 for the card being fanned around
 *   z-index  set once at build; earlier cards paint over later ones, which is what
 *            keeps the visible band of a covered card its BOTTOM edge
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
  let fanIndex = active; // which card the deck fans out from — see layout()
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
    );

    const li = el("li", { class: "fan__item", dataset: { index: String(i) } }, el("div", { class: "fan__flip" }, link));

    /* Static paint order: card 1 over card 2 over card 3 … so every covered card
     * keeps its bottom --step band showing. Deliberately NOT updated when the
     * front card changes — re-stacking would flip the visible bands to the
     * cards' TOPS and the pile would stop reading as a pile. */
    li.style.zIndex = String(ordered.length - i);

    /* Depth, and deliberately NOT focus-relative. --pile is this card's fixed place
     * in the pile, so its rake and its dimming never change. Keying them to --i
     * instead made the whole deck stand upright the moment the pointer reached a
     * card near the bottom — the depth vanished exactly when it was being used, and
     * the re-geometry could slide a card out from under the cursor. */
    li.style.setProperty("--pile", String(i));

    fan.append(li);
    return li;
  });

  const status = el("div", { class: "sr-only", role: "status", "aria-live": "polite" });

  view.append(fan, status);

  /* ------------------------------------------------------------- geometry -- */

  /* --i is only ever a nudge (see .fan__flip): the pile's positions are LAYOUT,
   * so re-fanning a card costs no reflow and — because a transform cannot change
   * the flow box — the deck never grows a gap at its end. */
  const layout = () => {
    items.forEach((item, i) => item.style.setProperty("--i", String(i - fanIndex)));
  };

  const setFanIndex = (i) => {
    if (i === fanIndex) return;
    fanIndex = i;
    layout();
  };

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

    if (moved) {
      remember();
      announceSoon();
    }

    /* The deck re-centres on the keyboard cursor only while the pointer is away
     * from the deck — otherwise the mouse would fight the arrow keys. */
    if (!fan.matches(":hover")) setFanIndex(active);

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

  /* --------------------------------------------------------------- hover --- */

  /* The pointer decides which card the deck fans out from. There is no timer and
   * no layout work: --i only feeds a transform, so this is a compositor-only
   * change and the transform transition in fan.css does the smoothing. */
  fan.addEventListener("pointerover", (e) => {
    const item = e.target.closest?.(".fan__item");
    const i = item ? items.indexOf(item) : -1;
    if (i >= 0) setFanIndex(i);
  });

  /* Pointer away: close the fan back onto the keyboard cursor. */
  fan.addEventListener("pointerleave", () => setFanIndex(active));

  /* --------------------------------------------------------------- boot ---- */

  container.append(view);

  layout();
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
