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
    // title: "Millingen Architects", // shown top-left + <title>
    // tagline: "Designing spaces that shape how we live.", // optional
    accent: "#c9a86a", // optional brand accent (gold)
  },

  /* ------------------------------------------------------------ timing --- */
  autoplayDelay: 5000, // ms shown on each slide before auto-advancing
  autoplayDefault: true, // autoplay switch ON by default
  loopDefault: true, // loop switch ON by default
  kenBurns: true, // subtle zoom/pan on image slides

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
      //   title: "Millingen Architects Website",
      //   caption: "Mood-Board Presentation",
      image: {
        src: "assets/img/hero02.png",
        alt: "Placeholder hero — replace with your image",
      },
      // Uncomment + set target to add a "See more" CTA to this slide:
      // seeMore: { label: "See more", target: "site-portfolio" },
    },

    /* ------------------------------------------------------------------ */
    /* 2 · VIDEO — YouTube (muted autoplay). Replace videoId with yours.   */
    /* ------------------------------------------------------------------ */
    // {
    //   id: "showreel",
    //   type: "video",
    //   title: "Our work in motion",
    //   caption: "A short showreel. (TODO: replace videoId with your YouTube video.)",
    //   provider: "youtube",
    //   videoId: "aqz-KE-bpKQ", // Big Buck Bunny (Blender, CC-BY) — demo placeholder
    //   seeMore: { label: "See more", target: "site-showreel" },
    // },

    // Video from Google Drive/Local

    {
      id: "showreel_001",
      type: "video",
      //   title: "Our work in motion",
      //   caption: "A short showreel.",
      provider: "mp4",
      //   src: "https://drive.google.com/file/d/1SJAE_SFCfPM1r2RxGpiNGo0N6sEI0A05/view?usp=sharing",
      //   src: "https://drive.google.com/uc?export=download&id=1SJAE_SFCfPM1r2RxGpiNGo0N6sEI0A05",
      src: "assets/vid/001.mp4",
      seeMore: { label: "See more", target: "site-001" },
    },

    {
      id: "showreel_002",
      type: "video",
      //   title: "Our work in motion",
      //   caption: "A short showreel.",
      provider: "mp4",
      src: "assets/vid/002.mp4",
      seeMore: { label: "See more", target: "site-002" },
    },

    {
      id: "showreel_003",
      type: "video",
      //   title: "Our work in motion",
      //   caption: "A short showreel.",
      provider: "mp4",
      src: "assets/vid/003.mp4",
      seeMore: { label: "See more", target: "site-003" },
    },

    {
      id: "showreel_004",
      type: "video",
      //   title: "Our work in motion",
      //   caption: "A short showreel.",
      provider: "mp4",
      src: "assets/vid/004.mp4",
      seeMore: { label: "See more", target: "site-004" },
    },

    {
      id: "showreel_005",
      type: "video",
      //   title: "Our work in motion",
      //   caption: "A short showreel.",
      provider: "mp4",
      src: "assets/vid/005.mp4",
      seeMore: { label: "See more", target: "site-005" },
    },

    {
      id: "showreel_006",
      type: "video",
      //   title: "Our work in motion",
      //   caption: "A short showreel.",
      provider: "mp4",
      src: "assets/vid/006.mp4",
      seeMore: { label: "See more", target: "site-006" },
    },

    {
      id: "showreel_007",
      type: "video",
      //   title: "Our work in motion",
      //   caption: "A short showreel.",
      provider: "mp4",
      src: "assets/vid/007.mp4",
      seeMore: { label: "See more", target: "site-007" },
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
      id: "site-001",
      type: "iframe",
      url: "https://www.governorsmansion.org/", // TODO: replace with the project case-study page
      title: "001",
    },

    {
      id: "site-002",
      type: "iframe",
      url: "https://www.mosbyfiles.com/cases/frank-gehry", // TODO: replace with the project case-study page
      title: "002",
    },

    {
      id: "site-003",
      type: "iframe",
      url: "https://www.thecube.dk/", // TODO: replace with the project case-study page
      title: "003",
    },

    {
      id: "site-004",
      type: "iframe",
      url: "https://www.group8.ch/en", // TODO: replace with the project case-study page
      title: "004",
    },

    {
      id: "site-005",
      type: "iframe",
      url: "https://illoca.unseen.co/", // TODO: replace with the project case-study page
      title: "005",
    },

    {
      id: "site-006",
      type: "iframe",
      url: "https://www.grounded2026.com/", // TODO: replace with the project case-study page
      title: "006",
    },

    {
      id: "site-007",
      type: "iframe",
      url: "https://www.bloom3d.studio/", // TODO: replace with the project case-study page
      title: "007",
    },
  ],
};
