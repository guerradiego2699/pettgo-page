# Informe de mantenimiento — 28 de octubre de 2026

**Estado general: 🟡 Amarillo.** El sitio funciona sin errores reales. Hay mejoras de seguridad y dependencias pendientes, ninguna urgente.

Primera ejecución del chequeo (manual, solo lectura) hecha con un agente de IA conectado a Vercel, Supabase y Resend. Nada fue modificado durante la revisión.

## Resumen por área

| Área | Estado | Hallazgo principal |
|---|---|---|
| Despliegues (Vercel) | 🟢 | 9 de los últimos 10 despliegues en verde. El único fallo es del 30-sep y ya está resuelto. |
| Errores en producción | 🟢 | Solo una advertencia de una dependencia (`url.parse`, 7 veces). Sin impacto. |
| Límite de funciones | 🟡 | **11 de 12** funciones serverless usadas. Queda 1 de margen. |
| Seguridad de la base (Supabase) | 🟡 | Ver detalle abajo. |
| Rendimiento de la base | 🟢 | Solo optimizaciones menores; irrelevantes con el volumen actual. |
| Correos (Resend) | 🟢 | Dominio verificado, lista de bloqueos vacía, sin quejas. |
| Dependencias (`npm audit`) | 🟡 | 1 crítica (indirecta), 1 alta, 4 bajas. |
| Datos del sitio | 🟡 | 2 reportes del foro sin resolver. |
| Avisos de moderación | 🟢 | Los avisos del foro responden bien (2 de 2 con HTTP 200). |

## Detalle

### Vercel
- Último despliegue: `dpl_A92FWCRwQ1tgXp2fyxs8sxfq7tXP` (READY).
- Funciones en `/api`: 11 de 12 permitidas por el plan Hobby.
- Advertencia `DEP0169` (`url.parse`): viene de una librería, no del código propio. Se vigila, no se corrige.

### Supabase: seguridad
- **Vistas con SECURITY DEFINER (4):** `productos_pyme_publicos`, `public_profiles` y `public_pets` son un compromiso aceptado y documentado. **`public_suppliers` no lo está**: parece un resto del antiguo modelo de dropshipping. Conviene decidir si se elimina.
- **`pg_net` instalado en el esquema `public` (WARN):** lo introduje yo al activar los avisos del foro. Hay que moverlo a otro esquema, comprobando antes que los avisos sigan funcionando.
- **Funciones SECURITY DEFINER ejecutables por usuarios (WARN):** `handle_new_user`, `prevent_role_self_escalation` y `rls_auto_enable` son funciones de trigger y no necesitan ser llamables desde la API pública. `is_admin` sí debe seguir ejecutable, porque las políticas de acceso la usan.
- **Protección contra contraseñas filtradas desactivada (WARN):** se activa desde el panel de Supabase (Auth → Passwords). Puede requerir un plan de pago.
- **7 tablas con RLS y sin políticas (INFO):** es el diseño deliberado del proyecto; solo se accede vía `/api`.

### Supabase: rendimiento
- 20 políticas de acceso que reevalúan `auth.uid()` por fila (se corrige con `(select auth.uid())`). Sin efecto real con 11 usuarios.
- 10 claves foráneas sin índice y 1 índice sin uso (`productos_pyme_categoria_idx`, por el poco volumen). Se ignora por ahora.

### Resend
- Dominio `pettgo.cl` verificado. Sin direcciones bloqueadas.
- Últimos 7 días: 3 enviados, 2 entregados, 1 rebotado (la prueba inicial a `seguridad@pettgo.cl`, antes de crear el alias).

### Dependencias (`npm audit`, solo producción)
- **`dompurify` (crítica, indirecta):** hay arreglo disponible. En la práctica el riesgo es bajo porque no se usa la función afectada, pero conviene actualizar.
- **`xlsx` (alta, directa):** no existe versión corregida en npm. Las fallas afectan al *leer* archivos manipulados; PettGo solo *genera* Excel, así que el riesgo real es bajo. Se documenta y se revisa si migrar a otra librería.
- **`resend` y 3 dependencias suyas (bajas):** se corrigen subiendo `resend` a la versión 6, un cambio mayor que hay que probar.

