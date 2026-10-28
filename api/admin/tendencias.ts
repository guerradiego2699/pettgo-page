import type { VercelRequest, VercelResponse } from "@vercel/node"
import { supabaseAdmin } from "../_lib/supabaseAdmin.js"
import { requireAdmin } from "../_lib/auth.js"
import { normalizarCategoria } from "../_lib/categorias.js"

type Periodo = "diario" | "semanal" | "mensual"
const DIAS_POR_PERIODO: Record<Periodo, number> = { diario: 1, semanal: 7, mensual: 30 }
const ETIQUETA_PERIODO: Record<Periodo, { label: string; prev: string; long: string }> = {
  diario: { label: "Hoy", prev: "ayer", long: "Diario (hoy vs. ayer)" },
  semanal: { label: "Últimos 7 días", prev: "los 7 días anteriores", long: "Semanal (7 días vs. 7 anteriores)" },
  mensual: { label: "Últimos 30 días", prev: "los 30 días anteriores", long: "Mensual (30 días vs. 30 anteriores)" },
}
const MS_DIA = 24 * 60 * 60 * 1000

function fechaCorta(d: Date): string {
  return d.toLocaleDateString("es-CL", { day: "numeric", month: "short" })
}

function origenDeReferer(referer: string | null): string {
  if (!referer) return "Directo"
  let host = ""
  try {
    host = new URL(referer).hostname.replace(/^www\./, "")
  } catch {
    return "Directo"
  }
  if (host.includes("instagram")) return "Instagram"
  if (host.includes("google")) return "Google"
  if (host.includes("whatsapp") || host.includes("wa.me")) return "WhatsApp"
  if (host.includes("facebook") || host.includes("fb.")) return "Facebook"
  if (host.includes("pettgo")) return "Dentro de PettGo"
  return "Otros"
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método no permitido." })
  }

  const auth = await requireAdmin(req)
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error })

  const periodo: Periodo = ["diario", "semanal", "mensual"].includes(req.query.periodo as string)
    ? (req.query.periodo as Periodo)
    : "diario"

  const dias = DIAS_POR_PERIODO[periodo]
  const ahora = new Date()
  const inicioActual = new Date(ahora.getTime() - dias * MS_DIA)
  const inicioPrevio = new Date(inicioActual.getTime() - dias * MS_DIA)
  // Ventana amplia (180 días) para poder armar la serie de tiempo sin importar el período elegido.
  const inicioVentana = new Date(ahora.getTime() - 180 * MS_DIA)

  const [
    { data: productos, error: eProductos },
    { data: eventos, error: eEventos },
    { data: profiles, error: eProfiles },
    { data: pets, error: ePets },
    { data: vets, error: eVets },
    { data: specialists, error: eSpecialists },
    { data: threads, error: eThreads },
    { data: posts, error: ePosts },
    { data: reports, error: eReports },
  ] = await Promise.all([
    supabaseAdmin
      .from("productos_pyme")
      .select("id, nombre, categoria, especie, pyme_nombre, pyme_email, estado, creado_en, actualizado_en, token_expira"),
    supabaseAdmin
      .from("eventos_producto")
      .select("producto_id, tipo, creado_en, referer")
      .gte("creado_en", inicioVentana.toISOString()),
    supabaseAdmin.from("profiles").select("id, created_at"),
    supabaseAdmin.from("pets").select("id, owner_id, species, age_years, created_at"),
    supabaseAdmin.from("vets").select("status, is_24h, services"),
    supabaseAdmin.from("specialists").select("status, services"),
    supabaseAdmin.from("forum_threads").select("id, created_at"),
    supabaseAdmin.from("forum_posts").select("id, thread_id, created_at"),
    supabaseAdmin.from("reports").select("resolved"),
  ])

  const error = eProductos || eEventos || eProfiles || ePets || eVets || eSpecialists || eThreads || ePosts || eReports
  if (error) {
    console.error("Error en /api/admin/tendencias:", error)
    return res.status(500).json({ error: "No se pudieron cargar los datos de tendencias." })
  }

  // ---------- Desempeño de productos ----------
  const publicados = (productos ?? []).filter((p) => p.estado === "publicado")

  interface Acumulado {
    actualVistas: number
    actualClics: number
    previoVistas: number
    previoClics: number
  }
  const acumPorProducto = new Map<string, Acumulado>()
  for (const p of publicados) {
    acumPorProducto.set(p.id, { actualVistas: 0, actualClics: 0, previoVistas: 0, previoClics: 0 })
  }

  const serieDiariaMap = new Map<string, { vistas: number; clics: number }>()
  const origenMap = new Map<string, { vistas: number; clics: number }>()

  for (const ev of eventos ?? []) {
    const t = new Date(ev.creado_en).getTime()
    const acc = acumPorProducto.get(ev.producto_id)
    if (acc) {
      const enActual = t >= inicioActual.getTime()
      const enPrevio = !enActual && t >= inicioPrevio.getTime()
      if (ev.tipo === "vista") {
        if (enActual) acc.actualVistas++
        else if (enPrevio) acc.previoVistas++
      } else if (ev.tipo === "clic_tienda") {
        if (enActual) acc.actualClics++
        else if (enPrevio) acc.previoClics++
      }
    }

    const dia = ev.creado_en.slice(0, 10)
    const fila = serieDiariaMap.get(dia) ?? { vistas: 0, clics: 0 }
    if (ev.tipo === "vista") fila.vistas++
    else fila.clics++
    serieDiariaMap.set(dia, fila)

    const origen = origenDeReferer(ev.referer)
    const filaOrigen = origenMap.get(origen) ?? { vistas: 0, clics: 0 }
    if (ev.tipo === "vista") filaOrigen.vistas++
    else filaOrigen.clics++
    origenMap.set(origen, filaOrigen)
  }

  const k = dias === 1 ? 8 : 4
  const productosCalc = publicados.map((p) => {
    const acc = acumPorProducto.get(p.id)!
    const gc = (acc.actualVistas + k) / (acc.previoVistas + k) - 1
    const gt = (acc.actualClics + k / 2) / (acc.previoClics + k / 2) - 1
    const tendencia = (gc + gt) / 2
    const estadoTendencia = tendencia > 0.12 ? "up" : tendencia < -0.12 ? "down" : "flat"
    return {
      id: p.id,
      nombre: p.nombre,
      categoria: normalizarCategoria(p.categoria),
      especie: p.especie,
      pymeNombre: p.pyme_nombre,
      pymeEmail: p.pyme_email,
      clics: acc.actualVistas,
      tienda: acc.actualClics,
      clicsPrev: acc.previoVistas,
      tiendaPrev: acc.previoClics,
      pasoTienda: acc.actualVistas ? acc.actualClics / acc.actualVistas : 0,
      tendencia,
      estadoTendencia: estadoTendencia as "up" | "down" | "flat",
    }
  })

  const totales = productosCalc.reduce(
    (a, p) => ({
      clics: a.clics + p.clics,
      tienda: a.tienda + p.tienda,
      clicsPrev: a.clicsPrev + p.clicsPrev,
      tiendaPrev: a.tiendaPrev + p.tiendaPrev,
    }),
    { clics: 0, tienda: 0, clicsPrev: 0, tiendaPrev: 0 }
  )
  const pasoTienda = totales.clics ? totales.tienda / totales.clics : 0
  const pasoTiendaPrev = totales.clicsPrev ? totales.tiendaPrev / totales.clicsPrev : 0

  const trending = [...productosCalc]
    .filter((p) => p.tendencia > 0)
    .sort((a, b) => b.tendencia - a.tendencia)
    .slice(0, 5)

  const pymesMap = new Map<string, typeof productosCalc>()
  for (const p of productosCalc) {
    const lista = pymesMap.get(p.pymeEmail) ?? []
    lista.push(p)
    pymesMap.set(p.pymeEmail, lista)
  }
  const pymes = [...pymesMap.entries()]
    .map(([email, lista]) => {
      const clics = lista.reduce((a, p) => a + p.clics, 0)
      const tienda = lista.reduce((a, p) => a + p.tienda, 0)
      const star = [...lista].sort((a, b) => b.tienda - a.tienda || b.clics - a.clics)[0] ?? null
      return {
        nombre: lista[0].pymeNombre,
        email,
        nProductos: lista.length,
        clics,
        tienda,
        share: totales.tienda ? tienda / totales.tienda : 0,
        productoEstrella: star
          ? { nombre: star.nombre, tienda: star.tienda, tendencia: star.tendencia, estadoTendencia: star.estadoTendencia }
          : null,
        starShare: tienda && star ? star.tienda / tienda : 0,
      }
    })
    .sort((a, b) => b.tienda - a.tienda)

  // Agrupación por categoría (los productos sin categoría asignada quedan juntos en "sin_categoria").
  const categoriasMap = new Map<string, typeof productosCalc>()
  for (const p of productosCalc) {
    const clave: string = p.categoria ?? "sin_categoria"
    const lista = categoriasMap.get(clave) ?? []
    lista.push(p)
    categoriasMap.set(clave, lista)
  }
  const categorias = [...categoriasMap.entries()]
    .map(([id, lista]) => {
      const clics = lista.reduce((a, p) => a + p.clics, 0)
      const tienda = lista.reduce((a, p) => a + p.tienda, 0)
      const clicsPrev = lista.reduce((a, p) => a + p.clicsPrev, 0)
      const tiendaPrev = lista.reduce((a, p) => a + p.tiendaPrev, 0)
      const tendencia = ((clics + k) / (clicsPrev + k) - 1 + ((tienda + k / 2) / (tiendaPrev + k / 2) - 1)) / 2
      const estadoTendencia = tendencia > 0.12 ? "up" : tendencia < -0.12 ? "down" : "flat"
      const star = [...lista].sort((a, b) => b.tienda - a.tienda || b.clics - a.clics)[0] ?? null
      return {
        id,
        nProductos: lista.length,
        clics,
        tienda,
        share: totales.tienda ? tienda / totales.tienda : 0,
        pasoTienda: clics ? tienda / clics : 0,
        tendencia,
        estadoTendencia: estadoTendencia as "up" | "down" | "flat",
        productoEstrella: star ? star.nombre : null,
      }
    })
    .sort((a, b) => b.tienda - a.tienda || b.clics - a.clics)

  // Serie diaria: últimos 14 días para "diario", 12 semanas para "semanal", 6 bloques de 30 días para "mensual".
  const serieDiaria: { dia: string; vistas: number; clics: number }[] = []
  let serieSub = ""
  if (periodo === "diario") {
    for (let i = 13; i >= 0; i--) {
      const d = new Date(ahora.getTime() - i * MS_DIA)
      const fila = serieDiariaMap.get(d.toISOString().slice(0, 10)) ?? { vistas: 0, clics: 0 }
      serieDiaria.push({ dia: fechaCorta(d), ...fila })
    }
    serieSub = "Últimos 14 días"
  } else {
    const largo = periodo === "semanal" ? 7 : 30
    const bloques = periodo === "semanal" ? 12 : 6
    for (let b = bloques - 1; b >= 0; b--) {
      const fin = new Date(ahora.getTime() - b * largo * MS_DIA)
      const inicio = new Date(fin.getTime() - largo * MS_DIA)
      let vistas = 0,
        clics = 0
      for (const [diaStr, fila] of serieDiariaMap) {
        const t = new Date(diaStr).getTime()
        if (t >= inicio.getTime() && t < fin.getTime()) {
          vistas += fila.vistas
          clics += fila.clics
        }
      }
      serieDiaria.push({ dia: fechaCorta(inicio), vistas, clics })
    }
    serieSub = periodo === "semanal" ? "Últimas 12 semanas" : "Últimos 6 meses (bloques de 30 días)"
  }

  const rangoTexto =
    periodo === "diario"
      ? `${ETIQUETA_PERIODO.diario.label} · ${fechaCorta(ahora)}`
      : `${ETIQUETA_PERIODO[periodo].label} · ${fechaCorta(inicioActual)} al ${fechaCorta(ahora)}`

  // ---------- Indicadores de plataforma ----------
  const totalUsuarios = (profiles ?? []).length
  const nuevosUsuarios = (profiles ?? []).filter((p) => new Date(p.created_at).getTime() >= inicioActual.getTime()).length
  const nuevosUsuariosPrev = (profiles ?? []).filter((p) => {
    const t = new Date(p.created_at).getTime()
    return t >= inicioPrevio.getTime() && t < inicioActual.getTime()
  }).length

  const totalMascotas = (pets ?? []).length
  const nuevasMascotas = (pets ?? []).filter((p) => new Date(p.created_at).getTime() >= inicioActual.getTime()).length
  const nuevasMascotasPrev = (pets ?? []).filter((p) => {
    const t = new Date(p.created_at).getTime()
    return t >= inicioPrevio.getTime() && t < inicioActual.getTime()
  }).length
  const perros = (pets ?? []).filter((p) => p.species === "perro").length
  const gatos = (pets ?? []).filter((p) => p.species === "gato").length
  const cachorros = (pets ?? []).filter((p) => p.age_years != null && p.age_years < 1).length
  const seniors = (pets ?? []).filter((p) => p.age_years != null && p.age_years >= 8).length
  const adultos = totalMascotas - cachorros - seniors

  const duenosUnicos = new Set((pets ?? []).map((p) => p.owner_id)).size
  const activacion = totalUsuarios ? duenosUnicos / totalUsuarios : 0

  const crecimientoUsuarios: { etiqueta: string; nuevos: number; acumulado: number }[] = []
  const acumuladoHasta = (t: number) => (profiles ?? []).filter((p) => new Date(p.created_at).getTime() < t).length
  if (periodo === "diario") {
    for (let i = 13; i >= 0; i--) {
      const dInicio = new Date(ahora.getTime() - (i + 1) * MS_DIA)
      const dFin = new Date(ahora.getTime() - i * MS_DIA)
      const nuevos = (profiles ?? []).filter((p) => {
        const t = new Date(p.created_at).getTime()
        return t >= dInicio.getTime() && t < dFin.getTime()
      }).length
      crecimientoUsuarios.push({ etiqueta: fechaCorta(dFin), nuevos, acumulado: acumuladoHasta(dFin.getTime()) })
    }
  } else {
    const largo = periodo === "semanal" ? 7 : 30
    const bloques = periodo === "semanal" ? 12 : 6
    for (let b = bloques - 1; b >= 0; b--) {
      const fin = new Date(ahora.getTime() - b * largo * MS_DIA)
      const inicio = new Date(fin.getTime() - largo * MS_DIA)
      const nuevos = (profiles ?? []).filter((p) => {
        const t = new Date(p.created_at).getTime()
        return t >= inicio.getTime() && t < fin.getTime()
      }).length
      crecimientoUsuarios.push({ etiqueta: fechaCorta(inicio), nuevos, acumulado: acumuladoHasta(fin.getTime()) })
    }
  }

  const veterinarias = {
    aprobadas: (vets ?? []).filter((v) => v.status === "approved").length,
    pendientes: (vets ?? []).filter((v) => v.status === "pending").length,
    rechazadas: (vets ?? []).filter((v) => v.status === "rejected").length,
    h24: (vets ?? []).filter((v) => v.is_24h).length,
  }
  const especialistas = {
    aprobados: (specialists ?? []).filter((s) => s.status === "approved").length,
    pendientes: (specialists ?? []).filter((s) => s.status === "pending").length,
    rechazados: (specialists ?? []).filter((s) => s.status === "rejected").length,
  }

  const servicioConteo = new Map<string, number>()
  for (const v of [...(vets ?? []), ...(specialists ?? [])]) {
    for (const s of v.services ?? []) {
      servicioConteo.set(s, (servicioConteo.get(s) ?? 0) + 1)
    }
  }
  const servicios = [...servicioConteo.entries()]
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 8)

  const todosLosProductos = productos ?? []
  const ahoraMs = ahora.getTime()
  const enviadas = todosLosProductos.length
  const publicadasCount = todosLosProductos.filter((p) => p.estado === "publicado").length
  const rechazadasCount = todosLosProductos.filter((p) => p.estado === "rechazado").length
  const pendientesVigentes = todosLosProductos.filter(
    (p) => p.estado === "pendiente" && new Date(p.token_expira).getTime() >= ahoraMs
  ).length
  const vencidas = todosLosProductos.filter(
    (p) => p.estado === "pendiente" && new Date(p.token_expira).getTime() < ahoraMs
  ).length
  const respondidas = todosLosProductos.filter((p) => p.estado !== "pendiente")
  const diasRespuestaProm = respondidas.length
    ? respondidas.reduce((a, p) => a + (new Date(p.actualizado_en).getTime() - new Date(p.creado_en).getTime()), 0) /
      respondidas.length /
      MS_DIA
    : null

  const origenVisitas = [...origenMap.entries()]
    .map(([origen, v]) => ({ origen, vistas: v.vistas, clics: v.clics }))
    .sort((a, b) => b.vistas - a.vistas)

  const temasNuevos = (threads ?? []).filter((t) => new Date(t.created_at).getTime() >= inicioActual.getTime()).length
  const respuestas = (posts ?? []).filter((p) => new Date(p.created_at).getTime() >= inicioActual.getTime()).length
  const hilosConPost = new Set((posts ?? []).map((p) => p.thread_id))
  const temasSinRespuesta = (threads ?? []).filter((t) => !hilosConPost.has(t.id)).length
  const reportesPendientes = (reports ?? []).filter((r) => !r.resolved).length

  return res.status(200).json({
    resumen: {
      periodo,
      rangoTexto,
      totales,
      pasoTienda,
      pasoTiendaPrev,
      productos: productosCalc,
      pymes,
      categorias,
      trending,
      serieDiaria,
      serieSub,
    },
    plataforma: {
      usuarios: { total: totalUsuarios, nuevos: nuevosUsuarios, nuevosPrev: nuevosUsuariosPrev },
      mascotas: {
        total: totalMascotas,
        nuevas: nuevasMascotas,
        nuevasPrev: nuevasMascotasPrev,
        perros,
        gatos,
        cachorros,
        adultos,
        seniors,
      },
      activacion,
      crecimientoUsuarios,
      veterinarias,
      especialistas,
      servicios,
      propuestas: {
        enviadas,
        publicadas: publicadasCount,
        pendientes: pendientesVigentes,
        rechazadas: rechazadasCount,
        vencidas,
        diasRespuestaProm,
      },
      origenVisitas,
      comunidad: { temasNuevos, respuestas, temasSinRespuesta, reportesPendientes },
    },
  })
}
