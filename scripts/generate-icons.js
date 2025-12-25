import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const iconDir = join(rootDir, 'public', 'icons');

// Ensure icons directory exists
mkdirSync(iconDir, { recursive: true });

// Read the SVG logo
const svgPath = join(rootDir, 'BSLogoBlack.svg');
const svgBuffer = readFileSync(svgPath);

// Generate icons at different sizes
const sizes = [192, 512];

for (const size of sizes) {
  const padding = Math.floor(size * 0.15);
  const logoSize = size - (padding * 2);

  // Create a white background with the logo centered
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 26, g: 26, b: 46, alpha: 1 } // #1a1a2e theme color
    }
  })
  .composite([{
    input: await sharp(svgBuffer)
      .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .negate({ alpha: false }) // Invert to white
      .toBuffer(),
    gravity: 'center'
  }])
  .png()
  .toFile(join(iconDir, `icon-${size}.png`));

  console.log(`Generated icon-${size}.png`);
}

console.log('Done!');
