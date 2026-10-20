import { cp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
await import('./prepare-pdf-worker.mjs');
const root = process.cwd(), stage = path.join(root,'.pages-build');
if (path.dirname(stage) !== root) throw new Error('Diretório de build inválido.');
// Only this fixed build directory is recreated. User notes and environment files are never copied.
await rm(stage,{recursive:true,force:true});
await mkdir(stage,{recursive:true});
for (const name of ['src','public','next.config.ts','tsconfig.json','package.json','package-lock.json']) await cp(path.join(root,name),path.join(stage,name),{recursive:true});
await rm(path.join(stage,'src','app','api'),{recursive:true,force:true});
await rm(path.join(stage,'src','proxy.ts'),{force:true});
await symlink(path.join(root,'node_modules'),path.join(stage,'node_modules'),process.platform === 'win32' ? 'junction' : 'dir');
const result = spawnSync(process.execPath,[path.join(root,'node_modules','next','dist','bin','next'),'build'],{cwd:stage,stdio:'inherit',env:{...process.env,NEXT_PUBLIC_STATIC_HOST:'true'}});
if (result.status !== 0) process.exit(result.status || 1);
await writeFile(path.join(stage,'out','.nojekyll'),'');
console.log('GitHub Pages: .pages-build/out');
