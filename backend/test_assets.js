import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.join(__dirname, 'assets/logo.png');
const SIGN_PATH = path.join(__dirname, 'assets/sign.png');
const STAMP_PATH = path.join(__dirname, 'assets/stamp.png');

console.log('Test Script - __dirname:', __dirname);
console.log('LOGO_PATH:', LOGO_PATH, 'Exists:', fs.existsSync(LOGO_PATH));
console.log('SIGN_PATH:', SIGN_PATH, 'Exists:', fs.existsSync(SIGN_PATH));
console.log('STAMP_PATH:', STAMP_PATH, 'Exists:', fs.existsSync(STAMP_PATH));
