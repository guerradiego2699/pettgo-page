-- PettGo — avisos por correo de moderación del foro
--
-- Cada tema nuevo (forum_threads) y cada reporte (reports) llama a /api/foro/aviso en
-- Vercel, que manda un correo a seguridad@pettgo.cl. El foro escribe directo desde el
-- navegador a Supabase, por eso el aviso sale desde la base con pg_net.
--
-- ANTES DE CORRERLA, guarda el secreto compartido en Vault (una sola vez, con el MISMO
-- valor que la variable FORO_WEBHOOK_SECRET de Vercel). No lo pongas en este archivo:
--
--   select vault.create_secret('<mismo valor que FORO_WEBHOOK_SECRET>', 'foro_webhook_secret');
--
-- Solo se envía el id de la fila; el endpoint vuelve a leer el contenido de la base.
-- Si el aviso falla por cualquier motivo (sin secreto, sin red, Vercel caído) solo se
-- registra una advertencia: NUNCA bloquea ni revierte la publicación del tema o reporte.
--
-- La URL usa www.pettgo.cl porque pettgo.cl responde con una redirección 308.

create extension if not exists pg_net with schema extensions;

create or replace function public.avisar_moderacion_foro()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  secreto text;
begin
  select decrypted_secret into secreto
  from vault.decrypted_secrets
  where name = 'foro_webhook_secret'
  limit 1;

  if secreto is null then
    raise warning 'avisar_moderacion_foro: falta el secreto foro_webhook_secret en Vault';
    return null;
  end if;

  perform net.http_post(
    url := 'https://www.pettgo.cl/api/foro/aviso',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', secreto),
    body := jsonb_build_object('type', 'INSERT', 'table', tg_table_name, 'record', jsonb_build_object('id', new.id)),
    timeout_milliseconds := 5000
  );
  return null;
exception when others then
  raise warning 'avisar_moderacion_foro: %', sqlerrm;
  return null;
end;
$$;

-- Función de trigger: nadie debe poder llamarla desde la API pública.
revoke all on function public.avisar_moderacion_foro() from public, anon, authenticated;

drop trigger if exists aviso_tema_nuevo on public.forum_threads;
create trigger aviso_tema_nuevo after insert on public.forum_threads
  for each row execute function public.avisar_moderacion_foro();

drop trigger if exists aviso_reporte on public.reports;
create trigger aviso_reporte after insert on public.reports
  for each row execute function public.avisar_moderacion_foro();
