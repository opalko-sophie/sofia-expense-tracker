
const zlib = require('zlib');

// Створення полотна RGB
function createCanvas(width, height, background) {
  const pixels = Buffer.alloc(width * height * 3);

  for (let i = 0; i < width * height; i++) {
    pixels[i * 3] = background[0];
    pixels[i * 3 + 1] = background[1];
    pixels[i * 3 + 2] = background[2];
  }

  return { width, height, pixels };
}

function setPixel(canvas, x, y, color) {
  x = Math.round(x);
  y = Math.round(y);

  if (x < 0 || y < 0 ||
      x >= canvas.width || y >= canvas.height) {
    return;
  }

  const i = (y * canvas.width + x) * 3;
  canvas.pixels[i] = color[0];
  canvas.pixels[i + 1] = color[1];
  canvas.pixels[i + 2] = color[2];
}

function fillRect(canvas, x, y, w, h, color) {
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      setPixel(canvas, x + i, y + j, color);
    }
  }
}

// Алгоритм Брезенхема
function drawLine(canvas, x1, y1, x2, y2, color, thickness = 1) {
  x1 = Math.round(x1);
  y1 = Math.round(y1);
  x2 = Math.round(x2);
  y2 = Math.round(y2);

  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  const sx = x1 < x2 ? 1 : -1;
  const sy = y1 < y2 ? 1 : -1;

  let error = dx - dy;
  const half = Math.floor(thickness / 2);

  while (true) {
    fillRect(
      canvas,
      x1 - half, y1 - half,
      thickness, thickness, color
    );

    if (x1 === x2 && y1 === y2) break;

    const e2 = error * 2;

    if (e2 > -dy) {
      error -= dy;
      x1 += sx;
    }

    if (e2 < dx) {
      error += dx;
      y1 += sy;
    }
  }
}

// Цифровий шрифт 3×5
const FONT = {
  '0': ['111','101','101','101','111'],
  '1': ['010','110','010','010','111'],
  '2': ['111','001','111','100','111'],
  '3': ['111','001','111','001','111'],
  '4': ['101','101','111','001','001'],
  '5': ['111','100','111','001','111'],
  '6': ['111','100','111','101','111'],
  '7': ['111','001','001','001','001'],
  '8': ['111','101','111','101','111'],
  '9': ['111','101','111','001','111'],
  '.': ['000','000','000','000','010'],
  '-': ['000','000','111','000','000'],
  ':': ['000','010','000','010','000']
};

function textWidth(text, scale = 2) {
  return Math.max(0, text.length * 4 * scale - scale);
}

function drawText(canvas, text, x, y, color, scale = 2) {
  let cursor = x;

  for (const char of String(text)) {
    const glyph = FONT[char];

    if (glyph) {
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 3; col++) {
          if (glyph[row][col] === '1') {
            fillRect(
              canvas,
              cursor + col * scale,
              y + row * scale,
              scale, scale, color
            );
          }
        }
      }
    }

    cursor += 4 * scale;
  }
}

// Контрольна сума CRC32 для PNG
function crc32(buffer) {
  let crc = 0xFFFFFFFF;

  for (const byte of buffer) {
    crc ^= byte;

    for (let i = 0; i < 8; i++) {
      crc = (crc & 1)
        ? (crc >>> 1) ^ 0xEDB88320
        : crc >>> 1;
    }
  }

  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);

  const content = Buffer.concat([
    Buffer.from(type, 'ascii'), data
  ]);

  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(content));

  return Buffer.concat([
    length, content, checksum
  ]);
}

// Перетворення полотна в PNG
function encodePng(canvas) {
  const header = Buffer.alloc(13);

  header.writeUInt32BE(canvas.width, 0);
  header.writeUInt32BE(canvas.height, 4);
  header[8] = 8;
  header[9] = 2;

  const rowSize = canvas.width * 3;
  const raw = Buffer.alloc(
    (rowSize + 1) * canvas.height
  );

  for (let y = 0; y < canvas.height; y++) {
    canvas.pixels.copy(
      raw,
      y * (rowSize + 1) + 1,
      y * rowSize,
      (y + 1) * rowSize
    );
  }

  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    makeChunk('IHDR', header),
    makeChunk('IDAT', zlib.deflateSync(raw)),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

module.exports = {
  createCanvas,
  setPixel,
  fillRect,
  drawLine,
  drawText,
  textWidth,
  encodePng,
  crc32
};

