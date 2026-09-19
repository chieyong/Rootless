/**
 * Generates the app icons without an image dependency: raw RGBA pixels,
 * deflated into a PNG by hand.
 *
 * The mark is a four-note voicing stack with the root drawn as an empty
 * outline underneath - a rootless voicing.
 *
 * Run with: npm run icons
 */

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

const BACKGROUND = [0x12, 0x14, 0x1a, 0xff];
const ACCENT = [0xe8, 0xb0, 0x4b, 0xff];
const GHOST = [0x39, 0x3f, 0x4d, 0xff];

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;   // bit depth
  header[9] = 6;   // RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0; // no filter
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Draws a rounded rectangle, with antialiased edges. */
function roundedRect(pixels, size, { x, y, width, height, radius, color }) {
  const coverage = (px, py) => {
    // Distance to the rounded rectangle, sampled once per pixel corner region.
    const cx = Math.min(Math.max(px, x + radius), x + width - radius);
    const cy = Math.min(Math.max(py, y + radius), y + height - radius);
    const dx = px - cx;
    const dy = py - cy;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (px < x - 1 || px > x + width + 1 || py < y - 1 || py > y + height + 1) return 0;
    return Math.min(Math.max(radius + 0.5 - distance, 0), 1);
  };

  for (let py = Math.floor(y - 2); py < Math.ceil(y + height + 2); py += 1) {
    if (py < 0 || py >= size) continue;
    for (let px = Math.floor(x - 2); px < Math.ceil(x + width + 2); px += 1) {
      if (px < 0 || px >= size) continue;
      const alpha = coverage(px + 0.5, py + 0.5);
      if (alpha <= 0) continue;
      const index = (py * size + px) * 4;
      for (let c = 0; c < 3; c += 1) {
        pixels[index + c] = Math.round(pixels[index + c] * (1 - alpha) + color[c] * alpha);
      }
      pixels[index + 3] = 0xff;
    }
  }
}

function drawIcon(size, { inset = 0.5 } = {}) {
  const pixels = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i += 1) {
    pixels.set(BACKGROUND, i * 4);
  }

  const barWidth = size * inset;
  const barHeight = size * 0.082;
  const gap = size * 0.052;
  const rows = 5; // one ghost root plus four voiced notes
  const totalHeight = rows * barHeight + (rows - 1) * gap;
  const top = (size - totalHeight) / 2;
  const left = (size - barWidth) / 2;


  for (let row = 0; row < rows; row += 1) {
    const isRoot = row === rows - 1; // the root sits at the bottom
    const width = isRoot ? barWidth : barWidth * [1, 0.86, 0.72, 0.93][row];
    roundedRect(pixels, size, {
      x: left + (barWidth - width) / 2,
      y: top + row * (barHeight + gap),
      width,
      height: barHeight,
      radius: barHeight / 2,
      color: isRoot ? GHOST : ACCENT,
    });
  }

  return encodePng(size, pixels);
}

mkdirSync(OUT_DIR, { recursive: true });

const targets = [
  ['icon-192.png', 192, 0.5],
  ['icon-512.png', 512, 0.5],
  ['apple-touch-icon.png', 180, 0.52],
  // Maskable icons get cropped to a circle, so the mark stays well inside.
  ['maskable-512.png', 512, 0.38],
];

for (const [file, size, inset] of targets) {
  writeFileSync(resolve(OUT_DIR, file), drawIcon(size, { inset }));
  console.log(`wrote icons/${file} (${size}x${size})`);
}
