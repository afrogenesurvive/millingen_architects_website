/* ============================================================================
 * slides.config.js — ⭐ SINGLE SOURCE OF TRUTH for the deck.
 *
 * This is the ONLY file you edit to build a new presentation. The engine
 * (deck.js) reads `window.DECK_CONFIG` and renders everything from it.
 *
 * To reuse for another pitch: duplicate this file (and the engine/css), then
 * change `meta`, `autoplayDelay`, `autoplayDefault`, `loopDefault` and the
 * `slides[]` array below. Drop media into assets/img/ and use relative paths.
 * ========================================================================== */

window.DECK_CONFIG = {
  /* ---------------------------------------------------------------- meta - */
  meta: {
    title: "Millingen Architects",            // shown top-left + <title>
    tagline: "Designing spaces that shape how we live.", // optional
    accent: "#c9a86a",                        // optional brand accent (gold)
  },

  /* ------------------------------------------------------------ timing --- */
  autoplayDelay: 5000,   // ms shown on each slide before auto-advancing
  autoplayDefault: true, // autoplay switch ON by default
  loopDefault: true,     // loop switch ON by default
  kenBurns: true,        // subtle zoom/pan on image slides

  /* -------------------------------------------------------------- slides - */
  /* Types:
   *   image  -> { type, title?, caption?, image: { src, alt? }, seeMore? }
   *   video  -> { type, title?, caption?, provider: "youtube"|"mp4",
   *               videoId? (youtube) | src? (mp4), seeMore? }
   *   iframe -> { type, url, title? }   — HIDDEN from autoplay/loop/dots.
   *                                         Shown only via a seeMore CTA.
   *
   * seeMore: { label, target }  adds a "See more" CTA button to the slide.
   *   target must be the `id` of an iframe slide. Opening it pauses autoplay;
   *   the iframe slide's Close button returns to this slide.
   *
   * NOTE: slide ids must be unique across the whole array.
   * ========================================================================== */
  slides: [
    /* ------------------------------------------------------------------ */
    /* 1 · IMAGE — hero (placeholder; replace with your real hero photo)   */
    /* ------------------------------------------------------------------ */
    {
      id: "hero",
      type: "image",
      title: "Millingen Architects",
      caption:
        "Contemporary architecture rooted in craft, light and landscape. (TODO: replace this placeholder image + text with your pitch content.)",
      image: {
        src: "assets/img/hero.svg",
        alt: "Placeholder hero — replace with your image",
      },
      // Uncomment + set target to add a "See more" CTA to this slide:
      // seeMore: { label: "See more", target: "site-portfolio" },
    },

    /* ------------------------------------------------------------------ */
    /* 2 · VIDEO — YouTube (muted autoplay). Replace videoId with yours.   */
    /* ------------------------------------------------------------------ */
    {
      id: "showreel",
      type: "video",
      title: "Our work in motion",
      caption: "A short showreel. (TODO: replace videoId with your YouTube video.)",
      provider: "youtube",
      videoId: "aqz-KE-bpKQ", // Big Buck Bunny (Blender, CC-BY) — demo placeholder
      seeMore: { label: "See more", target: "site-showreel" },
    },

    /* ------------------------------------------------------------------ */
    /* 3 · IMAGE — project 01 (placeholder)                                */
    /* ------------------------------------------------------------------ */
    {
      id: "project-01",
      type: "image",
      title: "Hillside Residence",
      caption:
        "A material study in timber and stone, set into the terrain. (TODO: replace placeholder with real project photography.)",
      image: {
        src: "assets/img/project-01.svg",
        alt: "Placeholder project image — replace with your image",
      },
      seeMore: { label: "See more", target: "site-project-01" },
    },

    /* ------------------------------------------------------------------ */
    /* 4 · IMAGE — project 02 (placeholder)                                */
    /* ------------------------------------------------------------------ */
    {
      id: "project-02",
      type: "image",
      title: "Riverside Pavilion",
      caption:
        "Lightweight pavilion framing water and sky. (TODO: replace placeholder with real project photography.)",
      image: {
        src: "assets/img/project-02.svg",
        alt: "Placeholder project image — replace with your image",
      },
    },

    /* ---------------------------------------------------------------- */
    /* HIDDEN IFRAME SLIDES (type: "iframe")                              */
    /* ---------------------------------------------------------------- */
    /* These never appear in the autoplay sequence, dots or loop. They are
     * shown only when a parent slide's "See more" CTA opens them, and are
     * closed by the Close button on the iframe slide itself. Keep them
     * mounted in the DOM after first load so the embedded site keeps its
     * internal state while you navigate away and back (in-memory only —
     * a page reload resets everything).                              */
    /* ---------------------------------------------------------------- */

    {
      id: "site-portfolio",
      type: "iframe",
      url: "https://example.com", // TODO: replace with your portfolio site
      title: "Our portfolio",
    },

    {
      id: "site-showreel",
      type: "iframe",
      url: "https://example.com", // TODO: replace with your site for this slide
      title: "Showreel credits",
    },

    {
      id: "site-project-01",
      type: "iframe",
      url: "https://example.com", // TODO: replace with the project case-study page
      title: "Hillside Residence — case study",
    },
  ],
};
