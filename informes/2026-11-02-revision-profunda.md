# Revisión profunda — 2026-11-02

**Estado general: 🟡 Amarillo.** El sitio funciona sin errores reales y los avisos del foro llegan bien. Siguen abiertos pendientes de la revisión anterior, hay un reporte nuevo del foro y apareció en producción una vista nueva que no está en las migraciones del repositorio.

Segunda revisión profunda, 5 días después de la primera (2026-10-28). Hecha por un agente de IA conectado a Vercel, Supabase y Resend, en modo solo lectura.

| Área | Estado | Hallazgo principal |
|---|---|---|
| Despliegues | 🟢 | Los 9 despliegues de producción recientes están en verde. El único `ERROR` es una vista previa de la rama de informes del 28-oct, ya resuelta. |
| Errores en producción | 🟢 | Solo la advertencia `DEP0169` (`url.parse`) de una dependencia: 21 veces en 7 días. Sin errores reales. |
| Límite de funciones | 🟡 | **11 de 12** funciones serverless. Sin cambios; queda 1 de margen. |
| Seguridad de la base | 🟡 | **Nuevo:** vista `productos_pyme_destacados` (SECURITY DEFINER) creada fuera de las migraciones. Siguen `public_suppliers` y la protección de contraseñas. |
| Rendimiento de la base | 🟢 | Mismos avisos menores que la vez anterior (20 políticas RLS, 10 FK sin índice, 1 índice sin uso). |
| Correos | 🟢 | Desde el 28-oct, 6 de 6 correos entregados. Lista de bloqueos vacía. Los rebotes y supresiones son del 22-oct (antes de crear el alias). |
| Dependencias | 🟡 | 0 críticas, 1 alta (`xlsx`, aceptada), 4 bajas (`resend` v6). |
| Datos del sitio | 🟡 | **3 reportes del foro sin resolver** (eran 2). 2 propuestas pendientes, ninguna vencida. |
| Avisos de moderación | 🟢 | El aviso del reporte de hoy salió con HTTP 200 y llegó a `seguridad@`. |

## Detalle

### Despliegues (Vercel)
- Producción actual: `dpl_2ASEoZH3AWW4ueZvSJWdtV2DTVe3` (READY), commit `f519e34`.
- De los últimos 10 despliegues, 9 son de producción en verde. El único `ERROR` (`dpl_GU8V64rB…`) fue el intento de Vercel de desplegar la rama `registro-mantenimiento` el 28-oct. El commit `a21a308` desactivó los despliegues de esa rama y los dos informes posteriores ya no generaron despliegues. **Resuelto.**
- No hubo despliegues nuevos de producción desde el 28-oct.

### Errores en producción
- Un solo grupo: advertencia `DEP0169` (`url.parse()` obsoleto), 21 apariciones, 9 usuarios, rutas `/api/admin/metricas`, `/api/admin/tendencias`, `/api/admin/proyecto` e `/api/ir/[id]`. Viene de una librería, no del código propio. **Ruido**, no error real.

### Límite de funciones
- 11 archivos `.ts` en `api/` (sin contar los que empiezan con `_`): `admin/metricas`, `admin/producto/[id]`, `admin/proponer`, `admin/proyecto`, `admin/tendencias`, `admin/tendencias/informe`, `evento`, `foro/aviso`, `ir/[id]`, `propuesta/index`, `propuesta/responder`.
- 11 de 12 en el plan Hobby. Cualquier endpoint nuevo debe fusionarse con uno existente o requerirá cambiar de plan.

### Seguridad de la base (Supabase)
- **Nuevo — vista `productos_pyme_destacados` con SECURITY DEFINER.** No aparece en ninguna migración del repositorio, así que se creó directo en producción. Muestra solo productos publicados (los mismos campos públicos de `productos_pyme_publicos`, sin correo de la pyme) más una columna `clics` con el total de vistas por producto, calculada desde `eventos_producto`. Es legible por visitantes anónimos. El riesgo es bajo, pero hay que versionarla en una migración y decidir si el conteo de vistas debe ser público. Además, la columna se llama `clics` pero cuenta eventos de tipo `vista`.
- **`public_suppliers`** (resto del modelo de dropshipping, expone `id, name, city` de proveedores): sigue esperando decisión.
- **`is_admin`** ejecutable por `anon`/`authenticated`: intencional, porque las políticas RLS la usan.
- **Protección contra contraseñas filtradas:** sigue desactivada.
- **7 tablas con RLS y sin políticas (INFO):** diseño deliberado, solo se accede vía `/api`.
- Siguen corregidos los hallazgos del 28-oct: no reaparecen `pg_net` en `public` ni las 3 funciones de trigger invocables.

### Rendimiento de la base
- 20 políticas que reevalúan `auth.uid()` por fila, 10 claves foráneas sin índice y 1 índice sin uso (`productos_pyme_categoria_idx`). Mismos avisos que la vez anterior. No tienen efecto real con el volumen actual.

