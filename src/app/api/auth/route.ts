import { cookies } from 'next/headers';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { currentUser, provider, supabase, checkOrigin, failure, readJson, HttpError } from '@/lib/server';
import { transaction, hashPassword, verifyPassword, newSession, digest } from '@/lib/local-store';
const payload = z.object({ action: z.enum(['login','signup','logout']),
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_.-]{3,30}$/).optional(),
  password: z.string().max(128).optional(), name: z.string().trim().min(1).max(80).optional() });
const attempts = new Map<string, { count: number; until: number }>();
// Identificador técnico, sem caixa postal. Confirmação por email deve estar desabilitada.
const internalIdentity = (username: string) => `${createHash('sha256').update(username).digest('hex')}@accounts.notaclara.invalid`;
export async function GET() {
  try { return Response.json({ user: await currentUser(), provider: provider() }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const input = payload.parse(await readJson(request));
    const jar = await cookies();
    if (provider() === 'supabase') {
      const client = await supabase();
      if (input.action === 'logout') {
        const { error } = await client.auth.signOut(); if (error) throw error;
        return Response.json({ ok: true });
      }
      if (!input.username || !input.password) throw new HttpError(400, 'Preencha usuário e senha.');
      if (input.action === 'signup' && input.password.length < 10) throw new HttpError(400, 'Use uma senha com pelo menos 10 caracteres.');
      const email = internalIdentity(input.username);
      const result = input.action === 'signup'
        ? await client.auth.signUp({ email, password: input.password, options: { data: { username: input.username, name: input.name || input.username } } })
        : await client.auth.signInWithPassword({ email, password: input.password });
      if (result.error) throw new HttpError(400, input.action === 'login' ? 'Usuário ou senha inválidos.' : 'Não foi possível cadastrar. Confira os dados ou escolha outro usuário.');
      if (!result.data.session) throw new HttpError(503, 'O acesso por usuário depende de configuração no Supabase. Desative a confirmação por e-mail no provedor.');
      return Response.json({ ok: true });
    }
    if (input.action === 'logout') {
      const token = jar.get('nc_session')?.value;
      if (token) await transaction(store => { store.sessions = store.sessions.filter(s => s.digest !== digest(token)); });
      jar.delete('nc_session'); return Response.json({ ok: true });
    }
    if (!input.username || !input.password) throw new HttpError(400, 'Preencha usuário e senha.');
    if (input.action === 'signup' && input.password.length < 10) throw new HttpError(400, 'Use uma senha com pelo menos 10 caracteres.');
    const username = input.username;
    const rate = attempts.get(username);
    if (rate && rate.until > Date.now() && rate.count >= 8) throw new HttpError(429, 'Muitas tentativas. Aguarde 15 minutos.');
    attempts.set(username, { count: rate && rate.until > Date.now() ? rate.count + 1 : 1, until: Date.now() + 900000 });
    const token = await transaction(async store => {
      let user = store.users.find(u => u.username === username);
      if (input.action === 'signup') {
        if (user) throw new HttpError(400, 'Este nome de usuário já está em uso. Escolha outro ou entre.');
        user = { id: crypto.randomUUID(), username, name: input.name || username, password: await hashPassword(input.password!) };
        store.users.push(user);
      } else if (!user || !await verifyPassword(input.password!, user.password)) throw new HttpError(401, 'Usuário ou senha inválidos.');
      return newSession(store, user!.id);
    });
    attempts.delete(username);
    jar.set('nc_session', token, { httpOnly: true, sameSite: 'lax', secure: new URL(request.url).protocol === 'https:', path: '/', maxAge: 30 * 86400 });
    return Response.json({ ok: true });
  } catch (error) { return failure(error); }
}
