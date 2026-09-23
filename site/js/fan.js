/* ============================================================================
 * fan.js — the portfolio nav: a VERTICAL flip column.
 *
 * Items are a single column, flipped through about the HORIZONTAL axis (rotateX,
 * done in CSS). This file owns one job: which card is active, and keeping the
 * column scrolled so the active card is centred.
 *
 * Two advancing modes, switchable at runtime (default set by nav.mode in
 * content/site.js):
 *   "snap"   — one folder at a time. Mandatory scroll-snap plus the browser's own
 *              fling gives touch devices momentum that always lands on exactly
 *              one card; wheel and keys step one card at a time.
 *   "scroll" — free scrolling with native momentum; rotation follows position.
 *
 * Geometry contract with fan.css — JS sets only these; all tuning lives in CSS:
 *   --i         signed relative index (index - active); the active card is 0
 *   --a         Math.abs(--i)
 *   data-side   "above" | "below" — picks the transform-origin edge
 *   data-depth  capped distance — drives z-index
 * ========================================================================== */

import { el, asset, reducedMotion } from "./util.js";
import { ordered } from "../content/projects.js";
import { site } from "../content/site.js";

const LAST_KEY = "nav:last";
const MODE_KEY = "nav:mode";
const MODES = ["snap", "scroll"];

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

/** Session override → config default → "snap". */
const initialMode = () => {
  const fromSession = read(MODE_KEY);
  if (MODES.includes(fromSession)) return fromSession;
  const configured = site.nav?.mode;
  if (MODES.includes(configured)) return configured;
  return "snap";
};

