#!/usr/bin/env node
/**
 * Generate PWA icons from SVG sources.
 * Run: node scripts/generate-pwa-icons.mjs
 *
 * Outputs:
 *  - public/icon-192.png         (192x192, regular)
 *  - public/icon-512.png         (512x512, regular)
 *  - public/icon-maskable-192.png (192x192, Android adaptive, 40% safe zone)
 *  - public/icon-maskable-512.png (512x512, Android adaptive, 40% safe zone)
 *  - public/apple-touch-icon.png (180x180, iOS home screen)
 *  - public/favicon-32.png       (32x32, browser tab fallback)
 *  - public/favicon-16.png       (16x16, browser tab fallback)
 */
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '..', 'public');

const sources = [
  { svg: 'icon.svg', outputs: [{ name: 'icon-192.png', size: 192 }, { name: 'icon-512.png', size: 512 }] },
  { svg: 'icon-maskable.svg', outputs: [{ name: 'icon-maskable-192.png', size: 192 }, { name: 'icon-maskable-512.png', size: 512 }] },
  { svg: 'apple-touch-icon.svg', outputs: [{ name: 'apple-touch-icon.png', size: 180 }] },
  { svg: 'favicon.svg', outputs: [{ name: 'favicon-32.png', size: 32 }, { name: 'favicon-16.png', size: 16 }] },
];

let total = 0;
for (const { svg, outputs } of sources) {
  const svgPath = resolve(publicDir, svg);
  const buf = readFileSync(svgPath);
  for (const { name, size } of outputs) {
    const out = resolve(publicDir, name);
    await sharp(buf, { density: 384 })
      .resize(size, size, { fit: 'cover', kernel: 'lanczos3' })
      .png({ compressionLevel: 9, quality: 100, palette: false })
      .toFile(out);
    console.log(`  ${name.padEnd(28)} ${size}x${size}`);
    total += 1;
  }
}

console.log(`\nGenerated ${total} PNG icons in public/`);
