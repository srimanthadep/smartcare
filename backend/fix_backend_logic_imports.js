import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseDir = path.resolve(__dirname, 'src/modules');

function walk(dir, callback) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
    });
}

walk(baseDir, (filePath) => {
    if (!filePath.endsWith('.js')) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // 1. Fix cross-module service imports
    content = content.replace(/from ['"]\.\.\/services\/whatsapp\.service\.js['"]/g, "from '../whatsapp/whatsapp.service.js'");
    content = content.replace(/from ['"]\.\.\/services\/ai\.service\.js['"]/g, "from '../ai/ai.service.js'");
    content = content.replace(/from ['"]\.\.\/services\/medicine\.service\.js['"]/g, "from '../prescriptions/medicine.service.js'");
    
    // 2. Fix relative imports within the same module (routes -> controller/validator)
    if (filePath.endsWith('.routes.js')) {
        const moduleName = path.basename(path.dirname(filePath));
        // Replace ../X.controller.js with ./X.controller.js
        content = content.replace(/from ['"]\.\.\/([a-zA-Z0-9_-]+)\.controller\.js['"]/g, "from './$1.controller.js'");
        // Replace ../validators/X.validator.js with ./X.validator.js
        content = content.replace(/from ['"]\.\.\/validators\/([a-zA-Z0-9_-]+)\.validator\.js['"]/g, "from './$1.validator.js'");
    }

    // 3. Fix shared service imports if they are still using old paths
    content = content.replace(/from ['"]\.\.\/\.\.\/services\/db\.service\.js['"]/g, "from '../../core/db/db.service.js'");
    content = content.replace(/from ['"]\.\.\/\.\.\/services\/email\.service\.js['"]/g, "from '../../shared/services/email.service.js'");
    content = content.replace(/from ['"]\.\.\/\.\.\/services\/pdf\.service\.js['"]/g, "from '../../shared/services/pdf.service.js'");
    content = content.replace(/from ['"]\.\.\/\.\.\/services\/socket\.service\.js['"]/g, "from '../../shared/sockets/socket.service.js'");
    content = content.replace(/from ['"]\.\.\/\.\.\/services\/scheduler\.service\.js['"]/g, "from '../../shared/services/scheduler.service.js'");
    content = content.replace(/from ['"]\.\.\/\.\.\/services\/backupService\.js['"]/g, "from '../../shared/services/backup.service.js'");
    content = content.replace(/from ['"]\.\.\/\.\.\/services\/jobQueue\.service\.js['"]/g, "from '../../shared/queue/jobQueue.service.js'");
    content = content.replace(/from ['"]\.\.\/\.\.\/services\/migrationService\.js['"]/g, "from '../../core/db/migration.service.js'");

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated module imports in ${filePath}`);
    }
});
