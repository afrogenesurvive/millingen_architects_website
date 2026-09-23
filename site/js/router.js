/* ============================================================================
 * router.js — minimal History-API router.
 *
 * Routes:  /  ·  /about  ·  /project/:id
 * A view is `mount(container, params)` and may return:
 *   { title: string, destroy?: () => void }
 *
 * `destroy` is called before the next view mounts, so views that own a timer or
 * a document-level listener can clean up rather than leak one per navigation.
 * ========================================================================== */

import { el, setTitle } from "./util.js";

const routes = [];
const onNavigate = [];

let cleanup = null;

/* True only while handling a popstate (browser Back/Forward). The browser
 * restores the scroll position itself for those, so we must not fight it. */
let restoring = false;

export function route(pattern, mount) {
  routes.push({ pattern, mount });
}

export function onRouteChange(fn) {
  onNavigate.push(fn);
}

function match(pathname) {
  for (const r of routes) {
    const m = pathname.match(r.pattern);
    if (m) return { ...r, params: m.groups ?? {} };
  }
  return null;
}

export async function render(pathname = location.pathname) {
  const wasRestore = restoring; // read SYNCHRONOUSLY, before any await
  const hit = match(pathname);
  const container = document.getElementById("view");

  if (!hit) return renderNotFound(container);

  if (typeof cleanup === "function") cleanup();
  cleanup = null;

  container.replaceChildren();

  const result = await hit.mount(container, hit.params);

  cleanup = typeof result?.destroy === "function" ? result.destroy : null;

  setTitle(result?.title ?? "Millingen Architects");
  onNavigate.forEach((fn) => fn(pathname));

  if (!wasRestore) {
    window.scrollTo(0, 0);
    container.querySelector("h1")?.focus?.({ preventScroll: true });
  }
}

export function navigate(url, { replace = false } = {}) {
  if (url === location.pathname + location.search) return;
  if (replace) history.replaceState({}, "", url);
  else history.pushState({}, "", url);
  render(url);
}

/* ---- global link interception: any same-origin <a> becomes a route ---- */
document.addEventListener("click", (e) => {
  const a = e.target.closest?.("a[href]");
  if (!a) return;
  if (a.target === "_blank" || a.hasAttribute("download")) return;
  if (a.dataset.external !== undefined) return;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

  /* In-page fragment links (e.g. the skip link) belong to the browser. */
  if (a.getAttribute("href").startsWith("#")) return;

  const url = new URL(a.href, location.origin);
  if (url.origin !== location.origin) return;

  e.preventDefault();
  navigate(url.pathname + url.search + url.hash);
});

window.addEventListener("popstate", () => {
  restoring = true;
  render(); // render() reads `restoring` synchronously, before awaiting
  restoring = false;
});

function renderNotFound(container) {
  if (typeof cleanup === "function") cleanup();
  cleanup = null;
  container.replaceChildren();

  container.append(
    el(
      "section",
      { class: "page page--center" },
      el("h1", {}, "Page not found"),
      el("p", {}, el("a", { href: "/" }, "Back to all projects"))
    )
  );

  setTitle("Not found — Millingen Architects");
}
