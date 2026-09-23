/* ============================================================================
 * projects.js — ⭐ SINGLE SOURCE OF TRUTH for the portfolio.
 *
 * To add a project:
 *   1. append an object below
 *   2. drop media into site/assets/img/projects/<id>/
 *   3. that's it — no JS or CSS changes anywhere.
 *
 * All copy here is PLACEHOLDER. Every entry carries `placeholder: true` and the
 * UI shows a "Placeholder" chip until real content arrives, so a half-populated
 * site reads as staging rather than as finished work.
 * ========================================================================== */

export const projects = [
  {
    id: "001",
    name: "Coastal House",
    subtitle: "Private residence",
    year: "2021",
    order: 1,
    placeholder: true,
    location: "Bloemendaal, NL",
    facts: [
      { label: "Location", value: "Bloemendaal, Netherlands" },
      { label: "Date built", value: "2019 – 2021" },
      { label: "Client", value: "Private" },
      { label: "Status", value: "Completed" },
      { label: "Area", value: "420 m²" },
      { label: "Structure", value: "Cross-laminated timber" },
    ],
    hero: { src: "assets/img/projects/001/hero.svg", alt: "Coastal House — placeholder drawing" },
    gallery: [
      { src: "assets/img/projects/001/01.svg", alt: "Entrance courtyard — placeholder drawing" },
      { src: "assets/img/projects/001/02.svg", alt: "Living room, north light — placeholder drawing" },
      { src: "assets/img/projects/001/03.svg", alt: "Stair detail — placeholder drawing" },
    ],
    body: [
      { type: "text", value: "Placeholder description. Replace with the project narrative: the brief, the constraint that shaped it, and the move that resolved it." },
      { type: "quote", value: "The plan follows the water table, not the street." },
      { type: "text", value: "A second placeholder paragraph — typically where the material palette, the site response, or the construction story goes." },
    ],
  },

  {
    id: "002",
    name: "Courtyard Studio",
    subtitle: "Workspace",
    year: "2018",
    order: 2,
    placeholder: true,
    location: "Utrecht, NL",
    facts: [
      { label: "Location", value: "Utrecht, Netherlands" },
      { label: "Date built", value: "2017 – 2018" },
      { label: "Client", value: "Private" },
      { label: "Status", value: "Completed" },
      { label: "Area", value: "180 m²" },
      { label: "Structure", value: "Masonry and steel" },
    ],
    hero: { src: "assets/img/projects/002/hero.svg", alt: "Courtyard Studio — placeholder drawing" },
    gallery: [
      { src: "assets/img/projects/002/01.svg", alt: "Courtyard — placeholder drawing" },
      { src: "assets/img/projects/002/02.svg", alt: "Studio interior — placeholder drawing" },
    ],
    body: [
      { type: "text", value: "Placeholder description. Replace with the project narrative." },
      { type: "text", value: "A second placeholder paragraph." },
    ],
  },

  {
    id: "003",
    name: "Dune Pavilion",
    subtitle: "Cultural",
    year: "2022",
    order: 3,
    placeholder: true,
    location: "Texel, NL",
    facts: [
      { label: "Location", value: "Texel, Netherlands" },
      { label: "Date built", value: "2021 – 2022" },
      { label: "Client", value: "Municipality" },
      { label: "Status", value: "Completed" },
      { label: "Area", value: "260 m²" },
      { label: "Structure", value: "Glulam frame" },
    ],
    hero: { src: "assets/img/projects/003/hero.svg", alt: "Dune Pavilion — placeholder drawing" },
    gallery: [
      { src: "assets/img/projects/003/01.svg", alt: "Pavilion approach — placeholder drawing" },
      { src: "assets/img/projects/003/02.svg", alt: "Exhibition hall — placeholder drawing" },
      { src: "assets/img/projects/003/03.svg", alt: "Roof structure — placeholder drawing" },
    ],
    body: [
      { type: "text", value: "Placeholder description. Replace with the project narrative." },
      { type: "quote", value: "A placeholder pull-quote." },
      { type: "text", value: "A second placeholder paragraph." },
    ],
  },

  {
    id: "004",
    name: "Canal Warehouse",
    subtitle: "Adaptive reuse",
    year: "2020",
    order: 4,
    placeholder: true,
    location: "Amsterdam, NL",
    facts: [
      { label: "Location", value: "Amsterdam, Netherlands" },
      { label: "Date built", value: "2016 – 2020" },
      { label: "Client", value: "Development partnership" },
      { label: "Status", value: "Completed" },
      { label: "Area", value: "1,240 m²" },
      { label: "Structure", value: "Existing masonry, new steel" },
    ],
    hero: { src: "assets/img/projects/004/hero.svg", alt: "Canal Warehouse — placeholder drawing" },
    gallery: [
      { src: "assets/img/projects/004/01.svg", alt: "Canal elevation — placeholder drawing" },
      { src: "assets/img/projects/004/02.svg", alt: "Inserted stair — placeholder drawing" },
    ],
    body: [
      { type: "text", value: "Placeholder description. Replace with the project narrative." },
      { type: "text", value: "A second placeholder paragraph." },
    ],
  },

  {
    id: "005",
    name: "Woodland Retreat",
    subtitle: "Private residence",
    year: "2023",
    order: 5,
    placeholder: true,
    location: "Veluwe, NL",
    facts: [
      { label: "Location", value: "Veluwe, Netherlands" },
      { label: "Date built", value: "2022 – 2023" },
      { label: "Client", value: "Private" },
      { label: "Status", value: "Completed" },
      { label: "Area", value: "135 m²" },
      { label: "Structure", value: "Timber frame" },
    ],
    hero: { src: "assets/img/projects/005/hero.svg", alt: "Woodland Retreat — placeholder drawing" },
    gallery: [
      { src: "assets/img/projects/005/01.svg", alt: "Approach through the trees — placeholder drawing" },
      { src: "assets/img/projects/005/02.svg", alt: "Living space — placeholder drawing" },
    ],
    body: [
      { type: "text", value: "Placeholder description. Replace with the project narrative." },
      { type: "quote", value: "A placeholder pull-quote." },
    ],
  },

  {
    id: "006",
    name: "Civic Library",
    subtitle: "Public",
    year: "2018",
    order: 6,
    placeholder: true,
    location: "Haarlem, NL",
    facts: [
      { label: "Location", value: "Haarlem, Netherlands" },
      { label: "Date built", value: "2015 – 2018" },
      { label: "Client", value: "Municipality" },
      { label: "Status", value: "Completed" },
      { label: "Area", value: "2,100 m²" },
      { label: "Structure", value: "Concrete frame" },
    ],
    hero: { src: "assets/img/projects/006/hero.svg", alt: "Civic Library — placeholder drawing" },
    gallery: [
      { src: "assets/img/projects/006/01.svg", alt: "Reading room — placeholder drawing" },
      { src: "assets/img/projects/006/02.svg", alt: "Public square — placeholder drawing" },
    ],
    body: [
      { type: "text", value: "Placeholder description. Replace with the project narrative." },
      { type: "text", value: "A second placeholder paragraph." },
    ],
  },

  {
    id: "007",
    name: "Roof Extension",
    subtitle: "Residential",
    year: "2024",
    order: 7,
    placeholder: true,
    location: "Rotterdam, NL",
    facts: [
      { label: "Location", value: "Rotterdam, Netherlands" },
      { label: "Date built", value: "2023 – 2024" },
      { label: "Client", value: "Private" },
      { label: "Status", value: "Completed" },
      { label: "Area", value: "78 m²" },
      { label: "Structure", value: "Steel and timber" },
    ],
    hero: { src: "assets/img/projects/007/hero.svg", alt: "Roof Extension — placeholder drawing" },
    gallery: [
      { src: "assets/img/projects/007/01.svg", alt: "Rooftop terrace — placeholder drawing" },
      { src: "assets/img/projects/007/02.svg", alt: "Interior — placeholder drawing" },
    ],
    body: [
      { type: "text", value: "Placeholder description. Replace with the project narrative." },
      { type: "text", value: "A second placeholder paragraph." },
    ],
  },
];

/* ------------------------------------------------------------------ helpers -
 * Both the fan and the project page's prev/next links use `ordered`, so the
 * fan order and the pager order can never drift apart.
 * -------------------------------------------------------------------------- */

export const bySlug = Object.fromEntries(projects.map((p) => [p.id, p]));

export const ordered = [...projects].sort(
  (a, b) => (a.order ?? 999) - (b.order ?? 999) || Number(b.year) - Number(a.year)
);
