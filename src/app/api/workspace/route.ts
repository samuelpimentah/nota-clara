import { z } from 'zod';
import { currentUser, provider, supabase, checkOrigin, failure, readJson, HttpError } from '@/lib/server';
import { transaction } from '@/lib/local-store';
import { emptyWorkspace, upgradeWorkspace, workspaceSchema, preservePreferences } from '@/lib/model';
export async function GET() {
  try {
    const user = await currentUser();
    if (!user) throw new HttpError(401, 'Entre na sua conta para acessar as notas.');
    if (provider() === 'local') {
      const workspace = await transaction(store => {
        const current = store.workspaces[user.id] ??= { data: emptyWorkspace(), revision: 0 };
        if (current.data.catalogVersion !== 2) { current.data = upgradeWorkspace(current.data); current.revision++; }
        return current;
      });
      return Response.json(workspace, { headers: { 'Cache-Control': 'no-store' } });
    }
    const client = await supabase();
    let result = await client.from('workspaces').select('data, revision').eq('user_id', user.id).maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) {
      const inserted = await client.from('workspaces').insert({ user_id: user.id, data: emptyWorkspace() }).select('data, revision').single();
      if (inserted.error?.code === '23505') result = await client.from('workspaces').select('data, revision').eq('user_id', user.id).single();
      else result = inserted;
    }
    if (result.error) throw result.error;
    if (result.data && result.data.data.catalogVersion !== 2) {
      const migrated = await client.from('workspaces').update({ data: upgradeWorkspace(result.data.data), revision: result.data.revision + 1 })
        .eq('user_id', user.id).eq('revision', result.data.revision).select('data, revision').maybeSingle();
      if (migrated.error) throw migrated.error;
      result = migrated.data ? migrated : await client.from('workspaces').select('data, revision').eq('user_id', user.id).single();
      if (result.error) throw result.error;
    }
    return Response.json(result.data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return failure(error); }
}
export async function PUT(request: Request) {
  try {
    checkOrigin(request);
    const user = await currentUser();
    if (!user) throw new HttpError(401, 'Sua sessão expirou. Entre novamente.');
    // O proprietário sempre vem da sessão validada, nunca do corpo ou URL.
    const input = z.object({ data: workspaceSchema, revision: z.number().int().nonnegative() }).strict().parse(await readJson(request));
    input.data = upgradeWorkspace(input.data);
    if (provider() === 'local') {
      const result = await transaction(store => {
        const current = store.workspaces[user.id];
        if (!current || current.revision !== input.revision) throw new HttpError(409, 'Suas notas mudaram em outra aba. Recarregue os dados antes de continuar.');
        return store.workspaces[user.id] = { data: preservePreferences(current.data,input.data), revision: current.revision + 1 };
      });
      return Response.json({ revision: result.revision });
    }
    const client = await supabase();
    const { data, error } = await client.from('workspaces').update({ data: input.data, revision: input.revision + 1 })
      .eq('user_id', user.id).eq('revision', input.revision).select('revision').maybeSingle();
    if (error) throw error;
    if (!data) throw new HttpError(409, 'Suas notas mudaram em outro dispositivo. Recarregue os dados antes de continuar.');
    return Response.json(data);
  } catch (error) { return failure(error); }
}