### Datos
- 3 productos publicados, todos con categoría. 0 propuestas pendientes ni vencidas.
- **2 reportes del foro sin resolver** (revisar en `/admin/reportes`).
- 0 temas sin respuesta por más de 3 días. Sin datos de prueba olvidados.
- Totales: 11 usuarios, 10 mascotas, 1 veterinaria aprobada, 0 especialistas.

## Pendientes ordenados por prioridad

1. Resolver los 2 reportes del foro pendientes. *(responsable: Diego)*
2. Actualizar `dompurify` con `npm audit fix` y probar el PDF. *(agente propone, Diego aprueba)*
3. Mover `pg_net` fuera del esquema `public` y volver a probar los avisos. *(agente propone)*
4. Quitar el permiso de ejecución pública a `handle_new_user`, `prevent_role_self_escalation` y `rls_auto_enable`. *(agente propone)*
5. Decidir qué hacer con la vista legada `public_suppliers`. *(responsable: Diego)*
6. Activar la protección contra contraseñas filtradas si el plan lo permite. *(responsable: Diego)*
7. Evaluar reemplazo de `xlsx` y la subida de `resend` a v6. *(a futuro)*
8. Optimizar las políticas RLS cuando crezca el número de usuarios. *(a futuro)*

## Método

El agente solo leyó información (despliegues, registros, avisos de seguridad, métricas de correo, `npm audit` y consultas `SELECT`). No cambió configuración, datos ni código. Cada corrección se propone y la aprueba una persona.

## Seguimiento: correcciones hechas el mismo día

Después de esta revisión, Diego aprobó las correcciones. Cada una se hizo por separado y se probó antes de darla por buena.

| # | Pendiente | Resultado |
|---|---|---|
| 1 | Resolver los 2 reportes del foro | ⏳ Pendiente (Diego) |
| 2 | Actualizar `dompurify` | ✅ Subió de 3.4.16 a 3.4.17 (commit `6c3586d`). La vulnerabilidad crítica desapareció del `npm audit`. Solo cambió `package-lock.json`; el PDF y el build siguen funcionando. |
| 3 | Mover `pg_net` fuera de `public` | ✅ La extensión no es movible, así que se reinstaló en el esquema `extensions` (migración `0015`, commit `2aa005c`). Se comprobó que los avisos del foro siguen llegando: HTTP 200 y correo enviado. |
| 4 | Quitar el permiso público a 3 funciones internas | ✅ `handle_new_user`, `prevent_role_self_escalation` y `rls_auto_enable` ya no son invocables desde la API. Se comprobó que el trigger de protección de roles sigue bloqueando a un usuario común que intenta hacerse administrador. `is_admin` se mantiene, porque las políticas de acceso la necesitan. |
| 5 | Decidir sobre la vista `public_suppliers` | ⏳ Pendiente (Diego) |
| 6 | Protección contra contraseñas filtradas | ⏳ Pendiente (Diego). Se activa en el panel de Supabase; puede requerir plan de pago. |
| 7 | Reemplazo de `xlsx` y subida de `resend` a v6 | 🗓️ A futuro. `xlsx` queda como riesgo aceptado y documentado. |
| 8 | Optimizar las políticas RLS | 🗓️ A futuro. |

**Verificación posterior:** el Security Advisor ya no muestra el aviso de `pg_net` ni los de las tres funciones. Solo quedan `is_admin` (intencional), las 4 vistas con SECURITY DEFINER (3 son un compromiso aceptado y `public_suppliers` espera decisión) y la protección de contraseñas.

**Automatización:** a partir de este informe, el chequeo básico corre solo cada lunes (commit `7b68957`) y deja su informe en esta misma rama.
