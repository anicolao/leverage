import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const appBuildDir = 'build';
const bookBuildDir = 'book/generated';

if (!existsSync(appBuildDir)) {
  throw new Error('Missing SvelteKit static build directory. Run npm run build first.');
}

if (!existsSync(bookBuildDir)) {
  throw new Error('Missing LiTScript book build directory. Run npm run book:build first.');
}

const bookTargetDir = join(appBuildDir, 'book');
rmSync(bookTargetDir, { recursive: true, force: true });
mkdirSync(bookTargetDir, { recursive: true });
cpSync(bookBuildDir, bookTargetDir, { recursive: true });

writeFileSync(join(appBuildDir, '.nojekyll'), '');
