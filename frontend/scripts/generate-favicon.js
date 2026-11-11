/*
 * Generates the favicon set from one vector definition.
 *
 * Run with: node scripts/generate-favicon.js
 *
 * Outputs (frontend/public):
 *   favicon.svg
 *   favicon-16.png, favicon-32.png, favicon-48.png
 *   apple-touch-icon.png (180x180)
 *   favicon.ico (16/32/48/64 BMP frames)
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const BACKGROUND = '#0f766e';
const FOREGROUND = '#ffffff';
const CORNER_RADIUS = 7.5;

const CIRCLES = [
  { cx: 15.8, cy: 10.8, r: 4.3 },
  { cx: 8.2, cy: 12.9, r: 3.9 },
  { cx: 23.2, cy: 14.3, r: 4.1 },
];

const STROKES = [
  {
    width: 2.4,
    cubic: [15.6, 20.9, 13.2, 20.8, 10.4, 18.9, 9.4, 16.4],
  },
  {
    width: 2.4,
    cubic: [17.4, 21.0, 19.4, 20.6, 21.2, 20.0, 23.0, 18.4],
  },
  {
    width: 2.2,
    line: [16, 15.2, 16, 28.6],
  },
];

function cubic(x0, y0, x1, y1, x2, y2, x3, y3, steps = 40) {
  const points = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const u = 1 - t;
    points.push({
      x: u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
      y: u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
    });
  }
  return points;
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const BG = hexToRgb(BACKGROUND);
const FG = hexToRgb(FOREGROUND);

function strokePoints(stroke) {
  if (stroke.line) {
    const [x0, y0, x1, y1] = stroke.line;
    return [
      { x: x0, y: y0 },
      { x: x1, y: y1 },
    ];
  }
  return cubic(...stroke.cubic);
}

function insideRoundedRect(x, y, size) {
  if (x < 0 || y < 0 || x > size || y > size) return false;
  const r = (CORNER_RADIUS / 32) * size;
  const cx = Math.min(Math.max(x, r), size - r);
  const cy = Math.min(Math.max(y, r), size - r);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

function distanceToSegment(px, py, a, b) {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const wx = px - a.x;
  const wy = py - a.y;
  const len2 = vx * vx + vy * vy;
  const t = len2 === 0 ? 0 : Math.min(1, Math.max(0, (wx * vx + wy * vy) / len2));
  const dx = px - (a.x + t * vx);
  const dy = py - (a.y + t * vy);
  return Math.sqrt(dx * dx + dy * dy);
}

function insideTree(x, y, scale) {
  for (const c of CIRCLES) {
    const dx = x / scale - c.cx;
    const dy = y / scale - c.cy;
    if (dx * dx + dy * dy <= c.r * c.r) return true;
  }
  for (const stroke of STROKES) {
    const half = stroke.width / 2;
    const points = strokePoints(stroke);
    for (let i = 0; i < points.length - 1; i += 1) {
      if (distanceToSegment(x / scale, y / scale, points[i], points[i + 1]) <= half) {
        return true;
      }
    }
  }
  return false;
}

function render(size, supersample = 8) {
  const big = size * supersample;
  const rgba = Buffer.alloc(size * size * 4);
  const inv = 1 / (supersample * supersample);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < supersample; sy += 1) {
        for (let sx = 0; sx < supersample; sx += 1) {
          const px = x * supersample + sx + 0.5;
          const py = y * supersample + sy + 0.5;
          if (!insideRoundedRect(px, py, big)) continue;
          const tree = insideTree(px, py, big / 32);
          const color = tree ? FG : BG;
          r += color[0];
          g += color[1];
          b += color[2];
          a += 1;
        }
      }
      if (a === 0) continue;
      const i = (y * size + x) * 4;
      rgba[i] = Math.round(r / a);
      rgba[i + 1] = Math.round(g / a);
      rgba[i + 2] = Math.round(b / a);
      rgba[i + 3] = Math.round(a * inv * 255);
    }
  }
  return rgba;
}

let crcTable = null;
function crc32(buf) {
  if (!crcTable) {
    crcTable = [];
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let n = 0; n < buf.length; n += 1) crc = crcTable[(crc ^ buf[n]) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typed = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([len, typed, crc]);
}

function encodePng(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function encodeBmpFrame(size, rgba) {
  const header = Buffer.alloc(40);
  header.writeUInt32LE(40, 0);
  header.writeInt32LE(size, 4);
  header.writeInt32LE(size * 2, 8);
  header.writeUInt16LE(1, 12);
  header.writeUInt16LE(32, 14);
  header.writeUInt32LE(0, 16);
  header.writeUInt32LE(size * size * 4, 20);

  const xor = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const src = ((size - 1 - y) * size + x) * 4;
      const dst = (y * size + x) * 4;
      xor[dst] = rgba[src + 2];
      xor[dst + 1] = rgba[src + 1];
      xor[dst + 2] = rgba[src];
      xor[dst + 3] = rgba[src + 3];
    }
  }

  const maskRow = Math.ceil(size / 32) * 4;
  const mask = Buffer.alloc(maskRow * size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const alpha = rgba[(y * size + x) * 4 + 3];
      if (alpha === 0) {
        mask[y * maskRow + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
  }

  return Buffer.concat([header, xor, mask]);
}

function encodeIco(frames) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frames.length, 4);

  const entries = [];
  let offset = 6 + frames.length * 16;
  for (const frame of frames) {
    const entry = Buffer.alloc(16);
    entry[0] = frame.size >= 256 ? 0 : frame.size;
    entry[1] = frame.size >= 256 ? 0 : frame.size;
    entry[2] = 0;
    entry[3] = 0;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(frame.data.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += frame.data.length;
  }

  return Buffer.concat([header, ...entries, ...frames.map((f) => f.data)]);
}

function svgSource() {
  const circles = CIRCLES.map(
    (c) => `<circle cx="${c.cx}" cy="${c.cy}" r="${c.r}" stroke="none"/>`
  ).join('');
  const strokes = STROKES.map((s) => {
    const d = s.line
      ? `M${s.line[0]} ${s.line[1]}L${s.line[2]} ${s.line[3]}`
      : `M${s.cubic[0]} ${s.cubic[1]}C${s.cubic[2]} ${s.cubic[3]} ${s.cubic[4]} ${s.cubic[5]} ${s.cubic[6]} ${s.cubic[7]}`;
    return `<path d="${d}" fill="none" stroke-width="${s.width}"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" role="img" aria-label="Family Tree">
  <rect width="32" height="32" rx="${CORNER_RADIUS}" fill="${BACKGROUND}"/>
  <g fill="${FOREGROUND}" stroke="${FOREGROUND}" stroke-linecap="round" stroke-linejoin="round">
    ${circles}${strokes}
  </g>
</svg>
`;
}

fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.svg'), svgSource());

for (const size of [16, 32, 48]) {
  const rgba = render(size);
  fs.writeFileSync(path.join(PUBLIC_DIR, `favicon-${size}.png`), encodePng(size, rgba));
}

fs.writeFileSync(path.join(PUBLIC_DIR, 'apple-touch-icon.png'), encodePng(180, render(180)));

const icoFrames = [16, 32, 48, 64].map((size) => ({
  size,
  data: encodeBmpFrame(size, render(size)),
}));
fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.ico'), encodeIco(icoFrames));

console.log('Favicon assets generated.');
