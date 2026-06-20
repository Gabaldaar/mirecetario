import fs from 'fs';
import sharp from 'sharp';

const srcImg = 'C:\\Users\\gabal\\.gemini\\antigravity\\brain\\aed60b37-4f6b-4a08-990b-026c3a5b8a97\\media__1781995885625.png';

async function main() {
  console.log('Generating app icons and favicon...');

  // 1. Generate icon-192.png (192x192)
  await sharp(srcImg)
    .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toFile('public/icon-192.png');
  console.log('Generated: public/icon-192.png');

  // 2. Generate icon-512.png (512x512)
  await sharp(srcImg)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toFile('public/icon-512.png');
  console.log('Generated: public/icon-512.png');

  // 3. Generate icon-192-maskable.png (192x192, padded to 70% size, white background is standard/clean)
  await sharp(srcImg)
    .resize(Math.round(192 * 0.75), Math.round(192 * 0.75), { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .extend({
      top: Math.round(192 * 0.125),
      bottom: Math.round(192 * 0.125),
      left: Math.round(192 * 0.125),
      right: Math.round(192 * 0.125),
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .resize(192, 192)
    .toFile('public/icon-192-maskable.png');
  console.log('Generated: public/icon-192-maskable.png');

  // 4. Generate icon-512-maskable.png (512x512, padded to 70% size, white background)
  await sharp(srcImg)
    .resize(Math.round(512 * 0.75), Math.round(512 * 0.75), { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .extend({
      top: Math.round(512 * 0.125),
      bottom: Math.round(512 * 0.125),
      left: Math.round(512 * 0.125),
      right: Math.round(512 * 0.125),
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .resize(512, 512)
    .toFile('public/icon-512-maskable.png');
  console.log('Generated: public/icon-512-maskable.png');

  // 5. Generate favicon.svg (contains base64 encoded PNG)
  const base64Data = fs.readFileSync(srcImg).toString('base64');
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192">
  <image href="data:image/png;base64,${base64Data}" x="0" y="0" width="192" height="192"/>
</svg>`;
  fs.writeFileSync('public/favicon.svg', svgContent);
  console.log('Generated: public/favicon.svg');

  console.log('All assets generated successfully!');
}

main().catch(err => {
  console.error('Error during generation:', err);
});
