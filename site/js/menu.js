/* ============================================================================
 * menu.js — top-right menu button + small popover.
 *
 * Behaviour contract:
 *   open  → aria-expanded=true, panel visible, focus moves to first item
 *   close → aria-expanded=false, panel hidden
 *           focus returns to the button ONLY for Esc (see `restoreFocus`)
 *   closes on: Esc · outside pointerdown · focus leaving the panel · route change
 * ========================================================================== */

import { el } from "./util.js";
import { onRouteChange } from "./router.js";

/* TODO: paste the Netlify URL of the presentation deck site here (site #1).
 * While it is empty the "Presentation" item is omitted rather than shipping a
 * dead link. */
const DECK_URL = "";

const ITEMS = [
  { label: "Portfolio", href: "/" },
  { label: "About", href: "/about" },
  ...(DECK_URL
    ? [{ label: "Presentation", href: DECK_URL, note: "Fullscreen deck", external: true, gap: true }]
    : []),
];

export function mountMenu() {
  const btn = document.getElementById("menuBtn");
  const panel = document.getElementById("menuPanel");
  let open = false;

  panel.replaceChildren(
    el(
      "ul",
      { class: "popover__list" },
      ITEMS.map((it) =>
        el(
          "li",
          { class: it.gap ? "popover__item--gap" : null },
          el(
            "a",
            {
              class: "popover__link",
              href: it.href,
              ...(it.external ? { "data-external": "", target: "_blank", rel: "noopener" } : {}),
            },
            el("span", { class: "popover__label" }, it.label),
            it.note ? el("span", { class: "popover__note" }, it.note) : null
          )
        )
      )
    )
  );

  /* `restoreFocus` is true ONLY for Esc. When the panel closes because focus or
   * the pointer moved somewhere else, yanking focus back to the button would
   * fight the user — so we leave focus alone. */
  const setOpen = (next, { restoreFocus = false } = {}) => {
    if (next === open) return;
    open = next;

    panel.dataset.open = String(open);
    btn.setAttribute("aria-expanded", String(open));
    btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");

    if (open) panel.querySelector("a")?.focus({ preventScroll: true });
    else if (restoreFocus) btn.focus({ preventScroll: true });
  };

  btn.addEventListener("click", () => setOpen(!open));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false, { restoreFocus: true });
    }
  });

  /* Outside pointerdown — pointerdown rather than click, so it fires before
   * the click that would otherwise re-open the panel via the button handler. */
  document.addEventListener("pointerdown", (e) => {
    if (!open) return;
    if (panel.contains(e.target) || btn.contains(e.target)) return;
    setOpen(false);
  });

  /* Tab out of the panel → close, but only once focus has actually left both
   * the panel and the button. */
  document.addEventListener("focusin", (e) => {
    if (!open) return;
    if (panel.contains(e.target) || btn.contains(e.target)) return;
    setOpen(false);
  });

  /* The panel is global state; it must not survive a route change. */
  onRouteChange(() => setOpen(false));
}