export function mountHome(container) {
  const restored = ordered.findIndex((p) => p.id === read(LAST_KEY));
  let active = restored >= 0 ? restored : 0;
  let mode = initialMode();
  let wheelLock = 0; // timestamp of the last wheel step, for gesture debouncing

  const view = el("section", { class: "page page--home" });

  const years = ordered.map((p) => Number(p.year)).filter(Number.isFinite);
  const span = years.length ? `, ${Math.min(...years)} — ${Math.max(...years)}` : "";

  /* --------------------------------------------------- mode toggle (UI) ---- */

  const modeButtons = MODES.map((m) =>
    el(
      "button",
      {
        class: "modes__btn",
        type: "button",
        "aria-pressed": String(m === mode),
        dataset: { modeOption: m },
      },
      m === "snap" ? "Step" : "Scroll"
    )
  );

  const modes = el(
    "div",
    { class: "modes" },
    el("span", { class: "modes__label" }, "Nav"),
    el(
      "div",
      { class: "modes__group", role: "group", "aria-label": "Navigation mode" },
      modeButtons
    )
  );

  view.append(
    el(
      "div",
      { class: "page__head" },
      el("h1", { class: "page__title" }, "Selected works"),
      el(
        "p",
        { class: "page__lede" },
        `${ordered.length} projects${span}. `,
        el("span", { class: "chip" }, "Placeholder content")
      ),
      modes
    )
  );

  const fan = el("ul", {
    class: "fan",
    "aria-label": "Projects",
    dataset: { mode },
  });

  const items = ordered.map((p, i) => {
    const link = el(
      "a",
      { class: "fan__card", href: `/project/${p.id}` },
      el("span", { class: "fan__tab", "aria-hidden": "true" }),
      el(
        "span",
        { class: "fan__thumb" },
        el("img", {
          src: asset(p.hero.src),
          alt: "", // the project name is right there — a real alt would double-read
          width: 600,
          height: 400,
          loading: i < 3 ? "eager" : "lazy",
          decoding: "async",
        })
      ),
      el(
        "span",
        { class: "fan__meta" },
        el(
          "span",
          { class: "fan__row" },
          el("span", { class: "fan__name" }, p.name),
          el("span", { class: "fan__num" }, p.id)
        ),
        el("span", { class: "fan__sub" }, `${p.subtitle} · ${p.year}`)
      )
    );

    /* The flip wrapper carries the rotateX. See the note in fan.css: the <li> must
     * stay untransformed because it is the scroll snap target. */
    const li = el(
      "li",
      { class: "fan__item", dataset: { index: String(i) } },
      el("div", { class: "fan__flip" }, link)
    );

    fan.append(li);
    return li;
  });

  const status = el("div", { class: "sr-only", role: "status", "aria-live": "polite" });

  view.append(fan, status);

  /* ------------------------------------------------------------- geometry -- */

  const layout = () => {
    items.forEach((item, i) => {
      const d = i - active;
      const a = Math.abs(d);

      item.style.setProperty("--i", String(d));
      item.style.setProperty("--a", String(a));
      item.dataset.depth = String(Math.min(a, 4));

      /* Which edge this card pivots on. Cards above the active one must rotate
       * the other way, or they lean out over it and hide it. */
      item.dataset.side = d < 0 ? "above" : "below";
    });
  };

  const announce = () => {
    const p = ordered[active];
    status.textContent = `${p.name}, ${p.id}, ${active + 1} of ${items.length}`;
  };

  const remember = () => write(LAST_KEY, ordered[active].id);

  /* Vertical-only positioning, derived from the delta between the two centres.
   * scrollIntoView() would scroll the PAGE as well, and `offsetTop` depends on
   * whichever ancestor happens to be positioned — the delta is immune to both. */
  let scrollGen = 0;

  const scrollToCard = (i, instant = false) => {
    const item = items[i];
    if (!item) return;

    const fr = fan.getBoundingClientRect();
    const ir = item.getBoundingClientRect();
    const from = fan.scrollTop;
    const target = from + (ir.top + ir.height / 2 - (fr.top + fr.height / 2));

    const gen = ++scrollGen;

    if (instant || reducedMotion() || Math.abs(target - from) < 2) {
      fan.scrollTop = target;
      return;
    }

    /* Native smooth scrolling, NOT a requestAnimationFrame tween. rAF is the
     * wrong tool here: browsers suspend animation frames for a hidden or
     * occluded page, so a hand-rolled tween silently never advances and the
     * column appears frozen. (Measured 2026-09-23 in the VS Code browser pane —
     * not one rAF callback fired.) This is also why behavior:"smooth" looked
     * broken during testing: smooth scrolling is frame-driven too, so it stalls
     * for the same reason and works normally on a visible page.
     *
     * setTimeout is used for the safety check because it still fires while
     * hidden — so if the move has not started by then, jump it. */
    fan.scrollTo({ top: target, behavior: "smooth" });

    setTimeout(() => {
      if (gen !== scrollGen) return; // a newer move superseded this one
      if (Math.abs(fan.scrollTop - from) < 1) fan.scrollTop = target;
    }, 250);
  };

  const setActive = (i, { focus = false, scroll = true, say = true } = {}) => {
    active = (i + items.length) % items.length;
    layout();
    if (scroll) scrollToCard(active);
    if (focus) items[active].querySelector("a").focus({ preventScroll: true });
    if (say) announce();
    remember();
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

    const forward = e.key === "ArrowDown" || e.key === "PageDown";
    const back = e.key === "ArrowUp" || e.key === "PageUp";
    if (!forward && !back) return;

    e.preventDefault();
    setActive(active + (forward ? 1 : -1), { focus: true });
  });

  /* ------------------------------------------------------ wheel (Step mode) */

  /* Letting the wheel scroll natively would fling past several folders in one
   * gesture. In Step mode we take the wheel over and advance exactly one card,
   * releasing the lock after a quiet gap so a slow deliberate scroll still steps
   * one at a time. */
  const WHEEL_SETTLE = 260;

  fan.addEventListener(
    "wheel",
    (e) => {
      if (fan.dataset.mode !== "snap") return;
      if (Math.abs(e.deltaY) < 4) return; // jitter / horizontal-only wheeling

      e.preventDefault();

      const now = Date.now();
      if (now - wheelLock < WHEEL_SETTLE) return;
      wheelLock = now;

      setActive(active + (e.deltaY > 0 ? 1 : -1));
    },
    { passive: false }
  );

  /* --------------------------------------------------------------- modes --- */

  const setMode = (next) => {
    if (!MODES.includes(next) || next === mode) return;
    mode = next;

    fan.dataset.mode = mode;
    modeButtons.forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.modeOption === mode))
    );
    write(MODE_KEY, mode);

    /* Re-centre: turning snapping on can otherwise leave the column stranded
     * between two cards, which mandatory snap would then jump abruptly. */
    scrollToCard(active);
  };

  modes.addEventListener("click", (e) => {
    const btn = e.target.closest?.("[data-mode-option]");
    if (btn) setMode(btn.dataset.modeOption);
  });

  /* ------------------------------------------------- column ↔ active sync -- */

  let syncQueued = false;
  let announceTimer = 0;

  /* The scroll position IS the cursor — there is no separate keyboard cursor to
   * move. Deriving it from geometry is deterministic; an IntersectionObserver
   * picks arbitrarily when two cards are equally visible (ratio 1.0 for both),
   * which reports the wrong project.
   *
   * `active` updates live so the rotation tracks the scroll in both modes. The
   * live-region announcement is debounced, because a single fling or smooth
   * scroll crosses several cards and would otherwise read the whole list aloud. */
  const announceSoon = () => {
    clearTimeout(announceTimer);
    announceTimer = setTimeout(announce, 180);
  };

  const syncFromScroll = () => {
    if (syncQueued) return;
    syncQueued = true;

    /* setTimeout, not requestAnimationFrame: browsers suspend animation frames
     * for a hidden/occluded page, and a suspended sync would leave `active`
     * stuck while the visitor scrolled. The queueing flag keeps this to one
     * pending call, which is throttle enough for seven measurements. */
    setTimeout(() => {
      syncQueued = false;

      const fr = fan.getBoundingClientRect();
      const mid = fr.top + fr.height / 2;
      let best = active;
      let bestDist = Infinity;

      items.forEach((item, i) => {
        const r = item.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - mid);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });

      if (best === active) return;
      active = best;
      layout();
      announceSoon();
      remember();
    });
  };

  /* --------------------------------------------------------------- boot ---- */

  container.append(view);

  layout();
  announce();

  fan.addEventListener("scroll", syncFromScroll, { passive: true });

  /* Position the restored card immediately, so the column does not visibly jump
   * on load. Deliberately NOT wrapped in requestAnimationFrame: frames are
   * suspended while the page is hidden, which would leave the restored card
   * un-centred — the same trap that made the scroll logic look broken. */
  scrollToCard(active, true);
  syncFromScroll();

  /* Listeners live on `fan` and `modes`, both inside `view`, so they are discarded
   * with the subtree when the router re-mounts. Only the timer needs clearing. */
  return {
    title: "Millingen Architects — Selected works",
    destroy() {
      clearTimeout(announceTimer);
      fan.removeEventListener("scroll", syncFromScroll);
    },
  };
}
