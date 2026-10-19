import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { emptyWorkspace, upgradeWorkspace, workspaceSchema } from './model';
let instance: SupabaseClient | undefined;
let loadedOwner: string | undefined;
function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('O acesso online ainda não foi configurado.');
  return instance ??= createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'nota-clara.auth' } });
}
export async function usernameIdentity(username: string) {
  const normalized = username.trim().toLowerCase();
  if (!/^[a-z0-9_.-]{3,30}$/.test(normalized)) throw new Error('Use um usuário de 3 a 30 letras, números, pontos, hífens ou sublinhados.');
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2,'0')).join('') + '@accounts.notaclara.invalid';
}
const authInput = z.object({ action: z.enum(['login','signup','logout']), username: z.string().optional(), password: z.string().max(128).optional(), name: z.string().trim().min(1).max(80).optional() });
const fail = (status: number, message: string): never => { throw Object.assign(new Error(message), { status }); };
export async function browserApi<T>(url: string, options?: RequestInit): Promise<T> {
  const db = client(), method = options?.method || 'GET';
  let result: unknown;
  if (url === '/api/auth' && method === 'POST') {
    const input = authInput.parse(JSON.parse(String(options?.body || '{}')));
    if (input.action === 'logout') { loadedOwner = undefined; const { error } = await db.auth.signOut(); if (error) fail(503,'Não foi possível sair. Tente novamente.'); }
    else {
      if (!input.username || !input.password) fail(400,'Preencha usuário e senha.');
      if (input.action === 'signup' && input.password!.length < 10) fail(400,'Use uma senha com pelo menos 10 caracteres.');
      loadedOwner = undefined;
      const email = await usernameIdentity(input.username!);
      const response = input.action === 'signup'
        ? await db.auth.signUp({ email, password: input.password!, options: { data: { username: input.username!.trim().toLowerCase(), name: input.name || input.username!.trim().toLowerCase() } } })
        : await db.auth.signInWithPassword({ email, password: input.password! });
      if (response.error) fail(400,input.action === 'login' ? 'Usuário ou senha inválidos.' : 'Não foi possível cadastrar. Confira os dados ou escolha outro usuário.');
      if (!response.data.session) fail(503,'O cadastro depende da configuração de confirmação de e-mail no Supabase.');
    }
    result = { ok: true };
  } else {
    const { data: session } = await db.auth.getSession();
    const auth = session.session ? await db.auth.getUser() : null;
    if (auth?.error) fail(401,'Sua sessão expirou. Entre novamente.');
    const user = auth?.data.user;
    if (url === '/api/auth' && method === 'GET') result = { user: user ? { id: user.id, username: String(user.user_metadata.username || ''), name: String(user.user_metadata.name || user.user_metadata.username || 'Estudante') } : null, provider: 'supabase' };
    else {
      if (!user) fail(401,'Entre na sua conta para acessar as notas.');
      if (url !== '/api/workspace') fail(404,'Solicitação desconhecida.');
      if (method === 'GET') {
        let response = await db.from('workspaces').select('data, revision').eq('user_id',user!.id).maybeSingle();
        if (response.error) fail(503,'Não foi possível carregar suas notas. Tente novamente.');
        if (!response.data) {
          const inserted = await db.from('workspaces').insert({ user_id: user!.id, data: emptyWorkspace() }).select('data, revision').single();
          response = inserted.error?.code === '23505' ? await db.from('workspaces').select('data, revision').eq('user_id',user!.id).single() : inserted;
        }
        if (response.error || !response.data) fail(503,'Não foi possível preparar sua planilha.');
        if (response.data!.data.catalogVersion !== 2) {
          const updated = await db.from('workspaces').update({ data: upgradeWorkspace(response.data!.data), revision: response.data!.revision + 1 }).eq('user_id',user!.id).eq('revision',response.data!.revision).select('data, revision').maybeSingle();
          if (updated.error) fail(503,'Não foi possível atualizar sua planilha.');
          response = updated.data ? updated : await db.from('workspaces').select('data, revision').eq('user_id',user!.id).single();
        }
        if (response.error || !response.data) fail(503,'Não foi possível carregar suas notas.');
        loadedOwner = user!.id;
        result = { data: workspaceSchema.parse(response.data!.data), revision: response.data!.revision };
      } else if (method === 'PUT') {
        if (loadedOwner !== user!.id) fail(409,'A conta ativa mudou. Recarregue sua planilha antes de salvar.');
        const input = z.object({ data: workspaceSchema, revision: z.number().int().nonnegative() }).strict().parse(JSON.parse(String(options?.body || '{}')));
        const response = await db.from('workspaces').update({ data: upgradeWorkspace(input.data), revision: input.revision + 1 }).eq('user_id',user!.id).eq('revision',input.revision).select('revision').maybeSingle();
        if (response.error) fail(503,'Não foi possível salvar suas notas. Tente novamente.');
        if (!response.data) fail(409,'Suas notas mudaram em outro dispositivo. Recarregue os dados antes de continuar.');
        result = response.data;
      } else fail(405,'Operação não disponível.');
    }
  }
  return result as T;
}
