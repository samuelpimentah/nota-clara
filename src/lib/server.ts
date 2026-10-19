import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { transaction, digest } from './local-store';
export const provider = () => process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? 'supabase' : 'local';
export async function supabase() {
  const jar = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: { getAll: () => jar.getAll(), setAll: values => values.forEach(({ name, value, options }) => jar.set(name, value, options)) },
  });
}
export async function currentUser() {
  if (provider() === 'supabase') {
    const client = await supabase();
    const { data, error } = await client.auth.getUser();
    return error || !data.user ? null : { id: data.user.id, username: String(data.user.user_metadata.username || ''), name: String(data.user.user_metadata.name || data.user.user_metadata.username || 'Estudante') };
  }
  const token = (await cookies()).get('nc_session')?.value;
  if (!token) return null;
  return transaction(store => {
    const session = store.sessions.find(s => s.digest === digest(token));
    const user = session && store.users.find(u => u.id === session.userId);
    return user ? { id: user.id, username: user.username, name: user.name } : null;
  });
}
export function checkOrigin(request: Request) {
  const host = request.headers.get('host');
  const origin = request.headers.get('origin');
  // Next pode normalizar request.url para localhost atrás do proxy de desenvolvimento.
  // Host é o destino HTTP real; Origin é definido pelo navegador.
  if (!origin || !host) throw new HttpError(403, 'Origem da solicitação não autorizada.');
  let parsed: URL;
  try { parsed = new URL(origin); } catch { throw new HttpError(403, 'Origem da solicitação não autorizada.'); }
  const protocol = (request.headers.get('x-forwarded-proto') || new URL(request.url).protocol.replace(':', '')) + ':';
  if (parsed.host !== host || parsed.protocol !== protocol) throw new HttpError(403, 'Origem da solicitação não autorizada.');
}
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function failure(error: unknown) {
  if (error instanceof HttpError) return Response.json({ error: error.message }, { status: error.status });
  if (error && typeof error === 'object' && 'issues' in error) return Response.json({ error: 'Há dados inválidos. Confira notas, nomes e pesos.' }, { status: 400 });
  console.error('Falha no servidor:', error instanceof Error ? error.message : 'Erro desconhecido');
  return Response.json({ error: 'Não foi possível concluir. Verifique a configuração e tente novamente.' }, { status: 500 });
}
export async function readJson(request: Request) {
  if (Number(request.headers.get('content-length') || 0) > 2000000) throw new HttpError(413, 'Os dados excedem o tamanho permitido.');
  const text = await request.text();
  if (text.length > 2000000) throw new HttpError(413, 'Os dados excedem o tamanho permitido.');
  try { return JSON.parse(text); } catch { throw new HttpError(400, 'Conteúdo inválido.'); }
}
