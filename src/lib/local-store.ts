import { mkdir, readFile, writeFile, rename, rmdir } from 'node:fs/promises';
import { randomBytes, scrypt as rawScrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import path from 'node:path';
import type { Workspace } from './model';
const scrypt = promisify(rawScrypt);
export type LocalUser = { id: string; username: string; name: string; password: string };
type Store = {
  users: LocalUser[];
  sessions: { digest: string; userId: string; expires: number }[];
  workspaces: Record<string, { data: Workspace; revision: number }>;
};
const folder = () => process.env.LOCAL_DATA_DIR || path.join(process.cwd(), '.local-data');
export async function transaction<T>(fn: (store: Store) => T | Promise<T>): Promise<T> {
  if (process.env.VERCEL) throw new Error('Configure o Supabase antes de publicar.');
  const dir = folder();
  await mkdir(dir, { recursive: true });
  const lock = path.join(dir, 'write.lock');
  let acquired = false;
  for (let attempt = 0; attempt < 200; attempt++) {
    try { await mkdir(lock); acquired = true; break; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  if (!acquired) throw new Error('Armazenamento ocupado. Tente novamente.');
  try {
    let store: Store;
    try { store = JSON.parse(await readFile(path.join(dir, 'database.json'), 'utf8')); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      store = { users: [], sessions: [], workspaces: {} };
    }
    store.sessions = store.sessions.filter(s => s.expires > Date.now());
    const result = await fn(store);
    const temporary = path.join(dir, `${randomBytes(8).toString('hex')}.tmp`);
    await writeFile(temporary, JSON.stringify(store), { mode: 0o600 });
    await rename(temporary, path.join(dir, 'database.json'));
    return result;
  } finally { await rmdir(lock); }
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64) as Buffer;
  return `${salt}:${key.toString('hex')}`;
}
export async function verifyPassword(password: string, hash: string) {
  const [salt, stored] = hash.split(':');
  const key = await scrypt(password, salt, 64) as Buffer;
  return timingSafeEqual(key, Buffer.from(stored, 'hex'));
}
export const digest = (token: string) => createHash('sha256').update(token).digest('hex');
export function newSession(store: Store, userId: string) {
  const token = randomBytes(32).toString('hex');
  store.sessions.push({ digest: digest(token), userId, expires: Date.now() + 30 * 86400000 });
  return token;
}
