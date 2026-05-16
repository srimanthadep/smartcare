import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsPath = path.resolve(__dirname, '../../shared/services');
console.log('Current service dir:', assetsPath);

const targetAssets = path.resolve(assetsPath, '../../../assets');
console.log('Target assets dir:', targetAssets);
console.log('Contents:', fs.existsSync(targetAssets) ? fs.readdirSync(targetAssets) : 'Does not exist');
