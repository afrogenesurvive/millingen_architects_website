/* ============================================================================
 * project.js — a single project page: hero, facts, prose, gallery, pager.
 * ========================================================================== */

import { el, asset, proseBlocks, footerNode } from "./util.js";
import { bySlug, ordered } from "../content/projects.js";
import { site } from "../content/site.js";

export function mountProject(container, { id }) {
  const project = bySlug[id];
  if (!project) return mountMissing(container, id);

  const view = el("article", { class: "page page--project" });

  view.append(
    el(
      "nav",
      { class: "crumbs", "aria-label": "Breadcrumb" },
      el("a", { class: "crumbs__back", href: "/" }, "← All projects")
    )
  );

  /* -------------------------------------------------------------- hero ---- */

  view.append(
    el(
      "header",
      { class: "project__hero" },
      el("img", {
        src: asset(project.hero.src),
        alt: project.hero.alt,
        width: 1600,
        height: 900,
        fetchpriority: "high", // this is the LCP image
        decoding: "async",
      }),
      el(
        "div",
        { class: "project__head" },
        el("h1", { class: "project__title" }, project.name),
        el(
          "p",
          { class: "project__sub" },
          `${project.subtitle} · ${project.year} · ${project.location} `,
          project.placeholder ? el("span", { class: "chip" }, "Placeholder") : null
        )
      )
    )
  );

  /* ------------------------------------------------------------- facts ---- */

  if (project.facts?.length) {
    const dl = el("dl", { class: "facts" });
    for (const f of project.facts) {
      dl.append(el("dt", { class: "facts__k" }, f.label), el("dd", { class: "facts__v" }, f.value));
    }
    view.append(
      el("section", { class: "project__block" }, el("h2", { class: "section__title" }, "Details"), dl)
    );
  }

  /* -------------------------------------------------------------- text ---- */

  if (project.body?.length) {
    const section = el("section", { class: "project__block" }, proseBlocks(project.body));
    view.append(section);
  }

  /* ----------------------------------------------------------- gallery ---- */

  let dialog = null;

  if (project.gallery?.length) {
    const grid = el("div", { class: "gallery" });

    project.gallery.forEach((img, i) => {
      grid.append(
        el(
          "button",
          {
            class: "gallery__item",
            type: "button",
            "data-index": String(i),
            "aria-label": `View image ${i + 1} of ${project.gallery.length}: ${img.alt}`,
          },
          el("img", {
            src: asset(img.src),
            alt: img.alt,
            width: 1200,
            height: 800,
            loading: "lazy",
            decoding: "async",
          })
        )
      );
    });

    /* Native <dialog> gives us the backdrop, Esc, and focus trapping free. */
    dialog = el(
      "dialog",
      { class: "lightbox" },
      el("button", { class: "lightbox__close", type: "button", "aria-label": "Close" }, "×"),
      el("img", { class: "lightbox__img", alt: "" })
    );

    const dialogImg = dialog.querySelector("img");

    grid.addEventListener("click", (e) => {
      const btn = e.target.closest(".gallery__item");
      if (!btn) return;
      const img = project.gallery[Number(btn.dataset.index)];
      dialogImg.src = asset(img.src);
      dialogImg.alt = img.alt;
      dialog.showModal();
    });

    dialog.querySelector(".lightbox__close").addEventListener("click", () => dialog.close());

    /* Belt-and-braces. A modal <dialog> is supposed to close on Esc via its
     * `cancel` event, but some Chromium builds (including the one embedded in
     * editors) never dispatch it — verified 2026-09-23. Close explicitly so Esc
     * always works; the listener sits on the dialog, so it catches keys bubbling
     * from the focused Close button. */
    dialog.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      dialog.close();
    });

    /* Click the dialog element itself (i.e. the backdrop) to close. */
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close();
    });

    document.body.append(dialog);

    view.append(
      el(
        "section",
        { class: "project__block" },
        el("h2", { class: "section__title" }, "Images"),
        grid
      )
    );
  }

  /* ------------------------------------------------------------- pager ---- */

  const i = ordered.findIndex((p) => p.id === project.id);
  const prev = ordered[(i - 1 + ordered.length) % ordered.length];
  const next = ordered[(i + 1) % ordered.length];

  view.append(
    el(
      "nav",
      { class: "pager", "aria-label": "Project navigation" },
      el(
        "a",
        { class: "pager__link", href: `/project/${prev.id}`, rel: "prev" },
        el("span", { class: "pager__k" }, "Previous"),
        el("span", { class: "pager__v" }, prev.name)
      ),
      el(
        "a",
        { class: "pager__link pager__link--next", href: `/project/${next.id}`, rel: "next" },
        el("span", { class: "pager__k" }, "Next"),
        el("span", { class: "pager__v" }, next.name)
      )
    )
  );

  view.append(footerNode(site));
  container.append(view);

  return {
    title: `${project.name} — ${site.name}`,
    destroy() {
      dialog?.remove();
      dialog = null;
    },
  };
}

function mountMissing(container, id) {
  container.append(
    el(
      "section",
      { class: "page page--center" },
      el("h1", {}, "Project not found"),
      el("p", { class: "page__meta" }, `No project with the id “${id}”.`),
      el("p", {}, el("a", { href: "/" }, "Back to all projects"))
    )
  );
  return { title: `Not found — ${site.name}` };
}
