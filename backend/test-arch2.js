import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const arch = require('archiver');
console.log(arch);
