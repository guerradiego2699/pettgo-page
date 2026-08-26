-- PettGo — Fase 2.2: foto de perfil
alter table public.profiles add column avatar_url text;

-- La vista pública de perfiles (usada por el foro) también debe exponer el avatar.
drop view if exists public.public_profiles;
create view public.public_profiles as
  select id, name, role, avatar_url from public.profiles;

grant select on public.public_profiles to anon, authenticated;
