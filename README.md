# Registro de mantenimiento de PettGo

Esta rama guarda el **historial** del mantenimiento del sitio. No contiene código: no se
despliega en Vercel ni se mezcla con `main`.

- `informes/AAAA-MM-DD.md` — chequeo automático semanal (lunes). Lo genera
  `scripts/mantenimiento.mjs` desde GitHub Actions.
- `informes/AAAA-MM-DD-revision-profunda.md` — revisión con agente de IA, que sí puede mirar el
  Security Advisor de Supabase, los correos de Resend y datos internos.

Cómo funciona todo y cómo ejecutarlo: [`docs/mantenimiento/README.md` en main](https://github.com/guerradiego2699/pettgo-page/blob/main/docs/mantenimiento/README.md).

Cada informe es un commit, así que `git log` de esta rama es la bitácora de cómo ha ido el sitio
semana a semana.
