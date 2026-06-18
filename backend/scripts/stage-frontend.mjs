import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, '..');
const frontendRoot = path.join(backendRoot, '..', 'frontend');
const distDir = path.join(frontendRoot, 'dist');
const publicDir = path.join(backendRoot, 'public');

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

if (!fs.existsSync(path.join(distDir, 'index.html'))) {
    console.error('frontend/dist/index.html is missing — run frontend build first');
    process.exit(1);
}

if (fs.existsSync(publicDir)) {
    fs.rmSync(publicDir, { recursive: true, force: true });
}

fs.mkdirSync(publicDir, { recursive: true });
copyRecursive(distDir, publicDir);

const srcDir = path.join(frontendRoot, 'src');
if (fs.existsSync(srcDir)) {
    copyRecursive(srcDir, path.join(publicDir, 'src'));
}

for (const file of ['admin.html']) {
    const source = path.join(frontendRoot, file);
    if (fs.existsSync(source)) {
        fs.copyFileSync(source, path.join(publicDir, file));
    }
}

console.log('Frontend assets staged in backend/public');
