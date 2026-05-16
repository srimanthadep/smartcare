import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseDir = path.resolve(__dirname, 'src');

function walk(dir, callback) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
    });
}

walk(baseDir, (filePath) => {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // 1. Fix old aliases
    content = content.replace(/from ['"]@\/components\/ui\/([^'"]+)['"]/g, "from '@/shared/ui/$1'");
    content = content.replace(/from ['"]@\/components\/([^'"]+)['"]/g, "from '@/shared/components/$1'");
    content = content.replace(/from ['"]@\/hooks\/([^'"]+)['"]/g, "from '@/shared/hooks/$1'");
    content = content.replace(/from ['"]@\/utils\/([^'"]+)['"]/g, "from '@/shared/utils/$1'");
    content = content.replace(/from ['"]@\/types\/([^'"]+)['"]/g, "from '@/shared/types/$1'");
    content = content.replace(/from ['"]@\/lib\/([^'"]+)['"]/g, "from '@/shared/lib/$1'");
    content = content.replace(/from ['"]@\/contexts\/([^'"]+)['"]/g, "from '@/shared/contexts/$1'");
    content = content.replace(/from ['"]@\/data\/([^'"]+)['"]/g, "from '@/shared/data/$1'");
    content = content.replace(/from ['"]@\/pages\/([^'"]+)['"]/g, "from '@/modules/$1'");

    // 2. Fix relative imports that are now broken (./ui, ../ui, ./hooks, etc.)
    // These are tricky because we moved many files. 
    // Safest bet is to convert relative imports of shared folders to @/shared aliases.
    
    const sharedFolders = ['ui', 'hooks', 'utils', 'types', 'lib', 'contexts', 'data', 'components'];
    sharedFolders.forEach(folder => {
        const regex = new RegExp(`from ['"]\\.\\.?/${folder}/([^'"]+)['"]`, 'g');
        if (folder === 'ui') {
            content = content.replace(regex, "from '@/shared/ui/$1'");
        } else if (folder === 'components') {
             // Only if it's NOT in src/app/components
             if (!filePath.includes('src/app/components')) {
                content = content.replace(regex, "from '@/shared/components/$1'");
             }
        } else {
            content = content.replace(regex, `from '@/shared/${folder}/$1'`);
        }
    });

    // Special case for ./ui/button -> @/shared/ui/button
    content = content.replace(/from ['"]\.\.?\/ui\/([^'"]+)['"]/g, "from '@/shared/ui/$1'");

    // Cleanup double folders
    content = content.replace(/@\/shared\/ui\/ui\//g, "@/shared/ui/");
    content = content.replace(/@\/shared\/hooks\/hooks\//g, "@/shared/hooks/");
    content = content.replace(/@\/shared\/utils\/utils\//g, "@/shared/utils/");

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated imports in ${filePath}`);
    }
});
