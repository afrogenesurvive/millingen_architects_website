/* ============================================================================
 * about.js — practice, services, policies, founder CV, contact.
 * Renders whatever `site.sections` lists, in order.
 * ========================================================================== */

import { el, proseBlocks, footerNode } from "./util.js";
import { site } from "../content/site.js";

export function mountAbout(container) {
  const view = el("article", { class: "page page--about" });

  view.append(
    el(
      "div",
      { class: "page__head" },
      el("h1", { class: "page__title" }, "About"),
      el("p", { class: "page__lede" }, `${site.name} — ${site.tagline}`)
    )
  );

  const about = el("div", { class: "about" });

  for (const section of site.sections) {
    about.append(renderSection(section));
  }

  about.append(renderContact(site.contact));

  view.append(about, footerNode(site));
  container.append(view);

  return { title: `About — ${site.name}` };
}

/* -------------------------------------------------------------------------- */

function renderSection(section) {
  const wrap = el("section", { class: "about__section", id: section.id });

  wrap.append(el("h2", { class: "section__title" }, section.title));

  if (section.body?.length) wrap.append(proseBlocks(section.body));

  /* plain string list (services) */
  if (section.items?.some((it) => typeof it === "string")) {
    const ul = el("ul", { class: "about__list" });
    for (const item of section.items) {
      ul.append(el("li", { class: "about__item" }, el("span", { class: "about__item-label" }, item)));
    }
    wrap.append(ul);
  }

  /* label/note list (policies) — links when a url is supplied */
  const linked = section.items?.filter((it) => typeof it === "object");
  if (linked?.length) {
    const ul = el("ul", { class: "about__list" });
    for (const item of linked) {
      const cls = item.url ? "about__item about__item--link" : "about__item";
      const inner = [
        el("span", { class: "about__item-label" }, item.label),
        item.note ? el("span", { class: "about__item-note" }, item.note) : null,
      ];
      ul.append(
        el(
          "li",
          {},
          item.url
            ? el("a", { class: cls, href: item.url }, inner)
            : el("div", { class: cls }, inner)
        )
      );
    }
    wrap.append(ul);
  }

  if (section.cv) wrap.append(renderCv(section.cv));

  if (section.footnote) wrap.append(el("p", { class: "about__footnote" }, section.footnote));

  return wrap;
}

function renderCv(cv) {
  const lines = el("dl", { class: "cv__lines" });
  for (const l of cv.lines ?? []) {
    lines.append(el("dt", {}, l.label), el("dd", {}, l.value));
  }

  return el(
    "div",
    { class: "cv" },
    el("div", {}, el("h3", { class: "cv__name" }, cv.name), el("p", { class: "cv__role" }, cv.role)),
    lines,
    cv.body?.length ? proseBlocks(cv.body) : null
  );
}

function renderContact(contact) {
  const wrap = el("section", { class: "about__section", id: "contact" });

  wrap.append(el("h2", { class: "section__title" }, "Contact"));

  const box = el(
    "div",
    { class: "contact" },
    el("p", {}, el("a", { href: `mailto:${contact.email}` }, contact.email)),
    el("p", {}, el("a", { href: `tel:${contact.phone.replace(/\s+/g, "")}` }, contact.phone)),
    el("address", { class: "contact__address" }, contact.address.map((line) => el("span", {}, line))),
    contact.mapUrl ? el("p", {}, el("a", { href: contact.mapUrl }, "Find the studio")) : null,
    contact.social?.length
      ? el(
          "p",
          {},
          contact.social.map((s) => el("a", { href: s.url }, s.label))
        )
      : null,
    contact.note ? el("p", { class: "contact__note" }, contact.note) : null
  );

  wrap.append(box);
  return wrap;
}
