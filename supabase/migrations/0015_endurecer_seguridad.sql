-- PettGo — endurecimiento detectado en el informe de mantenimiento del 28-oct-2026
--
-- YA APLICADA en producción (verificada con el Security Advisor y con pruebas de los
-- triggers). Solo hace falta correrla a mano en otro proyecto.
--
-- 1) pg_net quedó instalado en el esquema `public` (lo hizo la migración 0014 al no indicar
--    esquema). La extensión no es movible, así que se reinstala en `extensions`. El esquema
--    `net` con las funciones (net.http_post, net._http_response) se vuelve a crear solo.
--    Si el aviso del foro falla mientras tanto, la función solo registra una advertencia.
--
-- 2) Tres funciones SECURITY DEFINER eran invocables por cualquiera desde /rest/v1/rpc/*.
--    Son funciones de trigger (una, de evento) y Postgres no revisa EXECUTE cuando un trigger
--    se dispara, solo al crearlo; por eso se puede quitar el permiso sin afectar su trabajo.
--    NO se toca `is_admin()`: las políticas de acceso (RLS) la llaman en nombre de anon y
--    authenticated y necesita seguir ejecutable.

drop extension if exists pg_net;
create extension if not exists pg_net with schema extensions;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.prevent_role_self_escalation() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
