import { mkdir, copyFile } from 'node:fs/promises';
// Pages serves this directory directly, including on refresh and direct visits.
await mkdir('dist/About', { recursive: true });
await copyFile('dist/index.html', 'dist/About/index.html');
