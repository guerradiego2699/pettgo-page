-- PettGo — perfil público con las mascotas del usuario
--
-- Permite ver, desde cualquier lugar donde aparezca el nombre de alguien
-- (por ahora, el foro), sus mascotas — igual que public_profiles ya expone
-- nombre/avatar sin aplicar el RLS de profiles fila por fila. No se expone
-- nada nuevo sensible: pets no tiene email ni datos de contacto, solo
-- nombre/especie/raza/edad/foto/frase de la mascota.

create view public.public_pets as
  select id, owner_id, name, species, breed, age_years, photo_url, highlight
  from public.pets;

grant select on public.public_pets to anon, authenticated;
