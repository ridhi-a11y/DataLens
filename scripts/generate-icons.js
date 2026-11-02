import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function createPNG(width, height, drawFn) {
  // RGBA buffer: (width * 4 + 1) * height (1 filter byte 0x00 per scanline)
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawFn(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const crcVal = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(crcVal, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: RGBA
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const idat = chunk('IDAT', compressed);
  const iend = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, chunk('IHDR', ihdr), idat, iend]);
}

// Generate modern icon: DataLens theme (indigo-violet rounded squircle with magnifying lens & data grid)
function drawIcon(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const r = w * 0.44;

  // Distance from center
  const dx = Math.abs(x - cx);
  const dy = Math.abs(y - cy);
  const cornerR = w * 0.28;

  // Squircle check
  let inside = false;
  if (dx <= cx - cornerR && dy <= cy) inside = true;
  else if (dy <= cy - cornerR && dx <= cx) inside = true;
  else {
    const cdx = dx - (cx - cornerR);
    const cdy = dy - (cy - cornerR);
    if (cdx * cdx + cdy * cdy <= cornerR * cornerR) inside = true;
  }

  if (!inside) {
    return [0, 0, 0, 0]; // Transparent
  }

  // Gradient background from Royal Indigo (67, 56, 202) to Vibrant Violet (124, 58, 237)
  const t = (x + y) / (w + h);
  const bgR = Math.round(59 + t * (99 - 59));
  const bgG = Math.round(130 + t * (102 - 130));
  const bgB = Math.round(246 + t * (241 - 246));

  // Lens circle in center
  const ldx = x - cx;
  const ldy = y - (cy - h * 0.04);
  const lensDist = Math.sqrt(ldx * ldx + ldy * ldy);
  const lensR = w * 0.26;
  const ringWidth = Math.max(1.5, w * 0.08);

  // Outer ring of lens
  if (Math.abs(lensDist - lensR) < ringWidth / 2) {
    return [255, 255, 255, 250];
  }

  // Inside lens: subtle lighter grid
  if (lensDist < lensR - ringWidth / 2) {
    // 3x3 data grid lines
    const gridCell = (lensR * 2) / 3;
    const gx = (ldx + lensR) % gridCell;
    const gy = (ldy + lensR) % gridCell;
    if (gx < 1.5 || gy < 1.5) {
      return [255, 255, 255, 180];
    }
    return [255, 255, 255, 40];
  }

  // Handle of magnifying lens
  const hx = x - (cx + lensR * 0.7);
  const hy = y - (cy + lensR * 0.7);
  const handleDist = Math.abs(hx - hy);
  if (hx > 0 && hy > 0 && hx + hy < w * 0.38 && handleDist < ringWidth * 0.8) {
    return [255, 255, 255, 240];
  }

  return [bgR, bgG, bgB, 255];
}

const outDir = path.resolve('public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

for (const size of [16, 32, 48, 128]) {
  const buf = createPNG(size, size, drawIcon);
  fs.writeFileSync(path.join(outDir, `icon${size}.png`), buf);
  console.log(`Generated icon${size}.png (${buf.length} bytes)`);
}
