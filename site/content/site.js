/* ============================================================================
 * site.js — ⭐ company info, services, policies, founder CV, contact.
 *
 * All copy is PLACEHOLDER. Replace the strings; the About view renders
 * whatever sections are listed here, in this order.
 * ========================================================================== */

export const site = {
  name: "Millingen Architects",
  tagline: "Designing spaces that shape how we live.",

  /* Portfolio nav behaviour.
   *   "snap"   — one folder at a time (default). The column steps from card to
   *              card, snapping, with the browser's native fling momentum on touch.
   *   "scroll" — free scrolling; the flip follows the scroll position.
   * The visitor can switch live with the Step/Scroll control on the home page,
   * and that choice wins for the rest of their session. */
  nav: {
    mode: "snap",
  },

  sections: [
    {
      id: "practice",
      title: "Practice",
      body: [
        {
          type: "text",
          value:
            "Placeholder. A short paragraph on the practice — when it was founded, where it works, and what kind of architecture it makes.",
        },
        {
          type: "text",
          value:
            "A second placeholder paragraph — typically the working method: how a project begins, how the client is involved, how the drawings are developed.",
        },
      ],
    },

    {
      id: "services",
      title: "Services",
      items: [
        "Architectural design",
        "Feasibility studies",
        "Interior architecture",
        "Planning applications",
        "Technical design packages",
        "Site supervision",
      ],
      footnote: "Placeholder list — replace with the services actually offered.",
    },

    {
      id: "policies",
      title: "Policies",
      items: [
        { label: "Privacy policy", note: "How we handle personal data." },
        { label: "Terms of engagement", note: "Our standard terms of business." },
        { label: "Complaints procedure", note: "How to raise a concern." },
        { label: "Health & safety", note: "Site and studio policy." },
      ],
      footnote:
        "Placeholder. Add a `url` to any item to link the document; until then the items render as plain text.",
    },

    {
      id: "cv",
      title: "Founder",
      cv: {
        name: "R. Millingen",
        role: "Founding Director",
        lines: [
          { label: "Education", value: "MSc Architecture, TU Delft" },
          { label: "Registration", value: "Registered Architect" },
          { label: "Practice since", value: "2004" },
        ],
        body: [
          {
            type: "text",
            value:
              "Placeholder biography. Replace with the founder's career, notable projects, teaching or publication record.",
          },
        ],
      },
    },
  ],

  contact: {
    note: "Placeholder contact details — replace before launch.",
    email: "studio@example.com",
    phone: "+31 20 000 0000",
    address: ["Studio address line 1", "City", "Postcode", "Netherlands"],
    /* Optional. Leave empty and the About view simply omits the row. */
    mapUrl: "",
    social: [],
  },
};
