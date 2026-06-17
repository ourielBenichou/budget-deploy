import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.join(__dirname, '../../frontend');
const distIndex = path.join(frontendDir, 'dist/index.html');

if (fs.existsSync(distIndex)) {
    console.log('Frontend build found at frontend/dist');
    process.exit(0);
}

console.log('Frontend dist missing — building Vite bundle...');

const env = {
    ...process.env,
    NODE_OPTIONS: process.env.NODE_OPTIONS || '--use-system-ca'
};

execSync('npm install && npm run build', {
    cwd: frontendDir,
    stdio: 'inherit',
    env
});

if (!fs.existsSync(distIndex)) {
    console.error('Frontend build failed: frontend/dist/index.html not created');
    process.exit(1);
}

console.log('Frontend build completed successfully');
