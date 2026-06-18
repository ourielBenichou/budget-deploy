import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, '..');
const frontendRoot = path.join(backendRoot, '..', 'frontend');
const stagedIndex = path.join(backendRoot, 'public/index.html');
const distIndex = path.join(frontendRoot, 'dist/index.html');
const stageScript = path.join(__dirname, 'stage-frontend.mjs');

function runStage() {
    execSync(`node "${stageScript}"`, { stdio: 'inherit' });
}

if (fs.existsSync(stagedIndex)) {
    console.log('Staged frontend found at backend/public');
    process.exit(0);
}

if (fs.existsSync(distIndex)) {
    console.log('Staging existing frontend/dist into backend/public...');
    runStage();
    process.exit(0);
}

if (!fs.existsSync(frontendRoot)) {
    console.warn('Frontend source not found — skipping frontend staging');
    process.exit(0);
}

console.log('Frontend build missing — building and staging Vite bundle...');

const env = {
    ...process.env,
    NODE_OPTIONS: process.env.NODE_OPTIONS || '--use-system-ca'
};

execSync('npm install && npm run build', {
    cwd: frontendRoot,
    stdio: 'inherit',
    env
});

runStage();

if (!fs.existsSync(stagedIndex)) {
    console.error('Frontend staging failed: backend/public/index.html not created');
    process.exit(1);
}

console.log('Frontend build and staging completed successfully');
