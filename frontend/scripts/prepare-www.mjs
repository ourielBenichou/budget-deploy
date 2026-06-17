import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const www = path.join(root, 'www');

function copyRecursive(source, target) {
    if (!fs.existsSync(source)) return;
    fs.mkdirSync(target, { recursive: true });

    for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
        const from = path.join(source, entry.name);
        const to = path.join(target, entry.name);

        if (entry.isDirectory()) {
            copyRecursive(from, to);
        } else {
            fs.copyFileSync(from, to);
        }
    }
}

if (fs.existsSync(www)) {
    fs.rmSync(www, { recursive: true, force: true });
}

fs.mkdirSync(www, { recursive: true });

if (fs.existsSync(dist)) {
    copyRecursive(dist, www);
} else {
    console.warn('dist/ not found — run npm run build first');
}

copyRecursive(path.join(root, 'downloads'), path.join(www, 'downloads'));

console.log('Mobile web assets prepared in www/');
