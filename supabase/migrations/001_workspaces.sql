-- Executar em um projeto Supabase novo. Nenhuma service_role é usada pela aplicação.
create table public.workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object' and data->>'version' = '1'),
  revision integer not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now()
);
alter table public.workspaces enable row level security;
alter table public.workspaces force row level security;
revoke all on public.workspaces from anon;
grant select, insert, update, delete on public.workspaces to authenticated;
create policy own_workspace on public.workspaces for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create function public.touch_workspace() returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  if new.revision <> old.revision + 1 then
    raise exception 'revision must increase by one';
  end if;
  return new;
end;
$$;
create trigger touch_workspace before update on public.workspaces
for each row execute function public.touch_workspace();
