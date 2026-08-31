# Cinematic Presentation Deck

A zero-build, fullscreen, auto-playing presentation deck built with vanilla
HTML/CSS/JS. It renders entirely from a single config file, so you can reuse
the engine for any pitch by only editing the config + media.

## Structure

```
presentation_site/
├── index.html           # Chrome: viewport + controls (arrows, dots, toggles)
├── css/styles.css       # Glass UI, toggles, crossfade + Ken Burns animations
├── js/
│   ├── slides.config.js # ⭐ SINGLE SOURCE OF TRUTH — edit this per deck
│   └── deck.js          # Engine: sequence, autoplay, iframe/seeMore, video
└── assets/img/          # Media (placeholder SVGs — replace with real images)
```

## Making a new presentation

1. Duplicate this `presentation_site/` folder (or just the repo).
2. Edit `js/slides.config.js`:
   - `meta` — title, tagline, optional `accent` brand color.
   - `autoplayDelay` — ms per slide before advancing (default `5000`).
   - `autoplayDefault` / `loopDefault` — initial switch states (both `true`).
   - `slides[]` — image / video / iframe slides (see schema comments in file).
3. Drop media into `assets/img/` and reference it with relative paths.
4. Deploy: any static host. For Netlify, publish the `presentation_site/`
   folder (a `netlify.toml` is already included at the repo root — full
   setup + deploy steps are in the [repo README](../README.md#deploying-to-netlify)).

## Behaviors

- **Autoplay** (on by default): advances every `autoplayDelay` ms.
- **Loop** (on by default): wraps around; when off, stops at the last slide.
- Both are toggled by the two glass switches in the bottom-right corner.
- **Hidden iframe slides**: any `type: "iframe"` slide is excluded from the
  autoplay sequence, dots, and loop. It only appears when another slide's
  "See more" CTA opens it; a Close button on the iframe slide returns to the
  parent. Autoplay pauses while the iframe is open.
- **State is in-memory only** — toggles, open iframes, and loaded iframes
  reset on a page reload.

## Local preview

```sh
cd presentation_site
python3 -m http.server 8000
# open http://localhost:8000
```
