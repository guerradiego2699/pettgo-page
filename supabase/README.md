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

## Perfil público con mascotas (`0009_public_pets_view.sql`)

Al hacer clic en el nombre de alguien en el foro (`/perfil/:id`), se muestran sus
mascotas. La tabla `pets` sigue con RLS restringido al dueño/admin; la vista
`public_pets` (mismo patrón que `public_profiles`) expone solo los campos de la
mascota (nombre, especie, raza, edad, foto, frase) — nunca datos del dueño más allá
de lo que ya muestra `public_profiles`. Ya aplicada en el proyecto real.

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

## Gotcha: `upsert: true` en Storage rompe las políticas RLS por carpeta (28 ago 2026)

Detectado en producción: subir fotos (avatar, mascota, producto) fallaba siempre con
`403 — new row violates row-level security policy`, aunque la política y la ruta eran
correctas (confirmado en Logs → Storage: `role: authenticated`, ruta con el UUID correcto).

**Causa:** `supabase.storage.from(bucket).upload(path, file, { upsert: true })` genera
un `INSERT ... ON CONFLICT (name, bucket_id) DO UPDATE`. Postgres evalúa las políticas de
RLS de forma distinta para ese tipo de consulta (falla en la rutina interna
`ExecWithCheckOptions`), incluso cuando no existe ninguna fila en conflicto. No es un
error en la política — es una interacción conocida y no obvia entre `ON CONFLICT DO
UPDATE` y RLS en Postgres/Supabase Storage.

**Solución aplicada:** en `src/lib/storage.ts` se usa `upsert: false`, y cada subida
(`Cuenta.tsx`, `PetForm.tsx`, `VetForm.tsx`, `SpecialistForm.tsx`) genera un nombre de
archivo nuevo con `crypto.randomUUID()` en cada subida — nunca se reutiliza la misma
ruta, así que nunca hay conflicto y no hace falta upsert.

**Si en el futuro se necesita "reemplazar" un archivo en la misma ruta** (en vez de subir
uno nuevo), no uses `upsert: true`. En su lugar, borra el archivo anterior primero
(`supabase.storage.from(bucket).remove([path])`) y luego sube el nuevo con
`upsert: false`.

## Productos de pymes (recomendación con propuesta por correo)

Reemplaza la antigua "Tienda" (venta directa, retirada). PettGo ya no vende: recomienda
gratis productos de pymes chilenas y deriva tráfico a su tienda. El flujo completo —
crear la propuesta, enviarla por correo, que la pyme acepte/edite/rechace desde un
enlace único, y medir vistas/clics — vive en `/api` (ver `api/README.md`).

### 1. Migraciones (ya aplicadas en el proyecto real)

`migrations/0006_drop_dropshipping_columns.sql`, `0007_productos_pyme.sql` y
`0008_fix_search_path.sql` ya se aplicaron directamente al proyecto de Supabase de
producción. Solo hace falta correrlas a mano si trabajas contra otro proyecto (por
ejemplo un branch de desarrollo nuevo): en el SQL Editor, en ese orden.

- `0006`: revierte las columnas que había dejado un intento anterior de dropshipping
  por AliExpress (nunca se usó en producción).
- `0007`: crea `productos_pyme`, `eventos_producto`, las funciones
  `metricas_producto`/`metricas_diarias` y la vista pública `productos_pyme_publicos`.
- `0008`: corrige un "Function Search Path Mutable" que marcó el Security Advisor en
  las 3 funciones nuevas de `0007`.

`productos_pyme_publicos` aparece en el Advisor como "Security Definer View", igual
que `public_profiles` — es el mismo trade-off consciente ya documentado más abajo:
necesita saltarse el RLS de `productos_pyme` fila por fila para poder mostrar
públicamente solo los campos seguros de los productos `publicado`.

### 2. Variables de entorno

Además de `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` (frontend), las funciones de
`/api` necesitan estas, **solo en Vercel → Project Settings → Environment Variables**
(nunca con prefijo `VITE_`, nunca en el frontend):

| Variable | De dónde sale |
|---|---|
| `SUPABASE_URL` | Igual que `VITE_SUPABASE_URL` |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API Keys → "service_role" (secreta) |
| `RESEND_API_KEY` | Resend → API Keys |
| `ADMIN_EMAIL` | El correo con el que inicias sesión como admin en PettGo |
| `SITE_URL` | `https://pettgo.cl` en producción |

### 3. Resend (correo de propuesta)

1. Verifica el dominio `pettgo.cl` en Resend (Domains → Add Domain), agregando los
   registros DNS que te indique donde tengas comprado el dominio.
2. En la configuración del dominio, **desactiva "Open Tracking" y "Click Tracking"**
   (el correo se envía sin JavaScript ni redirecciones intermedias, como pide el flujo).
3. Crea una API Key y ponla en `RESEND_API_KEY`.

### 4. Usuario administrador

El check de admin de `/api` es distinto al de `profiles.role`: compara el email de la
sesión contra `ADMIN_EMAIL`. Usa la cuenta con la que ya inicias sesión como admin en
PettGo (la que tiene `role = 'admin'` en `profiles`) y pon ese mismo correo en
`ADMIN_EMAIL`.

### 5. Probar en local con `vercel dev`

`vite dev` (el `npm run dev` normal) no ejecuta las funciones de `/api` — para probar el
flujo completo (correo, propuesta, métricas) hace falta la CLI de Vercel:

```bash
npm install -g vercel
vercel link      # conecta esta carpeta con tu proyecto de Vercel (una sola vez)
vercel env pull .env   # descarga las variables de entorno del proyecto a .env local
vercel dev
```

`vercel dev` sirve el frontend y las funciones de `/api` juntos (por defecto en
`http://localhost:3000`). Desde ahí puedes: proponer un producto en `/admin/productos`,
abrir el correo que llega a la pyme (revisa la bandeja del `pyme_email` que hayas usado
para probar), aceptar/editar/rechazar en `/propuesta/:token`, y ver el producto
publicado en `/productos`.
