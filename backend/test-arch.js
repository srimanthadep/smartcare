import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const arch = require('archiver');
console.log('type:', typeof arch);
console.log('keys:', Object.keys(arch));
if (typeof arch === 'object' && arch.default) {
    console.log('has default, type of default:', typeof arch.default);
}
