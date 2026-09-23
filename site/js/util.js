/* ============================================================================
 * util.js — tiny DOM helpers. No framework.
 * ========================================================================== */

/**
 * el("h2", { class: "x" }, "text", childNode)
 * Attributes: `dataset` takes an object, `html` takes a raw string, booleans
 * set a valueless attribute, null/undefined/false are skipped.
 */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);

  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "dataset") Object.assign(node.dataset, v);
    else if (k === "html") node.innerHTML = v;
    else node.setAttribute(k, v === true ? "" : String(v));
  }

  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }

  return node;
}

export const setTitle = (t) => {
  document.title = t;
};

/**
 * Anchor a content asset path to the site root.
 *
 * Paths in content/*.js are written relative to the site root
 * ("assets/img/projects/001/hero.svg"). On a deep link such as /project/001 the
 * browser would resolve those against /project/, so they must be made absolute.
 * Absolute paths and full URLs pass through untouched.
 */
export const asset = (path) =>
  !path || path.startsWith("/") || /^[a-z][a-z0-9+.-]*:/i.test(path) ? path : `/${path}`;

/** True when the visitor has asked the OS to reduce motion. */
export const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Scroll behaviour that respects the reduced-motion preference. */
export const scrollBehavior = () => (reducedMotion() ? "auto" : "smooth");

/** Renders the prose/quote block array used by both project and About views. */
export function proseBlocks(blocks = []) {
  const wrap = el("div", { class: "prose" });
  for (const b of blocks) {
    if (b.type === "quote") wrap.append(el("blockquote", { class: "pull" }, b.value));
    else wrap.append(el("p", {}, b.value));
  }
  return wrap;
}

/** Shared footer. Every full page renders one. */
export function footerNode(site) {
  return el(
    "footer",
    { class: "pagefoot" },
    el("span", {}, `© ${new Date().getFullYear()} ${site.name}`),
    el("span", {}, el("a", { href: `mailto:${site.contact.email}` }, site.contact.email)),
    el("span", {}, el("a", { href: "/" }, "Portfolio"))
  );
}
