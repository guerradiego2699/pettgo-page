# Agente de Control de Calidad de la Información — PettGo

Agente que se ejecuta **solo, cada lunes a las 13:00 UTC (10:00 en Chile en verano, 09:00 en invierno)** y revisa que la información que ven los usuarios en pettgo.cl sea correcta. No necesita que nadie lo abra: corre en GitHub Actions, de forma gratuita, con el flujo `.github/workflows/agente-calidad.yml` de este repositorio.

## Qué revisa

| Revisión | Cómo | Ejemplos de lo que detecta |
|---|---|---|
| **Base de datos** | Lee las tablas de Supabase (solo lectura) | Campos vacíos, teléfonos que no tienen 9 dígitos, correos y URL mal escritos, coordenadas en (0,0), invertidas o fuera de Curicó, nombres duplicados, precios en 0, textos de prueba ("test", "lorem") |
| **Sitio web (como usuario)** | Un navegador automático recorre pettgo.cl y hace clic en todos los enlaces | Páginas que no cargan o dan 404, enlaces rotos, botones sin destino, imágenes rotas, "undefined" o "null" visibles en pantalla, enlaces "llamar"/"escribir" mal escritos |
| **Enlaces externos** | Visita la tienda o web de cada pyme y veterinaria | Sitios caídos, dominios vencidos o en venta, enlaces que redirigen a otra empresa |
| **Cruce BD ↔ sitio** | Compara lo que dice la BD con lo que muestra la página | Registros que están en la BD pero no aparecen publicados; teléfonos de la BD que no coinciden con los del sitio |

Cada hallazgo se clasifica como **Crítico**, **Advertencia** o **Menor**, y se marca como **nuevo** si no estaba en el reporte de la semana anterior.

## Resultado

- **Historial en git**: cada ejecución guarda el reporte en la rama `registro-mantenimiento`, carpeta `calidad/` (`AAAA-MM-DD.md` por semana, más el último `reporte.html` y `ultimo.json`). Esa rama no se despliega en Vercel. El repositorio es público: cualquiera puede leer estos reportes.
- **Reporte HTML** descargable (se guarda 90 días en GitHub).
- **Resumen** visible directamente en la página de la ejecución en GitHub.
- **Aviso por correo**: si hay hallazgos críticos, GitHub marca la ejecución como fallida y avisa al dueño del repositorio. Opcionalmente, envía el reporte completo a los correos que se definan.
- **Resumen redactado por IA** (opcional, solo si se agrega una llave de API).

## Instalación (una sola vez, ~15 minutos)

### 1. Dónde vive
El agente está en la carpeta `agente-calidad/` del repositorio de la página (`pettgo-page`) y su flujo en `.github/workflows/agente-calidad.yml`. Una ejecución semanal usa unos 20 de los minutos gratuitos de Actions al mes.

### 2. Obtener los datos de Supabase
En el panel de Supabase del proyecto, en la configuración de la API, copiar:
- **Project URL** (ej. `https://abcd1234.supabase.co`)
- Una llave de acceso:
  - **Recomendada:** la llave pública (*publishable* o *anon*). Como el agente solo revisa información que ya es pública, basta con esa y no puede modificar nada.
  - Si con la llave pública alguna tabla aparece vacía (por las políticas de seguridad RLS), usar la llave secreta (*secret* o *service_role*). Esa llave da acceso total: **solo debe guardarse como Secret de GitHub, nunca escrita en un archivo.**

### 3. Guardar las credenciales en GitHub
En el repositorio: **Settings → Secrets and variables → Actions → New repository secret**.

| Secret | Obligatorio | Valor |
|---|---|---|
| `SUPABASE_URL` | Sí | Project URL |
| `SUPABASE_KEY` | Sí | Llave de Supabase |
| `SMTP_USUARIO` | No | Gmail desde el que se envía el reporte |
| `SMTP_CLAVE` | No | Contraseña de aplicación de Google (requiere verificación en 2 pasos) |
| `CORREO_DESTINO` | No | Correos que reciben el reporte, separados por coma |
| `ANTHROPIC_API_KEY` | No | Activa el resumen redactado por IA |

### 4. Probarlo
**Actions → Agente de control de calidad → Run workflow.** Al terminar (~3–5 min), abrir la ejecución para ver el resumen y descargar el reporte en *Artifacts*, o leerlo en la rama `registro-mantenimiento` (carpeta `calidad/`).

Desde ese momento corre solo cada lunes.

### 5. Ajustar (si hace falta)
Revisar el registro de la primera ejecución: muestra qué tablas y columnas reconoció. Si alguna tabla no se revisó o una columna no se reconoció, definirla en `config.yaml` (sección `tablas`, hay un ejemplo comentado). Si Supabase no permite descubrir las tablas automáticamente con la llave pública, también hay que escribirlas ahí.

## Modo demostración (verlo trabajar en vivo)

Abre una ventana de Chrome donde se ve al agente recorrer pettgo.cl: un panel muestra qué está revisando, y cada enlace se marca en **amarillo** mientras se prueba, luego en **verde** (funciona), **naranjo** (advertencia) o **rojo** (error). Al terminar, abre el reporte automáticamente.

**Preparación (una sola vez):**
1. Instalar Python desde python.org (en Windows, marcar *"Add Python to PATH"* al instalar).
2. Descomprimir esta carpeta y abrir una terminal dentro de ella (Windows: clic derecho en la carpeta → *Abrir en Terminal*; Mac: arrastrar la carpeta a la app Terminal después de escribir `cd `).
3. Instalar lo necesario:
   ```
   pip install -r requirements.txt
   python -m playwright install chromium
   ```
4. Copiar `.env.ejemplo` como `.env` y completar `SUPABASE_URL` y `SUPABASE_KEY`. Este archivo queda solo en el computador y no se sube a GitHub. Sin él, el agente igual recorre el sitio, pero no revisa la base de datos.

**Ejecutar:**
```
python agente_calidad.py --demo
```
(En Mac puede ser `python3` en vez de `python`.)

La velocidad se ajusta en `config.yaml` (`demo_pausa_ms`): más alto = más lento y fácil de seguir en una presentación.

## Ejecutarlo en un computador sin ventana

```
python agente_calidad.py
```
El reporte queda en `reportes/reporte.html`.

## Limitaciones conocidas

- Instagram, Facebook y WhatsApp bloquean a los robots: esos enlaces se marcan como "no verificable automáticamente" (Menor) para revisarlos a mano.
- El cruce BD ↔ sitio busca el nombre exacto del registro en el texto de las páginas recorridas. Si una página solo muestra los datos después de un filtro o búsqueda, hay que agregar esa ruta en `paginas_extra`.
- GitHub puede retrasar las ejecuciones programadas unos minutos en horas de alta demanda.
- El agente **solo lee y reporta**: no corrige datos por su cuenta. La corrección queda a cargo del área responsable.
