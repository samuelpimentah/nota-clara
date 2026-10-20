-- Altera somente o comportamento de futuras gravações. Não atualiza notas existentes.
-- Clientes antigos podem omitir as novas preferências; nesse caso, preserve-as.
create or replace function public.touch_workspace() returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  if new.revision <> old.revision + 1 then
    raise exception 'revision must increase by one';
  end if;
  if not (new.data ? 'personalGoal') and old.data ? 'personalGoal' then
    new.data = new.data || pg_catalog.jsonb_build_object('personalGoal', old.data->'personalGoal');
  end if;
  if not (new.data ? 'onboardingSeen') and old.data ? 'onboardingSeen' then
    new.data = new.data || pg_catalog.jsonb_build_object('onboardingSeen', old.data->'onboardingSeen');
  end if;
  return new;
end;
$$;