### Correos (Resend)
- Últimos 30 días: 8 enviados, 7 entregados, 1 rebote permanente y 3 suprimidos. Sin quejas ni fallos.
- El rebote y las 3 supresiones son del 22-oct, de las pruebas a `seguridad@pettgo.cl` hechas antes de crear el alias en ImprovMX. Desde el 28-oct todo se entrega: 4 avisos del foro y 2 propuestas a pymes.
- Lista de bloqueos (suppressions): **vacía**.
- Aperturas y clics en 0: probablemente el seguimiento está desactivado. No es un problema.

### Dependencias (`npm audit --omit=dev`)
- **0 críticas** (se mantiene la corrección de `dompurify`).
- **1 alta — `xlsx`** (directa): sin versión corregida en npm. Es un riesgo aceptado, porque solo se generan archivos y no se leen.
- **4 bajas** — `resend`, `@react-email/render`, `deepmerge` y `html-to-text`: se corrigen con `resend@6.37.0`, un cambio mayor.
- El chequeo automático (`scripts/mantenimiento.mjs`) corrido hoy da **🟡 Amarillo**, con la única observación de 11 de 12 funciones. El resto está en verde: endpoints, exposición pública, despliegues, dependencias y repositorio.

### Datos del sitio
| Indicador | 28-oct | 02-nov |
|---|---|---|
| Usuarios (`profiles`) | 11 | 11 (1 alta en los últimos 7 días) |
| Mascotas | 10 | 10 |
| Productos publicados | 3 | 3 |
| Productos pendientes (propuestas) | 0 | **2** (vencen desde el 13-nov) |
| Publicados sin categoría | 0 | 0 |
| Propuestas con token vencido | 0 | 0 |
| Reportes del foro sin resolver | 2 | **3** (2 de agosto, 1 de hoy) |
| Temas con más de 3 días sin respuesta | 0 | 0 |
| Temas de prueba `[PRUEBA]` olvidados | 0 | 0 |
| Veterinarias | 1 aprobada | 1 aprobada |
| Especialistas | 0 | 0 |
| Eventos de producto registrados | — | 45 |

### Avisos de moderación
- `net._http_response`: 1 fila, con status 200. Corresponde al aviso del reporte de hoy, que llegó a `seguridad@` como "Respuesta reportada en el foro". Las respuestas antiguas se borran solas, así que esta cifra solo muestra lo reciente.

## Cambios desde la revisión anterior

- **Corregido:** la vista previa fallida de la rama de informes no se repite, porque esa rama ya no despliega.
- **Se mantiene corregido:** `dompurify`, `pg_net` fuera de `public` y las 3 funciones de trigger no invocables.
- **Nuevo:** vista `productos_pyme_destacados` creada en producción sin migración.
- **Nuevo:** 1 reporte del foro hoy. Ahora hay 3 sin resolver.
- **Nuevo:** 2 propuestas enviadas a una pyme el 30-oct, pendientes de respuesta y vigentes hasta mediados de noviembre.
- **Sin cambios:** 11 usuarios, 10 mascotas, 3 productos publicados y 11 de 12 funciones.
- **Correos:** de 3 enviados y 1 rebote (7 días al 28-oct) a 8 enviados en 30 días, todos entregados desde el 28-oct.

## Pendientes ordenados por prioridad

1. Resolver los **3 reportes del foro** en `/admin/reportes`. Dos llevan más de 2 meses abiertos. *(responsable: Diego)*
2. **Versionar la vista `productos_pyme_destacados`** en una migración nueva (`0016`) con su definición actual, y decidir si `clics` debe ser público o si se le cambia el nombre a `vistas`. *(agente propone, Diego aprueba)*
3. Agregar `productos_pyme_destacados` al chequeo semanal, junto a las otras vistas públicas, para detectar si algún día expone `pyme_email`. *(agente propone)*
4. Decidir qué hacer con la vista legada `public_suppliers`. *(responsable: Diego)*
5. Activar la protección contra contraseñas filtradas si el plan lo permite. *(responsable: Diego)*
6. Dar seguimiento a las 2 propuestas pendientes antes de que venzan (13-nov). *(responsable: Diego)*
7. Evaluar el reemplazo de `xlsx` y la subida de `resend` a v6. Tener presente el margen de 1 sola función serverless. *(a futuro)*
8. Optimizar las políticas RLS e índices cuando crezca el número de usuarios. *(a futuro)*

## Método

Revisión **solo de lectura**: listado de despliegues y errores de Vercel, avisos de seguridad y rendimiento de Supabase, consultas `SELECT` sobre el proyecto de producción, métricas y listados de Resend, `npm audit --omit=dev` y el script de chequeo semanal con salida a una carpeta temporal. No se cambió configuración, datos, código ni variables de entorno, y no se enviaron correos. Las cifras son agregadas y no incluyen datos personales. Cada corrección propuesta la aprueba una persona antes de aplicarla.
