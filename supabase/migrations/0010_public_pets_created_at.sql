-- PettGo — corrige public_pets: faltaba created_at
--
-- El frontend ordena las mascotas del perfil público por created_at, pero la
-- vista no incluía esa columna: la consulta fallaba en silencio y el perfil
-- siempre mostraba "sin mascotas", aunque el usuario sí tuviera.

create or replace view public.public_pets as
  select id, owner_id, name, species, breed, age_years, photo_url, highlight, created_at
  from public.pets;
