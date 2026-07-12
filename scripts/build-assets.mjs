import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

await sharp(fileURLToPath(new URL('../assets/app-icon.svg', import.meta.url)))
  .resize(256, 256)
  .png()
  .toFile(fileURLToPath(new URL('../assets/app-icon.png', import.meta.url)));
