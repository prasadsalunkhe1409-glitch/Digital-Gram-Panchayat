/**
 * Generates the PWA icon set (no image dependencies) — the Gram Panchayat mark in white on a
 * solid brand-navy field, inside the maskable 80% safe zone. Emits regular and maskable PNGs
 * plus an Apple touch icon. Run: `node scripts/gen-icons.mjs`.
 *
 * The geometry is the same as frontend/shared/src/assets/logo.svg, in its 96x96 user space.
 * The app icon and the in-app logo were previously unrelated drawings that merely shared a
 * colour — a ring-and-dot emblem here, a building there — so they are kept in step by hand:
 * change the SVG, change SYMBOL below, run this script.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
mkdirSync(OUT, { recursive: true });

// Brand palette.
const NAVY = [30, 59, 139]; // #1E3B8B
const WHITE = [255, 255, 255];

// The mark, in logo.svg's 96x96 user space: pedimented roof, entablature, three columns,
// foundation. BOX is its bounding box, used to centre it inside each icon's safe area.
const TRI = [
  [48, 18],
  [80, 40],
  [16, 40],
];
const RECTS = [
  { x: 20, y: 40, w: 56, h: 8, r: 1 },
  { x: 20, y: 48, w: 10, h: 20, r: 0 },
  { x: 43, y: 48, w: 10, h: 20, r: 0 },
  { x: 66, y: 48, w: 10, h: 20, r: 0 },
  { x: 16, y: 68, w: 64, h: 9, r: 2 },
];
const BOX = { x: 16, y: 18, w: 64, h: 59 };
const SS = 4; // supersamples per axis — enough for clean edges at 192px and up

function inTriangle(px, py) {
  const [[ax, ay], [bx, by], [cx, cy]] = TRI;
  const s = (ax - cx) * (py - cy) - (ay - cy) * (px - cx);
  const t = (bx - ax) * (py - ay) - (by - ay) * (px - ax);
  if (s < 0 !== t < 0 && s !== 0 && t !== 0) return false;
  const d = (cx - bx) * (py - by) - (cy - by) * (px - bx);
  return d === 0 || d < 0 === s + t <= 0;
}

function inRect(px, py, { x, y, w, h, r }) {
  if (px < x || px > x + w || py < y || py > y + h) return false;
  if (!r) return true;
  if (px >= x + r && px <= x + w - r) return true;
  if (py >= y + r && py <= y + h - r) return true;
  const qx = Math.min(Math.max(px, x + r), x + w - r);
  const qy = Math.min(Math.max(py, y + r), y + h - r);
  return (px - qx) ** 2 + (py - qy) ** 2 <= r * r;
}

const inSymbol = (px, py) => inTriangle(px, py) || RECTS.some((rc) => inRect(px, py, rc));

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function pngFromRGBA(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // raw scanlines, each prefixed with filter byte 0
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function draw(size, { padding }) {
  const rgba = Buffer.alloc(size * size * 4);
  // Fit the mark's bounding box into the safe square, preserving its aspect ratio.
  const safe = size * (1 - padding * 2);
  const scale = safe / BOX.w;
  const drawnH = BOX.h * scale;
  const offX = (size - safe) / 2 - BOX.x * scale;
  const offY = (size - drawnH) / 2 - BOX.y * scale;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let hits = 0;
      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          const ux = (x + (sx + 0.5) / SS - offX) / scale;
          const uy = (y + (sy + 0.5) / SS - offY) / scale;
          if (inSymbol(ux, uy)) hits += 1;
        }
      }
      const t = hits / (SS * SS);
      const i = (y * size + x) * 4;
      for (let k = 0; k < 3; k += 1) rgba[i + k] = Math.round(t * WHITE[k] + (1 - t) * NAVY[k]);
      rgba[i + 3] = 255;
    }
  }
  return pngFromRGBA(size, rgba);
}

const targets = [
  { file: 'icon-192.png', size: 192, padding: 0.08 },
  { file: 'icon-512.png', size: 512, padding: 0.08 },
  { file: 'maskable-192.png', size: 192, padding: 0.18 },
  { file: 'maskable-512.png', size: 512, padding: 0.18 },
  { file: 'apple-touch-icon.png', size: 180, padding: 0.1 },
];

for (const t of targets) {
  writeFileSync(join(OUT, t.file), draw(t.size, { padding: t.padding }));
  process.stdout.write(`wrote icons/${t.file}\n`);
}
