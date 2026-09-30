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

### Gestión de Proyecto (`/api/admin/proyecto/*`, todo solo admin)

Herramienta interna (actividades, hitos, riesgos, propuestas, reportes de área y
auditoría) — no la ven los usuarios de PettGo. Importante: las reglas de cálculo
(puntaje de riesgo, ruta crítica, prioridad sugerida) están en
`api/_lib/proyectoCalculos.ts` y son un diseño propio para este proyecto, pensado para
ser transparente y fácil de ajustar — no la réplica de ningún sistema externo.

- **`GET /api/admin/proyecto`** — calcula y devuelve todo: resumen, actividades con sus
  métricas, hitos, alertas, ruta crítica, ciclos y el grafo de dependencias.
  `?registrar=analisis|reporte` además guarda una entrada en la auditoría.
- **`POST /api/admin/proyecto/actividades`** — crea una actividad.
- **`PATCH/DELETE /api/admin/proyecto/actividades/[codigo]`** — edita o elimina. Tocar un
  campo sensible (actividad, responsable, fechas, prioridad, dependencias) o eliminar
  devuelve 409 pidiendo `{ aprobado_por, confirmar_cambio_sensible: true }` — es el mismo
  flujo de aprobación en las dos rutas (actividades y hitos).
- **`POST /api/admin/proyecto/hitos`** / **`PATCH/DELETE .../hitos/[codigo]`** — igual que
  actividades.
- **`GET/POST /api/admin/proyecto/propuestas`** — lista o genera una propuesta de
  reprogramación (calcula el desplazamiento y qué actividades dependientes se verían
  afectadas). Nunca mueve fechas sola.
- **`POST /api/admin/proyecto/propuestas/[id]`** — aprueba o rechaza una propuesta
  (`{ aprobado, responsable, comentario? }`).
- **`GET/POST /api/admin/proyecto/reportes-area`** — reportes de avance de cada agente de
  área, con la diferencia contra el avance real registrado en la actividad.
- **`GET /api/admin/proyecto/auditoria`** — últimas 150 entradas.

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
