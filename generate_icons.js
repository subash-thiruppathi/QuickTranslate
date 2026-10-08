const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Minimal pure Node PNG generator
function createPng(width, height, renderPixel) {
  const bytesPerPixel = 4; // RGBA
  const rowSize = width * bytesPerPixel;
  const rawData = Buffer.alloc(height * (rowSize + 1));

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = renderPixel(x, y, width, height);
      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', deflated);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(12 + length);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crc = crc32(chunk.slice(4, 8 + length));
  chunk.writeUInt32BE(crc >>> 0, 8 + length);
  return chunk;
}

// CRC32 table & function
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return c ^ 0xffffffff;
}

// Render blue gradient with stylish rounded squircle and icon shape
function renderIcon(x, y, w, h) {
  const nx = x / w;
  const ny = y / h;

  // Center distance
  const cx = nx - 0.5;
  const cy = ny - 0.5;

  // Squircle shape formula: (x^4 + y^4) < r^4
  const radius = 0.44;
  const dist = Math.pow(Math.pow(cx, 4) + Math.pow(cy, 4), 0.25);

  if (dist > radius) {
    // Transparent outside
    return [0, 0, 0, 0];
  }

  // Smooth anti-aliased edge
  let alpha = 255;
  if (dist > radius - 0.04) {
    alpha = Math.round(255 * (1 - (dist - (radius - 0.04)) / 0.04));
  }

  // Linear gradient from #3b82f6 (59, 130, 246) to #1d4ed8 (29, 78, 216)
  const gradT = (nx + ny) / 2;
  let r = Math.round(59 * (1 - gradT) + 29 * gradT);
  let g = Math.round(130 * (1 - gradT) + 78 * gradT);
  let b = Math.round(246 * (1 - gradT) + 216 * gradT);

  // Draw simple white symbol in center: 'A' and Asian character bar hint
  // Letter 'A' in the right/bottom or left
  const inLetterA = (
    // Left diagonal of A
    (nx >= 0.58 && nx <= 0.82 && Math.abs((ny - 0.75) + 2.0 * (nx - 0.70)) < 0.08) ||
    // Right diagonal of A
    (nx >= 0.58 && nx <= 0.82 && Math.abs((ny - 0.75) - 2.0 * (nx - 0.70)) < 0.08) ||
    // Crossbar of A
    (ny >= 0.58 && ny <= 0.64 && nx >= 0.63 && nx <= 0.77) ||
    // Horizontal top bar for translation glyph
    (ny >= 0.28 && ny <= 0.35 && nx >= 0.22 && nx <= 0.68) ||
    // Vertical stem for glyph
    (nx >= 0.42 && nx <= 0.48 && ny >= 0.22 && ny <= 0.65) ||
    // Curved stroke
    (nx >= 0.22 && nx <= 0.45 && ny >= 0.45 && ny <= 0.72 && Math.abs(Math.hypot(nx - 0.42, ny - 0.45) - 0.22) < 0.06)
  );

  if (inLetterA) {
    return [255, 255, 255, alpha];
  }

  return [r, g, b, alpha];
}

// Generate sizes
const sizes = [16, 32, 48, 128];
const iconsDir = path.join(__dirname, 'icons');

sizes.forEach(size => {
  const buf = createPng(size, size, renderIcon);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), buf);
  console.log(`Generated icon${size}.png (${buf.length} bytes)`);
});
