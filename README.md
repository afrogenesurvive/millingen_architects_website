# millingen_architects_website

Two independent static sites for Millingen Architects, both zero-build vanilla HTML/CSS/JS and
deployable to Netlify with no build step.

## Contents

- [`presentation_site/`](presentation_site/) — **the cinematic presentation deck.** Fullscreen
  auto-playing slideshow; renders entirely from one config file (`js/slides.config.js`), so the
  same engine can be reused for any pitch.
- [`site/`](site/) — **the portfolio site.** Vertical flip-column nav, project pages with
  galleries and a lightbox, an About page, and a menu popover. See
  [`site/README.md`](site/README.md).
- `netlify.toml` — Netlify config for the deck (publishes `presentation_site/`)

Each site gets its own Netlify configuration, distinguished by **base directory**: the deck is
served from the repo root, the portfolio from `site/` (see `site/netlify.toml`).

## Features

### Portfolio site (`site/`)

- Vertical flip-column portfolio nav with a Step / Scroll mode switch — see
  [`site/README.md`](site/README.md)
- Deep-linkable project pages (`/project/<id>`): hero, facts list, prose, gallery, lightbox
- About page (practice, services, policies, founder CV, contact) driven by one content file
- Top-right menu popover, present on every page

### Presentation deck (`presentation_site/`)

- Fullscreen cinematic slides with crossfade + subtle Ken Burns on images
- **Autoplay** (5s per slide) and **Loop**, both on by default and toggleable
  via two glass switches in the bottom-right corner
- Slide types: **image**, **video** (YouTube, muted autoplay), and **iframe** (embedded site)
- **Hidden external-site slides**: an iframe slide only appears when its parent
  slide's "See more" CTA is clicked; it has its own Close button, pauses
  autoplay while open, and keeps its state until the page reloads
- All slide content comes from `presentation_site/js/slides.config.js`

## Setup

Nothing to install — the site is plain static files. You only need a way to
serve the folder (any static server) for local preview.

## Running locally

From the repo root:

```sh
cd presentation_site
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

(Any static server works, e.g. `npx serve .` inside `presentation_site/`.)

## Customizing the slides

Everything is driven by
[`presentation_site/js/slides.config.js`](presentation_site/js/slides.config.js)
(`window.DECK_CONFIG`): the title/tagline/accent color, autoplay delay, initial
toggle states, and the `slides[]` array (image / video / iframe, plus optional
`seeMore` CTAs). Drop media into `presentation_site/assets/img/` and reference
it with relative paths.

For the full schema and a walkthrough of making a new presentation, see
[`presentation_site/README.md`](presentation_site/README.md).

## Deploying to Netlify

The repo already includes [`netlify.toml`](netlify.toml), which tells Netlify
to publish `presentation_site/` with no build step.

### Via the Netlify UI (recommended)

1. Sign in at <https://app.netlify.com> → **Add new site** → **Import an existing project**.
2. Connect your Git provider (GitHub) and select this repository.
3. Netlify picks up `netlify.toml`. If you prefer to set it manually:
   - **Build command**: leave empty (or `echo 'no build step'`)
   - **Publish directory**: `presentation_site`
4. Click **Deploy site**. Netlify builds and publishes instantly.
5. Open the generated URL (e.g. `https://<your-site>.netlify.app`).
6. (Optional) In **Site configuration → Domain management**, add a custom domain.

### Via the Netlify CLI

```sh
npm install -g netlify-cli      # once
netlify init                    # link to an existing site / create a new one
netlify deploy --prod           # deploy from the repo root (uses netlify.toml)
```

## Troubleshooting

- **YouTube shows "An error occurred" / console `postMessage` warnings**: this
  can appear when testing inside restricted/sandboxed browsers or over plain
  `http://localhost`. The embedded player works normally in a real browser on
  the deployed `https://` URL.
- **Placeholders**: the config ships with example content (SVG placeholders, a
  CC-BY demo video, `example.com` iframes). Replace them via `slides.config.js`
  — every placeholder is marked with a `TODO`.

## License

See [LICENSE](LICENSE).
