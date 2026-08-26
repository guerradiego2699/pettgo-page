# Supabase — PettGo

## Puesta en marcha (una sola vez)

1. Crea una cuenta/proyecto en https://supabase.com (plan Free alcanza para esta fase).
2. En **Project Settings → API**, copia:
   - `Project URL` → pégalo en `.env.local` como `VITE_SUPABASE_URL`
   - `anon public key` → pégalo en `.env.local` como `VITE_SUPABASE_ANON_KEY`
   (crea `.env.local` en la raíz del proyecto a partir de `.env.example`; no se sube a git).
3. En **SQL Editor**, ejecuta en orden:
   - `migrations/0001_schema.sql`
   - `migrations/0002_storage.sql`
4. En **Authentication → Providers → Google**, actívalo y pega el Client ID / Secret
   de un OAuth Client de Google Cloud Console (tipo "Web application"), con el
   redirect URI que Supabase te muestra en esa misma pantalla.
5. En **Authentication → URL Configuration**, agrega `http://localhost:5173` y el
   dominio de producción (`https://pettgo.cl`) como Site URL / Redirect URLs.
6. Cuando despliegues en Vercel, agrega las mismas dos variables de entorno
   (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) en Project Settings → Environment
   Variables del proyecto en Vercel.

## Roles

El rol vive en `public.profiles.role` (`persona` por defecto al registrarse). Para
convertir manualmente una cuenta en `admin` la primera vez (antes de tener UI para
esto), corre en el SQL Editor:

```sql
update public.profiles set role = 'admin' where email = 'tu-correo@ejemplo.com';
```

## Migraciones futuras

Cada cambio de esquema se agrega como un archivo nuevo `NNNN_descripcion.sql` en
`migrations/`, nunca editando uno ya aplicado.

## Revisión de seguridad (26 ago 2026)

Se revisó el Security Advisor de Supabase antes del primer despliegue:

- **Corregido**: los buckets de fotos (avatars/pets/vets/specialists/products) tenían una
  política de lectura que permitía *listar* todo el contenido del bucket, no solo verlo por
  URL. Se eliminó (`0005_security_review.sql`) — los buckets son públicos y sirven cada
  archivo por su URL sin necesitar esa política.
- **Corregido**: se subió el largo mínimo de contraseña a 8 caracteres y se exigen
  mayúsculas, minúsculas y dígitos (Authentication → Sign In/Providers → Email).
- **Aceptado conscientemente**: `public.public_profiles` es una vista "security definer" —
  el Advisor la marca porque expone filas sin aplicar el RLS de `profiles` fila por fila.
  Es intencional: por diseño debe mostrar el nombre de *cualquier* usuario en el foro,
  algo que el RLS de `profiles` (solo tu propia fila) no permitiría. Solo expone
  `id, name, role, avatar_url` — nunca el correo.
- **Aceptado conscientemente**: `is_admin()`, `prevent_role_self_escalation()` y
  `handle_new_user()` aparecen como "SECURITY DEFINER callable" porque técnicamente se
  podrían invocar por RPC. En la práctica no filtran nada explotable (is_admin() solo
  devuelve el propio estado de admin de quien llama; las otras dos son funciones de
  trigger que fallan si se llaman fuera de un trigger) y **no se pueden revocar sin
  romper el RLS de toda la app**, ya que ese mismo permiso es el que usan las políticas
  para funcionar. Si se quiere eliminar esta advertencia más adelante, la forma correcta
  es moverlas a un schema no expuesto por la API (ej. `private`) y actualizar ~28
  políticas que las referencian — se dejó pendiente por el riesgo de esa migración
  frente al beneficio real.
- **No disponible en plan Free**: "Prevent use of leaked passwords" (verificación contra
  HaveIBeenPwned) requiere plan Pro. Si se sube de plan más adelante, activarlo en
  Authentication → Sign In/Providers → Email.
- **Pendiente, no bloqueante**: activar Captcha (hCaptcha/Turnstile) en
  Authentication → Attack Protection antes de un lanzamiento con tráfico público, para
  frenar bots en registro/login.
