import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
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

for (const file of ['index.html', 'login.html', 'app.html', 'admin.html', 'privacy.html', 'manifest.json']) {
    const source = path.join(root, file);
    if (fs.existsSync(source)) {
        fs.copyFileSync(source, path.join(www, file));
    }
}

copyRecursive(path.join(root, 'src'), path.join(www, 'src'));
copyRecursive(path.join(root, 'resources'), path.join(www, 'resources'));
copyRecursive(path.join(root, 'public'), path.join(www, 'public'));

console.log('Mobile web assets prepared in www/');
