#!/usr/bin/env node
// Chequeo semanal de mantenimiento de PettGo.
//
// Solo lectura, sin IA y sin claves privilegiadas: mira el sitio como lo vería un visitante
// anónimo y revisa dependencias, despliegues y el repositorio. Escribe un informe fechado en
// formato Markdown y devuelve en `estado` (verde | amarillo | rojo) el peor resultado.
//
// Uso local:   node scripts/mantenimiento.mjs
// En GitHub:   lo ejecuta .github/workflows/mantenimiento.yml cada lunes.
//
// Variables opcionales: SITE_URL, GITHUB_REPOSITORY, GITHUB_TOKEN (despliegues),
// SALIDA_INFORMES (carpeta del informe), GITHUB_OUTPUT y GITHUB_STEP_SUMMARY (las pone Actions).

import { execSync } from "node:child_process"
import { appendFileSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs"
import { join, relative } from "node:path"

const SITIO = (process.env.SITE_URL || "https://www.pettgo.cl").replace(/\/+$/, "")
const DOMINIO_SIN_WWW = "https://pettgo.cl"
const REPO = process.env.GITHUB_REPOSITORY || "guerradiego2699/pettgo-page"
const TOKEN = process.env.GITHUB_TOKEN
const SALIDA = process.env.SALIDA_INFORMES || "docs/mantenimiento"
const LIMITE_FUNCIONES = 12 // plan Hobby de Vercel

// Dependencias con vulnerabilidad conocida que se aceptan conscientemente (con su motivo).
const ACEPTADOS = {
  xlsx: "Solo se usa para generar archivos Excel, nunca para leer archivos de terceros, que es donde está el riesgo. No existe versión corregida en npm.",
}

// Tablas que NUNCA deben devolver filas a un visitante anónimo.
const TABLAS_PRIVADAS = [
  "productos_pyme", "eventos_producto", "proyecto_actividades", "proyecto_hitos", "proyecto_propuestas",
  "proyecto_reportes_area", "proyecto_auditoria", "profiles", "pets", "reports", "forum_threads", "forum_posts",
]
// Funciones internas que no deben poder llamarse desde la API pública.
const FUNCIONES_INTERNAS = ["handle_new_user", "prevent_role_self_escalation", "rls_auto_enable", "avisar_moderacion_foro"]

// El repositorio es público: en GitHub Actions el informe no nombra qué tabla o función está expuesta
// (sería avisarle a un atacante antes de corregirlo). En local sí se muestra todo el detalle.
const OCULTAR_DETALLE_SENSIBLE = process.env.GITHUB_ACTIONS === "true"
const sensible = (detalle, generico) => (OCULTAR_DETALLE_SENSIBLE ? generico : detalle)

const ICONO = { verde: "🟢", amarillo: "🟡", rojo: "🔴" }
const PESO = { verde: 0, amarillo: 1, rojo: 2 }

// ---------- utilidades ----------
async function pedir(url, opciones = {}) {
  return fetch(url, { signal: AbortSignal.timeout(20000), ...opciones })
}

function peor(...estados) {
  return estados.reduce((a, b) => (PESO[b] > PESO[a] ? b : a), "verde")
}

function nuevo(area) {
  const r = { area, estado: "verde", lineas: [] }
  r.ok = (t) => r.lineas.push(`- ✅ ${t}`)
  r.info = (t) => r.lineas.push(`- ℹ️ ${t}`)
  r.aviso = (t) => { r.estado = peor(r.estado, "amarillo"); r.lineas.push(`- ⚠️ ${t}`) }
  r.falla = (t) => { r.estado = "rojo"; r.lineas.push(`- ❌ ${t}`) }
  return r
}

async function esperar(r, descripcion, fn) {
  try {
    await fn()
  } catch (e) {
    r.falla(`${descripcion}: no se pudo comprobar (${e?.message ?? e})`)
  }
}

// ---------- 1. Sitio y endpoints, vistos como un visitante ----------
async function chequeoSitio() {
  const r = nuevo("Sitio y endpoints")
  const casos = [
    ["GET", `${SITIO}/`, 200, "Portada"],
    ["GET", `${SITIO}/productos`, 200, "Página de productos"],
    ["GET", `${SITIO}/api/admin/metricas`, 401, "API de admin sin sesión (debe rechazar)"],
    ["GET", `${SITIO}/api/foro/aviso`, 405, "Endpoint de avisos con GET (debe rechazar)"],
    ["POST", `${SITIO}/api/foro/aviso`, 401, "Endpoint de avisos sin secreto (debe rechazar)"],
  ]
  for (const [metodo, url, esperado, nombre] of casos) {
    await esperar(r, nombre, async () => {
      const res = await pedir(url, { method: metodo, headers: { "Content-Type": "application/json" }, body: metodo === "POST" ? "{}" : undefined })
      if (res.status === esperado) r.ok(`${nombre}: ${res.status}`)
      else r.falla(`${nombre}: respondió ${res.status} y se esperaba ${esperado}`)
    })
  }
  await esperar(r, "Redirección de pettgo.cl", async () => {
    const res = await pedir(`${DOMINIO_SIN_WWW}/`, { redirect: "manual" })
    if (res.status === 308 && (res.headers.get("location") ?? "").includes("www.pettgo.cl")) r.ok("pettgo.cl redirige a www.pettgo.cl (308)")
    else r.aviso(`pettgo.cl respondió ${res.status}; se esperaba un 308 hacia www (los avisos del foro llaman a www)`)
  })
  return r
}

// ---------- 2. Exposición pública de la base (clave anónima, la misma que ve cualquier visitante) ----------
function decodificarJwt(token) {
  try {
    return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"))
  } catch {
    return null
  }
}

async function obtenerCredencialPublica() {
  const html = await (await pedir(`${SITIO}/`)).text()
  const rutas = [...html.matchAll(/src="(\/assets\/[^"]+\.js)"/g)].map((m) => m[1])
  for (const ruta of rutas) {
    const js = await (await pedir(`${SITIO}${ruta}`)).text()
    const url = js.match(/https:\/\/[a-z0-9]{20}\.supabase\.co/)?.[0]
    // Supabase usa claves nuevas "sb_publishable_…"; los proyectos antiguos, un JWT con rol anon.
    const clave =
      js.match(/sb_publishable_[A-Za-z0-9_-]{16,}/)?.[0] ??
      (js.match(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g) ?? []).find((t) => decodificarJwt(t)?.role === "anon")
    if (url && clave) return { url, clave }
  }
  return null
}

async function chequeoExposicion() {
  const r = nuevo("Exposición pública de la base")
  let cred = null
  await esperar(r, "Credencial pública", async () => {
    cred = await obtenerCredencialPublica()
  })
  if (!cred) {
    if (r.estado === "verde") r.aviso("No se encontró la clave pública en el sitio; no se pudo probar la exposición")
    return r
  }
  // Las claves "sb_publishable_" no son JWT: solo van en `apikey`.
  const cab = cred.clave.startsWith("sb_") ? { apikey: cred.clave } : { apikey: cred.clave, Authorization: `Bearer ${cred.clave}` }

  let expuestas = 0
  for (const tabla of TABLAS_PRIVADAS) {
    await esperar(r, `Tabla ${tabla}`, async () => {
      const res = await pedir(`${cred.url}/rest/v1/${tabla}?select=*&limit=1`, { headers: cab })
      if (res.status >= 400) return // bloqueada: correcto
      const filas = await res.json()
      if (Array.isArray(filas) && filas.length > 0) {
        expuestas++
        r.falla(sensible(`La tabla \`${tabla}\` devuelve datos a un visitante anónimo`, "Una tabla privada devuelve datos a un visitante anónimo (el detalle se muestra al ejecutar el chequeo en local)"))
      }
    })
  }
  if (expuestas === 0 && r.estado === "verde") r.ok(`${TABLAS_PRIVADAS.length} tablas privadas no devuelven datos a un visitante anónimo`)

  let invocables = 0
  for (const fn of FUNCIONES_INTERNAS) {
    await esperar(r, `Función ${fn}`, async () => {
      const res = await pedir(`${cred.url}/rest/v1/rpc/${fn}`, { method: "POST", headers: { ...cab, "Content-Type": "application/json" }, body: "{}" })
      if (res.status >= 200 && res.status < 300) {
        invocables++
        r.falla(sensible(`La función interna \`${fn}\` se puede llamar desde la API pública`, "Una función interna se puede llamar desde la API pública (el detalle se muestra al ejecutar el chequeo en local)"))
      }
    })
  }
  if (invocables === 0 && r.estado === "verde") r.ok(`${FUNCIONES_INTERNAS.length} funciones internas no se pueden llamar desde la API pública`)

  // Las vistas públicas no deben mostrar correos.
  for (const [vista, columna] of [["public_profiles", "email"], ["productos_pyme_publicos", "pyme_email"]]) {
    await esperar(r, `Vista ${vista}`, async () => {
      const res = await pedir(`${cred.url}/rest/v1/${vista}?select=${columna}&limit=1`, { headers: cab })
      if (res.status >= 400) r.ok(`La vista \`${vista}\` no expone \`${columna}\``)
      else r.falla(sensible(`La vista \`${vista}\` expone \`${columna}\``, "Una vista pública expone un dato personal (el detalle se muestra al ejecutar el chequeo en local)"))
    })
  }

  // Datos públicos: informativo.
  await esperar(r, "Productos publicados", async () => {
    const res = await pedir(`${cred.url}/rest/v1/productos_pyme_publicos?select=id,categoria`, { headers: cab })
    if (res.status !== 200) return r.aviso(`No se pudo leer la vista pública de productos (${res.status})`)
    const filas = await res.json()
    const sinCategoria = filas.filter((f) => !f.categoria).length
    r.info(`${filas.length} productos publicados`)
    if (sinCategoria > 0) r.aviso(`${sinCategoria} producto(s) publicados sin categoría`)
  })
  return r
}

// ---------- 3. Despliegues (Vercel avisa a GitHub de cada despliegue) ----------
async function chequeoDespliegues() {
  const r = nuevo("Despliegues")
  if (!TOKEN) {
    r.info("Sin GITHUB_TOKEN: se omite (en GitHub Actions se revisa automáticamente)")
    return r
  }
  await esperar(r, "Despliegues", async () => {
    const cab = { Authorization: `Bearer ${TOKEN}`, Accept: "application/vnd.github+json" }
    const res = await pedir(`https://api.github.com/repos/${REPO}/deployments?per_page=15`, { headers: cab })
    if (!res.ok) return r.aviso(`GitHub respondió ${res.status} al consultar los despliegues`)
    const lista = await res.json()
    if (lista.length === 0) return r.aviso("GitHub no registra despliegues")
    const estados = []
    for (const d of lista.slice(0, 10)) {
      const s = await pedir(d.statuses_url, { headers: cab })
      const ult = s.ok ? ((await s.json())[0] ?? null) : null
      estados.push({ entorno: d.environment, estado: ult?.state ?? "sin_estado", fecha: d.created_at })
    }
    const produccion = estados.filter((e) => /production/i.test(e.entorno))
    const ultimo = produccion[0]
    const hace7 = Date.now() - 7 * 24 * 3600 * 1000
    const fallidos = produccion.filter((e) => ["failure", "error"].includes(e.estado) && new Date(e.fecha).getTime() >= hace7).length
    if (!ultimo) r.aviso("No hay despliegues de producción recientes")
    else if (ultimo.estado === "success") r.ok(`El último despliegue de producción está en verde (${ultimo.fecha.slice(0, 10)})`)
    else if (["failure", "error"].includes(ultimo.estado)) r.falla(`El último despliegue de producción FALLÓ (${ultimo.fecha.slice(0, 10)})`)
    else r.aviso(`El último despliegue de producción está en estado "${ultimo.estado}"`)
    if (fallidos > 0) r.info(`${fallidos} despliegue(s) de producción fallaron en los últimos 7 días`)
  })
  return r
}

// ---------- 4. Dependencias ----------
function auditar() {
  let salida
  try {
    salida = execSync("npm audit --omit=dev --json", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
  } catch (e) {
    salida = e.stdout?.toString() ?? ""
  }
  return JSON.parse(salida)
}

async function chequeoDependencias() {
  const r = nuevo("Dependencias")
  await esperar(r, "npm audit", async () => {
    const j = auditar()
    const vulns = Object.entries(j.vulnerabilities ?? {})
    let graves = 0
    for (const [nombre, v] of vulns) {
      const aceptada = ACEPTADOS[nombre]
      const fix = v.fixAvailable ? (typeof v.fixAvailable === "object" ? `actualizar ${v.fixAvailable.name}@${v.fixAvailable.version}` : "hay arreglo con npm audit fix") : "sin arreglo disponible"
      if (aceptada) {
        r.info(`\`${nombre}\` (${v.severity}) — aceptada: ${aceptada}`)
      } else if (v.severity === "critical" || v.severity === "high") {
        graves++
        r.falla(`\`${nombre}\` tiene una vulnerabilidad ${v.severity} (${fix})`)
      } else if (v.severity === "moderate") {
        r.aviso(`\`${nombre}\` tiene una vulnerabilidad moderada (${fix})`)
      } else {
        r.info(`\`${nombre}\`: vulnerabilidad baja (${fix})`)
      }
    }
    if (graves === 0) r.ok("Sin vulnerabilidades críticas ni altas pendientes en producción")
  })
  return r
}

// ---------- 5. Capacidad de Vercel ----------
function contarFunciones(dir, base = dir) {
  let n = 0
  for (const nombre of readdirSync(dir)) {
    if (nombre.startsWith("_")) continue
    const ruta = join(dir, nombre)
    if (statSync(ruta).isDirectory()) n += contarFunciones(ruta, base)
    else if (/\.(ts|js|mjs)$/.test(nombre)) n++
  }
  return n
}

async function chequeoCapacidad() {
  const r = nuevo("Capacidad de Vercel")
  await esperar(r, "Funciones", async () => {
    const n = contarFunciones("api")
    const msg = `${n} de ${LIMITE_FUNCIONES} funciones serverless usadas (plan Hobby)`
    if (n > LIMITE_FUNCIONES) r.falla(`${msg}: SE EXCEDE el límite y el despliegue fallará`)
    else if (n === LIMITE_FUNCIONES) r.aviso(`${msg}: sin margen para agregar más`)
    else if (n === LIMITE_FUNCIONES - 1) r.aviso(`${msg}: queda 1 de margen`)
    else r.ok(msg)
  })
  return r
}

// ---------- 6. Higiene del repositorio ----------
async function chequeoRepositorio() {
  const r = nuevo("Repositorio")
  await esperar(r, "Repositorio", async () => {
    const archivos = execSync("git ls-files", { encoding: "utf8" }).split("\n").filter(Boolean)

    const env = archivos.filter((f) => /(^|\/)\.env($|\.)/.test(f) && !/\.example$/.test(f))
    if (env.length) r.falla(`Archivos de entorno versionados en git: ${env.join(", ")}`)
    else r.ok("Ningún archivo `.env` real está versionado")

    // Migraciones: números únicos y sin saltos.
    const numeros = archivos.filter((f) => /^supabase\/migrations\/\d{4}_/.test(f)).map((f) => f.split("/").pop().slice(0, 4))
    const repetidos = numeros.filter((n, i) => numeros.indexOf(n) !== i)
    if (repetidos.length) r.falla(`Migraciones con número repetido: ${[...new Set(repetidos)].join(", ")}`)
    else r.ok(`${numeros.length} migraciones, sin números repetidos`)

    // Claves privadas escritas en archivos de texto.
    const patrones = [
      [/sb_secret_[A-Za-z0-9_-]{16,}/, "clave secreta de Supabase"],
      [/re_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16,}/, "clave de Resend"],
      [/-----BEGIN (RSA |EC )?PRIVATE KEY-----/, "llave privada"],
    ]
    const hallazgos = []
    for (const f of archivos) {
      if (/package-lock\.json$|\.(png|jpe?g|webp|ico|pdf|docx|zip|woff2?)$/i.test(f)) continue
      let texto
      try {
        if (statSync(f).size > 1_000_000) continue
        texto = readFileSync(f, "utf8")
      } catch {
        continue
      }
      for (const [re, nombre] of patrones) if (re.test(texto)) hallazgos.push(`${nombre} en \`${f}\``)
      for (const t of texto.match(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g) ?? []) {
        if (decodificarJwt(t)?.role === "service_role") hallazgos.push(`clave service_role en \`${f}\``)
      }
    }
    if (hallazgos.length) r.falla(`Posibles claves privadas en el repositorio: ${[...new Set(hallazgos)].join("; ")}`)
    else r.ok("No se detectaron claves privadas escritas en el código")
  })
  return r
}

// ---------- informe ----------
function fechaChile() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date())
}

