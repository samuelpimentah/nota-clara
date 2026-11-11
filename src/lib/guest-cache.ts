import { upgradeWorkspace, workspaceSchema, type Workspace } from './model';

export const GUEST_CACHE_KEY = 'nota-clara.guest-draft.v1';
export const GUEST_CACHE_TTL = 24 * 60 * 60 * 1000;
export interface DraftStorage { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
export function readGuestDraft(storage: DraftStorage, now = Date.now()): Workspace | null {
  const raw = storage.getItem(GUEST_CACHE_KEY);
  if (!raw) return null;
  try {
    const envelope = JSON.parse(raw);
    if (envelope.version !== 1 || !Number.isFinite(envelope.expiresAt) || envelope.expiresAt <= now || envelope.expiresAt > now + GUEST_CACHE_TTL) throw new Error('Rascunho expirado ou inválido.');
    return upgradeWorkspace(envelope.data);
  } catch { storage.removeItem(GUEST_CACHE_KEY); return null; }
}
export function writeGuestDraft(storage: DraftStorage, data: Workspace, now = Date.now()): void {
  storage.setItem(GUEST_CACHE_KEY, JSON.stringify({ version: 1, expiresAt: now + GUEST_CACHE_TTL, data: workspaceSchema.parse(data) }));
}
export function clearGuestDraft(storage: DraftStorage): void { storage.removeItem(GUEST_CACHE_KEY); }
