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
 * Geometry contract with fan.css — JS sets only these:
 *   --pile   the card's FIXED place in the pile. Drives the rake, and only while
 *            `--rake` is non-zero.
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

    /* The rake's input, and deliberately NOT focus-relative. --pile is this card's
     * fixed place in the pile, so its rake never changes. Deriving the rake from the
     * focus instead is unstable: un-rakening a card re-geometries the deck while the
     * pointer is over it, and measured, a stationary pointer walked the focus from
     * card 4 to card 6 unaided. Keep the rake positional. */
    li.style.setProperty("--pile", String(i));

    fan.append(li);
    return li;
  });

  const status = el("div", { class: "sr-only", role: "status", "aria-live": "polite" });

  view.append(fan, status);

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

  /* --------------------------------------------------------------- boot ---- */

  container.append(view);

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
