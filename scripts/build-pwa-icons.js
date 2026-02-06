'use strict';

const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const LOGO_PATH = path.join(ROOT, 'images', 'logo-kab-cirebon.png');
const ICONS_DIR = path.join(ROOT, 'icons');
const BACKGROUND = '#166534';
const LOGO_SCALE = 0.8;
const SIZES = [192, 512];

async function buildIcons() {
  if (!fs.existsSync(LOGO_PATH)) {
    console.error('Logo not found:', LOGO_PATH);
    process.exit(1);
  }
  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
  }

  const logoMeta = await sharp(LOGO_PATH).metadata();
  const logoW = logoMeta.width;
  const logoH = logoMeta.height;

  for (const size of SIZES) {
    const inner = Math.round(size * LOGO_SCALE);
    const w = inner;
    const h = Math.round(inner * (logoH / logoW));
    const left = Math.round((size - w) / 2);
    const top = Math.round((size - h) / 2);

    const logoResized = await sharp(LOGO_PATH)
      .resize(w, h)
      .toBuffer();

    const background = Buffer.from(
      `<svg width="${size}" height="${size}"><rect width="100%" height="100%" fill="${BACKGROUND}"/></svg>`
    );

    await sharp(background)
      .composite([{ input: logoResized, left, top }])
      .png()
      .toFile(path.join(ICONS_DIR, `icon-${size}.png`));

    console.log('Written:', path.join(ICONS_DIR, `icon-${size}.png`));
  }
}

buildIcons().catch((err) => {
  console.error(err);
  process.exit(1);
});
