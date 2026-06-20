import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcPath = path.resolve(__dirname, '../public/favicon.svg');
const destDir = path.resolve(__dirname, '../public');

async function generate() {
  console.log('Generating PWA icons from favicon.svg...');

  // Ensure output directory exists
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  // Regular 192x192
  await sharp(srcPath)
    .resize(192, 192)
    .png()
    .toFile(path.join(destDir, 'icon-192.png'));
  console.log('Created icon-192.png');

  // Regular 512x512
  await sharp(srcPath)
    .resize(512, 512)
    .png()
    .toFile(path.join(destDir, 'icon-512.png'));
  console.log('Created icon-512.png');

  // Maskable 192x192: 192px canvas with background, overlaying resized svg to 144px (192 * 0.75)
  const svg192Resized = await sharp(srcPath)
    .resize(144, 144)
    .toBuffer();

  await sharp({
    create: {
      width: 192,
      height: 192,
      channels: 4,
      background: '#070b13'
    }
  })
    .composite([{ input: svg192Resized, gravity: 'center' }])
    .png()
    .toFile(path.join(destDir, 'icon-192-maskable.png'));
  console.log('Created icon-192-maskable.png');

  // Maskable 512x512: 512px canvas with background, overlaying resized svg to 384px (512 * 0.75)
  const svg512Resized = await sharp(srcPath)
    .resize(384, 384)
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: '#070b13'
    }
  })
    .composite([{ input: svg512Resized, gravity: 'center' }])
    .png()
    .toFile(path.join(destDir, 'icon-512-maskable.png'));
  console.log('Created icon-512-maskable.png');

  console.log('All PWA icons generated successfully!');
}

generate().catch(console.error);
