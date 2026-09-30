# PettGo — API (funciones serverless de Vercel)

Todas las escrituras sobre `productos_pyme` y `eventos_producto` pasan por aquí, usando
`SUPABASE_SERVICE_ROLE_KEY` (nunca la clave anon). Ver `supabase/README.md` para las
migraciones y variables de entorno necesarias.

## Endpoints

- **`POST /api/admin/proponer`** — solo admin. Crea un producto nuevo y envía el correo
  de propuesta, o si el body trae `{ id }`, reenvía la propuesta de un producto
  existente con un token nuevo.
- **`GET /api/propuesta?token=...`** — público. Devuelve los datos del producto si el
  token existe, no está usado y no venció.
- **`POST /api/propuesta/responder`** — público (protegido por el token, no por sesión).
  Body `{ token, accion: "aceptar" | "rechazar", cambios?, motivo? }`. Marca el token
  como usado y avisa a `ADMIN_EMAIL`.
- **`POST /api/evento`** — público. Registra una vista desde la ficha de producto,
  deduplicada por visitante y día.
- **`GET /api/ir/[id]`** — público. Redirige 302 al link de la tienda (con UTM) y
  registra el clic. Solo funciona si el producto está `publicado`.
- **`GET /api/admin/metricas`** — solo admin. Devuelve la lista de productos con su
  estado y sus métricas (vistas/clics totales y únicos, tasa de clic), más una serie
  diaria agregada para el gráfico. Acepta `?desde=` (ISO) para filtrar el rango.
- **`GET /api/admin/producto/[id]`** (PATCH/DELETE) — solo admin. Corrige campos de un
  producto, lo elimina, o fuerza `estado` a `publicado`/`rechazado` sin pasar por el
  token de la pyme.
- **`GET /api/admin/tendencias`** — solo admin. Calcula desempeño de productos/pymes,
  indicadores de usuarios/mascotas/veterinarias/especialistas/comunidad y origen de
  visitas, todo desde las tablas reales. Acepta `?periodo=diario|semanal|mensual`.
- **`POST /api/admin/tendencias/informe`** — solo admin. Envía por correo (con el PDF
  adjunto, generado en el navegador) el informe de Tendencias a cualquier destinatario.

## Autenticación de admin (`_lib/auth.ts`)

El frontend manda el `access_token` de la sesión de Supabase Auth en
`Authorization: Bearer <token>`. El servidor valida ese JWT contra Supabase y luego
revisa que `profiles.role` de esa cuenta sea `'admin'` — el mismo criterio que usa el
resto del sitio (`is_admin()`, `ProtectedRoute`). No depende de `ADMIN_EMAIL`: cualquier
cuenta con rol admin puede usar estas rutas.

## Hash de visitantes (`_lib/hash.ts`)

Para "vistas únicas" / "clics únicos" sin guardar IPs: se hashea (SHA-256)
`IP + user agent + día + un salt` derivado del propio `SUPABASE_SERVICE_ROLE_KEY` (no se
agregó una variable de entorno nueva solo para esto). El hash cambia todos los días, así
que no permite rastrear a una persona entre visitas de distintos días.

## Desarrollo local

`vite dev` no sirve estas funciones. Usa `vercel dev` (instrucciones en
`supabase/README.md`, sección "Probar en local").
