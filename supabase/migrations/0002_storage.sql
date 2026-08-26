-- PettGo — Fase 2.0: buckets de Storage para fotos
-- Convención de rutas: cada archivo se sube dentro de una carpeta con el id del dueño,
-- ej. avatars/<user_id>/foto.webp, pets/<user_id>/<pet_id>.webp

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('pets', 'pets', true),
  ('vets', 'vets', true),
  ('specialists', 'specialists', true),
  ('products', 'products', true)
on conflict (id) do nothing;

-- Lectura pública para todos los buckets (son fotos de perfil/fichas públicas).
create policy "public_read_avatars" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "public_read_pets" on storage.objects
  for select using (bucket_id = 'pets');
create policy "public_read_vets" on storage.objects
  for select using (bucket_id = 'vets');
create policy "public_read_specialists" on storage.objects
  for select using (bucket_id = 'specialists');
create policy "public_read_products" on storage.objects
  for select using (bucket_id = 'products');

-- avatars y pets: cada usuario solo escribe dentro de su propia carpeta (primer segmento de la ruta = su uid).
create policy "avatars_owner_write" on storage.objects
  for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_owner_update" on storage.objects
  for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_owner_delete" on storage.objects
  for delete using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "pets_owner_write" on storage.objects
  for insert with check (bucket_id = 'pets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "pets_owner_update" on storage.objects
  for update using (bucket_id = 'pets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "pets_owner_delete" on storage.objects
  for delete using (bucket_id = 'pets' and (storage.foldername(name))[1] = auth.uid()::text);

-- vets y specialists: solo admin escribe (las fichas se cargan/editan desde el panel admin;
-- si más adelante la propia veterinaria/especialista tiene cuenta vinculada, se puede sumar
-- una condición owner_id igual a como quedó en las tablas).
create policy "vets_admin_write" on storage.objects
  for insert with check (bucket_id = 'vets' and public.is_admin());
create policy "vets_admin_update" on storage.objects
  for update using (bucket_id = 'vets' and public.is_admin());
create policy "vets_admin_delete" on storage.objects
  for delete using (bucket_id = 'vets' and public.is_admin());

create policy "specialists_admin_write" on storage.objects
  for insert with check (bucket_id = 'specialists' and public.is_admin());
create policy "specialists_admin_update" on storage.objects
  for update using (bucket_id = 'specialists' and public.is_admin());
create policy "specialists_admin_delete" on storage.objects
  for delete using (bucket_id = 'specialists' and public.is_admin());

-- products: solo admin escribe.
create policy "products_admin_write" on storage.objects
  for insert with check (bucket_id = 'products' and public.is_admin());
create policy "products_admin_update" on storage.objects
  for update using (bucket_id = 'products' and public.is_admin());
create policy "products_admin_delete" on storage.objects
  for delete using (bucket_id = 'products' and public.is_admin());
