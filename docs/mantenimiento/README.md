# Mantenimiento de PettGo

Cada semana un chequeo automático revisa el estado del sitio y deja un informe fechado en
git. Así hay historial: qué se revisó, qué se detectó y cuándo se corrigió.

## Cómo funciona

| Pieza | Dónde está | Qué hace |
|---|---|---|
| Chequeo | [`scripts/mantenimiento.mjs`](../../scripts/mantenimiento.mjs) | Revisa el sitio, dependencias, despliegues y repositorio. Solo lectura, sin IA, sin claves privadas. |
| Programación | [`.github/workflows/mantenimiento.yml`](../../.github/workflows/mantenimiento.yml) | Lo ejecuta en GitHub Actions cada lunes, o a mano desde la pestaña Actions. |
| Historial | Rama [`registro-mantenimiento`](https://github.com/guerradiego2699/pettgo-page/tree/registro-mantenimiento) | Un informe por semana en `informes/AAAA-MM-DD.md`. Esa rama no se despliega en Vercel. |

## Qué revisa

1. **Sitio y endpoints:** portada, productos, y que la API de admin y los avisos rechacen a quien no corresponde.
2. **Exposición pública de la base:** con la misma clave que ve cualquier visitante, comprueba que las tablas privadas no devuelvan datos, que las funciones internas no se puedan llamar y que las vistas públicas no muestren correos.
3. **Despliegues:** que el último despliegue de producción haya salido bien.
4. **Dependencias:** vulnerabilidades críticas o altas en lo que va a producción.
5. **Capacidad de Vercel:** cuántas de las 12 funciones del plan gratis se usan.
6. **Repositorio:** que no haya archivos `.env` ni claves escritas en el código, y que las migraciones no repitan número.

El semáforo general es el peor resultado de las seis áreas. Si queda en 🔴, el flujo termina en
error y GitHub avisa por correo.

## Qué NO hace

No cambia configuración, datos ni código: solo informa. Las correcciones las propone y las
aprueba una persona. Tampoco revisa lo que exige claves privadas (Security Advisor de Supabase,
métricas de Resend, datos internos de la base): eso se hace en la revisión profunda.

## Ejecutarlo a mano

En local (muestra el detalle completo, incluidos los nombres de lo expuesto si hubiera algo):

```bash
node scripts/mantenimiento.mjs
```

En GitHub: pestaña **Actions** → **Mantenimiento semanal** → **Run workflow**.

## Revisión profunda (con agente)

Una vez al mes, o cuando haga falta, un agente de IA con acceso de lectura a Vercel, Supabase y
Resend hace la revisión que el chequeo automático no puede: Security Advisor, correos rebotados
y datos internos (reportes sin resolver, propuestas vencidas). Su informe se guarda en la misma
rama, como `informes/AAAA-MM-DD-revision-profunda.md`.

## Vulnerabilidades aceptadas

Una dependencia con vulnerabilidad conocida puede aceptarse de forma consciente, con su motivo,
en la constante `ACEPTADOS` de `scripts/mantenimiento.mjs`. Hoy está `xlsx`: solo se usa para
generar Excel, no para leer archivos de terceros, que es donde está el riesgo, y no existe
versión corregida en npm.

## Privacidad

El repositorio es público, así que los informes también lo son. Por eso, cuando el chequeo corre
en GitHub, si detecta una exposición dice que existe pero **no nombra** la tabla o función
afectada. El detalle completo aparece al ejecutarlo en local.
