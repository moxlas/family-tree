const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

function readPng(name) {
  const file = fs.readFileSync(path.join(PUBLIC_DIR, name));
  expect(file.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  return {
    width: file.readUInt32BE(16),
    height: file.readUInt32BE(20),
  };
}

function collectOpaqueBounds(ico, dataOffset, width, height, headerSize) {
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;
  const pixelStart = dataOffset + headerSize;
  const rowSize = width * 4;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alphaOffset = pixelStart + (height - 1 - y) * rowSize + x * 4 + 3;
      if (ico[alphaOffset] === 0) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  return { minX, maxX, minY, maxY };
}

describe('favicon assets', () => {
  test('every ICO frame fills its declared size', () => {
    const ico = fs.readFileSync(path.join(PUBLIC_DIR, 'favicon.ico'));
    expect(ico.readUInt16LE(0)).toBe(0);
    expect(ico.readUInt16LE(2)).toBe(1);

    const count = ico.readUInt16LE(4);
    const sizes = [];

    for (let i = 0; i < count; i += 1) {
      const entry = 6 + i * 16;
      const width = ico[entry] || 256;
      const height = ico[entry + 1] || 256;
      const dataOffset = ico.readUInt32LE(entry + 12);
      const headerSize = ico.readUInt32LE(dataOffset);
      const bitmapWidth = ico.readInt32LE(dataOffset + 4);
      const bitmapHeight = ico.readInt32LE(dataOffset + 8) / 2;

      sizes.push(width);
      expect([width, height]).toEqual([bitmapWidth, bitmapHeight]);
      expect(ico.readUInt16LE(dataOffset + 14)).toBe(32);

      const bounds = collectOpaqueBounds(ico, dataOffset, width, height, headerSize);
      expect(bounds.minX).toBe(0);
      expect(bounds.minY).toBe(0);
      expect(bounds.maxX).toBe(width - 1);
      expect(bounds.maxY).toBe(height - 1);
    }

    expect(sizes).toEqual([16, 32, 48, 64]);
  });

  test('PNG icons declare the dimensions browsers expect', () => {
    expect(readPng('favicon-16.png')).toEqual({ width: 16, height: 16 });
    expect(readPng('favicon-32.png')).toEqual({ width: 32, height: 32 });
    expect(readPng('favicon-48.png')).toEqual({ width: 48, height: 48 });
    expect(readPng('apple-touch-icon.png')).toEqual({ width: 180, height: 180 });
  });

  test('the SVG icon uses the brand colour and a full-size view box', () => {
    const svg = fs.readFileSync(path.join(PUBLIC_DIR, 'favicon.svg'), 'utf8');
    expect(svg).toContain('viewBox="0 0 32 32"');
    expect(svg).toContain('#0f766e');
  });
});