function observaciones(r) {
  const n = r.lineas.filter((l) => l.startsWith("- ❌") || l.startsWith("- ⚠️")).length
  return n === 0 ? "Sin observaciones" : n === 1 ? "1 observación" : `${n} observaciones`
}

function armarInforme(resultados, estado, fecha) {
  const resumen = resultados.map((r) => `| ${r.area} | ${ICONO[r.estado]} | ${observaciones(r)} |`)
  const pendientes = resultados.flatMap((r) => r.lineas.filter((l) => l.startsWith("- ❌") || l.startsWith("- ⚠️")).map((l) => `${l} _(${r.area})_`))
  return [
    `# Informe de mantenimiento — ${fecha}`,
    "",
    `**Estado general: ${ICONO[estado]} ${estado[0].toUpperCase() + estado.slice(1)}**`,
    "",
    "Chequeo automático de solo lectura, sin IA. Mira el sitio como un visitante anónimo y revisa dependencias, despliegues y el repositorio.",
    "",
    "| Área | Estado | Observaciones |",
    "|---|---|---|",
    ...resumen,
    "",
    "## Pendientes",
    "",
    ...(pendientes.length ? pendientes : ["- Ninguno. Todo en orden."]),
    "",
    "## Detalle",
    "",
    ...resultados.flatMap((r) => [`### ${ICONO[r.estado]} ${r.area}`, "", ...r.lineas, ""]),
    "---",
    "_Generado por `scripts/mantenimiento.mjs`. No cambia configuración, datos ni código; solo informa._",
    "",
  ].join("\n")
}

async function main() {
  const resultados = []
  for (const chequeo of [chequeoSitio, chequeoExposicion, chequeoDespliegues, chequeoDependencias, chequeoCapacidad, chequeoRepositorio]) {
    resultados.push(await chequeo())
  }
  const estado = peor(...resultados.map((r) => r.estado))
  const fecha = fechaChile()
  const informe = armarInforme(resultados, estado, fecha)

  mkdirSync(SALIDA, { recursive: true })
  const archivo = join(SALIDA, `${fecha}.md`)
  writeFileSync(archivo, informe)
  console.log(informe)
  console.log(`\nInforme guardado en ${relative(process.cwd(), archivo)}`)

  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `estado=${estado}\nfecha=${fecha}\n`)
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, informe)
}

main().catch((e) => {
  console.error("El chequeo de mantenimiento falló:", e)
  process.exit(2)
})
