-- PettGo — revisión final de seguridad antes de despliegue.
--
-- Hallazgo (Supabase Security Advisor): "Public Bucket Allows Listing" en los buckets
-- avatars/pets/vets/specialists/products. Las políticas públicas de SELECT permitían
-- listar el contenido completo del bucket (enumerar archivos), no solo verlos por URL.
-- Como los buckets ya son públicos (public = true), Supabase sirve cada archivo por su
-- URL pública sin pasar por estas políticas — la política de SELECT sólo habilitaba
-- list()/download() innecesarios. Se elimina sin afectar la app (nunca usamos list()).
drop policy if exists "public_read_avatars" on storage.objects;
drop policy if exists "public_read_pets" on storage.objects;
drop policy if exists "public_read_vets" on storage.objects;
drop policy if exists "public_read_specialists" on storage.objects;
drop policy if exists "public_read_products" on storage.objects;
