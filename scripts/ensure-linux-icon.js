/**
 * Создаёт build/icon.png 256×256 для Linux-сборки (electron-builder).
 * Порядок: ImageMagick → sharp (из icon.png/icon.ico) → однотонный PNG.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execSync } = require('child_process');

const icoPath = path.join(__dirname, '..', 'build', 'icon.ico');
const pngPath = path.join(__dirname, '..', 'build', 'icon.png');

const MIN_SIZE = 256;

function readPngDimensions(filePath) {
  const b = fs.readFileSync(filePath);
  if (b.length < 24 || b[0] !== 0x89) return null;
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

function isPngLargeEnough(filePath) {
  try {
    const dim = readPngDimensions(filePath);
    if (!dim) return false;
    return dim.width >= MIN_SIZE && dim.height >= MIN_SIZE;
  } catch {
    return false;
  }
}

function crc32Table() {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
    }
    t[n] = c >>> 0;
  }
  return t;
}

const CRC_TAB = crc32Table();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = (c >>> 8) ^ CRC_TAB[(c ^ buf[i]) & 0xff];
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

/** Однотонный RGB 256×256, без внешних зависимостей */
function solidPng256(r = 0x2d, g = 0x6c, b = 0xb5) {
  const w = 256;
  const h = 256;
  const row = 1 + w * 3;
  const raw = Buffer.alloc(row * h);
  for (let y = 0; y < h; y++) {
    const off = y * row;
    raw[off] = 0;
    for (let x = 0; x < w; x++) {
      const p = off + 1 + x * 3;
      raw[p] = r;
      raw[p + 1] = g;
      raw[p + 2] = b;
    }
  }
  const idat = zlib.deflateSync(raw, { level: 6 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr.writeUInt8(8, 8);
  ihdr.writeUInt8(2, 9);
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', idat), pngChunk('IEND', Buffer.alloc(0))]);
}

function writeFallbackPng() {
  fs.writeFileSync(pngPath, solidPng256());
  console.warn('Записан однотонный build/icon.png 256×256 (установите ImageMagick или sharp).');
}

async function resizeWithSharp(inputPath) {
  const sharp = require('sharp');
  const tmp = `${pngPath}.tmp`;
  await sharp(inputPath)
    .resize(MIN_SIZE, MIN_SIZE, {
      fit: 'contain',
      position: 'center',
      background: { r: 245, g: 240, b: 232, alpha: 1 },
    })
    .png()
    .toFile(tmp);
  fs.renameSync(tmp, pngPath);
  console.log(`icon.png ${MIN_SIZE}×${MIN_SIZE} (sharp, из ${path.basename(inputPath)})`);
}

function tryImageMagick(inputPath) {
  execSync(`convert "${inputPath}" -resize ${MIN_SIZE}x${MIN_SIZE} "${pngPath}"`, { stdio: 'inherit' });
  console.log('icon.png создан (convert)');
}

function tryMagick(inputPath) {
  execSync(`magick "${inputPath}" -resize ${MIN_SIZE}x${MIN_SIZE} "${pngPath}"`, { stdio: 'inherit' });
  console.log('icon.png создан (magick)');
}

async function main() {
  if (fs.existsSync(pngPath) && isPngLargeEnough(pngPath)) {
    const dim = readPngDimensions(pngPath);
    console.log(`icon.png уже существует (${dim.width}×${dim.height})`);
    return;
  }

  const inputPath = fs.existsSync(pngPath) ? pngPath : icoPath;
  if (!fs.existsSync(inputPath)) {
    console.error('Ошибка: нужен build/icon.png или build/icon.ico');
    process.exit(1);
  }

  try {
    tryImageMagick(inputPath);
    return;
  } catch {
    /* convert недоступен */
  }

  try {
    tryMagick(inputPath);
    return;
  } catch {
    /* magick недоступен */
  }

  try {
    await resizeWithSharp(inputPath);
    return;
  } catch {
    /* sharp не установлен */
  }

  writeFallbackPng();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
