#!/usr/bin/env node
/* ============================================================================
 * gen-placeholders.mjs — writes drafting-style SVG placeholders for every
 * project in content/projects.js.
 *
 *   node site/tools/gen-placeholders.mjs
 *
 * Deterministic: re-running produces byte-identical files, so a placeholder
 * pass never shows up as a spurious diff. These stand in until the client's
 * real photography and drawings arrive — see site/README.md.
 * ========================================================================== */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ordered } from "../content/projects.js";

const SITE = join(dirname(fileURLToPath(import.meta.url)), "..");

const BG = "#0e0e13";
const INK = "#e8e6e1";
const ACCENT = "#c9a86a";
const DIM = "rgba(255,255,255,0.045)";
const FONT = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

/* ---------------------------------------------------------------- helpers -- */

/** Deterministic PRNG (mulberry32 over an FNV-1a hash) — same seed, same drawing. */
function seeded(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const fmt = (n) => Math.round(n * 100) / 100;

/* ------------------------------------------------------------- the drawing - */

function planSvg({ seed, w, h, label, sub, tag }) {
  const rnd = seeded(seed);
  const parts = [];

  /* faint drafting grid */
  const step = 40;
  for (let x = step; x < w; x += step) {
    parts.push(`<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="${DIM}" stroke-width="1"/>`);
  }
  for (let y = step; y < h; y += step) {
    parts.push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="${DIM}" stroke-width="1"/>`);
  }

  /* the plan sits in a margin box */
  const pad = Math.round(Math.min(w, h) * 0.13);
  const x0 = pad;
  const y0 = pad;
  const x1 = w - pad;
  const y1 = h - pad - Math.round(h * 0.06);

  /* exterior wall */
  parts.push(
    `<rect x="${x0}" y="${y0}" width="${fmt(x1 - x0)}" height="${fmt(y1 - y0)}" fill="none" stroke="${INK}" stroke-width="3"/>`
  );

  /* a wall with a door gap + swing arc */
  const door = (ax, ay, bx, by, vertical) => {
    const len = vertical ? by - ay : bx - ax;
    if (len < 190) return;

    const gap = 74;
    const at = (vertical ? ay : ax) + 46 + rnd() * (len - 184);
    const seg = (from, to) =>
      vertical
        ? `<line x1="${ax}" y1="${fmt(from)}" x2="${ax}" y2="${fmt(to)}" stroke="${INK}" stroke-width="1.6"/>`
        : `<line x1="${fmt(from)}" y1="${ay}" x2="${fmt(to)}" y2="${ay}" stroke="${INK}" stroke-width="1.6"/>`;

    parts.push(seg(vertical ? ay : ax, at));
    parts.push(seg(at + gap, vertical ? by : bx));

    /* leaf + swing */
    if (vertical) {
      parts.push(
        `<path d="M ${ax} ${fmt(at)} L ${fmt(ax + gap)} ${fmt(at)}" stroke="${INK}" stroke-width="1.4"/>`,
        `<path d="M ${fmt(ax + gap)} ${fmt(at)} A ${gap} ${gap} 0 0 1 ${ax} ${fmt(at + gap)}" fill="none" stroke="${ACCENT}" stroke-width="1.1" opacity="0.75"/>`
      );
    } else {
      parts.push(
        `<path d="M ${fmt(at)} ${ay} L ${fmt(at)} ${fmt(ay - gap)}" stroke="${INK}" stroke-width="1.4"/>`,
        `<path d="M ${fmt(at)} ${fmt(ay - gap)} A ${gap} ${gap} 0 0 1 ${fmt(at + gap)} ${ay}" fill="none" stroke="${ACCENT}" stroke-width="1.1" opacity="0.75"/>`
      );
    }
  };

  /* interior partitions — vertical, then horizontal */
  const vCount = 2 + Math.floor(rnd() * 2);
  for (let i = 1; i <= vCount; i++) {
    const x = x0 + ((x1 - x0) * i) / (vCount + 1) + (rnd() - 0.5) * 26;
    door(x, y0, x, y1, true);
  }

  const hCount = 1 + Math.floor(rnd() * 2);
  for (let i = 1; i <= hCount; i++) {
    const y = y0 + ((y1 - y0) * i) / (hCount + 1) + (rnd() - 0.5) * 26;
    door(x0, y, x1, y, false);
  }

  /* furniture-ish blocks so the rooms read as rooms */
  const blocks = 4 + Math.floor(rnd() * 4);
  for (let i = 0; i < blocks; i++) {
    const bw = 40 + rnd() * 90;
    const bh = 26 + rnd() * 54;
    const bx = x0 + 50 + rnd() * Math.max(10, x1 - x0 - bw - 100);
    const by = y0 + 50 + rnd() * Math.max(10, y1 - y0 - bh - 100);
    if (rnd() > 0.55) {
      parts.push(
        `<circle cx="${fmt(bx)}" cy="${fmt(by)}" r="${fmt(Math.min(bw, bh) / 2)}" fill="none" stroke="${INK}" stroke-width="1.2" opacity="0.55"/>`
      );
    } else {
      parts.push(
        `<rect x="${fmt(bx)}" y="${fmt(by)}" width="${fmt(bw)}" height="${fmt(bh)}" fill="none" stroke="${INK}" stroke-width="1.2" opacity="0.55" rx="3"/>`
      );
    }
  }

  /* dimension line under the plan */
  const dimY = y1 + Math.round(h * 0.035);
  parts.push(
    `<line x1="${x0}" y1="${dimY}" x2="${x1}" y2="${dimY}" stroke="${ACCENT}" stroke-width="1" opacity="0.6"/>`,
    `<line x1="${x0}" y1="${dimY - 7}" x2="${x0}" y2="${dimY + 7}" stroke="${ACCENT}" stroke-width="1" opacity="0.6"/>`,
    `<line x1="${x1}" y1="${dimY - 7}" x2="${x1}" y2="${dimY + 7}" stroke="${ACCENT}" stroke-width="1" opacity="0.6"/>`,
    `<text x="${fmt((x0 + x1) / 2)}" y="${dimY - 10}" fill="${ACCENT}" font-family="${FONT}" font-size="${Math.round(h * 0.022)}" text-anchor="middle" opacity="0.8">${Math.round(6 + rnd() * 22)} 400</text>`
  );

  /* labels */
  const fs = Math.round(h * 0.032);
  const fsSub = Math.round(h * 0.022);
  parts.push(
    `<text x="${x0}" y="${Math.round(y0 - h * 0.045)}" fill="${INK}" font-family="${FONT}" font-size="${fsSub}" letter-spacing="3" opacity="0.6">${tag}</text>`,
    `<text x="${x0}" y="${Math.round(y0 - h * 0.012)}" fill="${INK}" font-family="${FONT}" font-size="${fs}" letter-spacing="1">${label}</text>`,
    `<text x="${x1}" y="${Math.round(y0 - h * 0.012)}" fill="${ACCENT}" font-family="${FONT}" font-size="${fsSub}" letter-spacing="2" text-anchor="end" opacity="0.85">PLACEHOLDER</text>`,
    `<text x="${x1}" y="${dimY - 10}" fill="${INK}" font-family="${FONT}" font-size="${fsSub}" text-anchor="end" opacity="0.45">${sub}</text>`
  );

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${label} — placeholder drawing">`,
    `<rect width="${w}" height="${h}" fill="${BG}"/>`,
    ...parts,
    `</svg>`,
    "",
  ].join("\n");
}

/* -------------------------------------------------------------------- main - */

let written = 0;

for (const p of ordered) {
  const dir = join(SITE, "assets", "img", "projects", p.id);
  await mkdir(dir, { recursive: true });

  const files = [
    ["hero.svg", { w: 1600, h: 900, sub: `${p.subtitle} · ${p.year}` }],
    ...p.gallery.map((g, i) => [
      `${String(i + 1).padStart(2, "0")}.svg`,
      { w: 1200, h: 800, sub: g.alt.replace(/ — placeholder drawing$/, "") },
    ]),
  ];

  for (const [name, opts] of files) {
    const svg = planSvg({
      seed: `${p.id}:${name}`,
      w: opts.w,
      h: opts.h,
      label: p.name.toUpperCase(),
      sub: opts.sub,
      tag: `${p.id} · SHEET ${name.replace(".svg", "")}`,
    });

    await writeFile(join(dir, name), svg, "utf8");
    written++;
  }

  console.log(`  ${p.id}  ${p.name}  →  hero + ${p.gallery.length} gallery`);
}

console.log(`\n${written} placeholder SVG(s) written under site/assets/img/projects/`);
