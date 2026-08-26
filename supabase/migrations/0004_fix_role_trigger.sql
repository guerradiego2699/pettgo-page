-- PettGo — corrige prevent_role_self_escalation: no debe bloquear accesos directos
-- a la base (SQL Editor, conexión de servicio) donde auth.uid() es null. Solo debe
-- impedir que un usuario autenticado por la API se cambie el rol a sí mismo.
create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role <> old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'Solo un administrador puede cambiar el rol de una cuenta';
  end if;
  return new;
end;
$$;
