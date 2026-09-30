import type { VercelRequest, VercelResponse } from "@vercel/node"
import { supabaseAdmin } from "../_lib/supabaseAdmin.js"
import { requireAdmin } from "../_lib/auth.js"
import { calcularAnalisis } from "../_lib/proyectoCalculos.js"
import { textoValido } from "../_lib/validation.js"
import {
  actividadTextoValida,
  areaValida,
  codigoValido,
  estadoActividadValido,
  estadoHitoValido,
  fechaValida,
  listaCodigosValida,
  porcentajeValido,
  prioridadValida,
  riesgoValido,
} from "../_lib/proyectoValidacion.js"
import { AGENTES_AREA } from "../../src/types/proyecto.js"
import type { Actividad, Hito } from "../../src/types/proyecto.js"

// Todo el módulo de Gestión de Proyecto vive en un solo archivo (en vez de un
// endpoint por recurso) porque el plan Hobby de Vercel tope a 12 Funciones
// Serverless por deploy — con un archivo por ruta este módulo por sí solo
// sumaba 9 funciones y hacía fallar el deploy. El ruteo interno usa
// ?seccion= en vez de segmentos de carpeta ([codigo].ts) para no depender de
// convenciones de ruteo dinámico de Next.js que este proyecto (Vite SPA) no
// usa en ningún otro lado.
const CAMPOS_SENSIBLES_ACTIVIDAD = ["actividad", "responsable", "fecha_inicio", "fecha_limite", "prioridad", "dependencias"] as const
const CAMPOS_SENSIBLES_HITO = ["nombre", "fecha", "estado_declarado", "actividades_requeridas"] as const
const MS_DIA = 24 * 60 * 60 * 1000
const DESPLAZAMIENTO_POR_DEFECTO = 7

function sumarDias(iso: string | null, dias: number): string | null {
  if (!iso) return null
  const d = new Date(iso + "T00:00:00Z")
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

async function manejarAnalisis(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Método no permitido." })

  const [{ data: actividades, error: eAct }, { data: hitos, error: eHit }] = await Promise.all([
    supabaseAdmin.from("proyecto_actividades").select("*").order("codigo"),
    supabaseAdmin.from("proyecto_hitos").select("*").order("fecha"),
  ])

  if (eAct || eHit) {
    console.error("Error en /api/admin/proyecto:", eAct ?? eHit)
    return res.status(500).json({ error: "No se pudieron cargar los datos del proyecto." })
  }

  const analisis = calcularAnalisis((actividades ?? []) as Actividad[], (hitos ?? []) as Hito[])

  const registrar = typeof req.query.registrar === "string" ? req.query.registrar : null
  if (registrar === "analisis") {
    await supabaseAdmin.from("proyecto_auditoria").insert({
      tipo_analisis: "Análisis del proyecto",
      origen: "Dashboard",
      recomendacion: analisis.actividades_criticas[0] ? `Revisar ${analisis.actividades_criticas[0].codigo} primero.` : null,
    })
  } else if (registrar === "reporte") {
    await supabaseAdmin.from("proyecto_auditoria").insert({
      tipo_analisis: "Reporte generado",
      origen: "Pestaña de reporte",
    })
  }

  return res.status(200).json(analisis)
}

async function crearActividad(req: VercelRequest, res: VercelResponse) {
  const body = req.body ?? {}

  if (!codigoValido(body.codigo)) {
    return res.status(400).json({ error: "El código debe tener el formato ÁREA-NÚMERO, ej. PET-05." })
  }
  if (!areaValida(body.area)) return res.status(400).json({ error: "El área no es válida." })
  if (!actividadTextoValida(body.actividad)) return res.status(400).json({ error: "Falta el nombre de la actividad." })
  if (!textoValido(body.responsable, { maxLength: 120 })) return res.status(400).json({ error: "El responsable no es válido." })
  if (body.estado != null && !estadoActividadValido(body.estado)) return res.status(400).json({ error: "El estado no es válido." })
  if (body.fecha_inicio != null && !fechaValida(body.fecha_inicio)) return res.status(400).json({ error: "La fecha de inicio no es válida." })
  if (body.fecha_limite != null && !fechaValida(body.fecha_limite)) return res.status(400).json({ error: "La fecha límite no es válida." })
  if (body.avance_esperado != null && !porcentajeValido(body.avance_esperado)) {
    return res.status(400).json({ error: "El avance esperado debe ser un número entre 0 y 100." })
  }
  if (body.avance_real != null && !porcentajeValido(body.avance_real)) {
    return res.status(400).json({ error: "El avance real debe ser un número entre 0 y 100." })
  }
  if (body.prioridad != null && !prioridadValida(body.prioridad)) return res.status(400).json({ error: "La prioridad no es válida." })
  if (body.riesgo != null && !riesgoValido(body.riesgo)) return res.status(400).json({ error: "El riesgo no es válido." })
  if (body.dependencias != null && !listaCodigosValida(body.dependencias)) {
    return res.status(400).json({ error: "Las dependencias deben ser códigos válidos (ej. PET-03)." })
  }
  if (!textoValido(body.observaciones, { maxLength: 1000 })) return res.status(400).json({ error: "Las observaciones son demasiado largas." })

  const { data: creado, error } = await supabaseAdmin
    .from("proyecto_actividades")
    .insert({
      codigo: body.codigo,
      area: body.area,
      actividad: (body.actividad as string).trim(),
      responsable: body.responsable ? (body.responsable as string).trim() : null,
      estado: body.estado ?? "Pendiente",
      fecha_inicio: body.fecha_inicio ?? null,
      fecha_limite: body.fecha_limite ?? null,
      avance_esperado: body.avance_esperado ?? 0,
      avance_real: body.avance_real ?? 0,
      prioridad: body.prioridad ?? "Media",
      riesgo: body.riesgo ?? "Bajo",
      dependencias: body.dependencias ?? [],
      observaciones: body.observaciones ? (body.observaciones as string).trim() : null,
    })
    .select("*")
    .single()

  if (error || !creado) {
    if (error?.code === "23505") return res.status(409).json({ error: `Ya existe una actividad con el código ${body.codigo}.` })
    console.error("Error al crear actividad:", error)
    return res.status(500).json({ error: "No se pudo crear la actividad." })
  }

  await supabaseAdmin.from("proyecto_auditoria").insert({
    tipo_analisis: "Nueva actividad",
    origen: "Panel de actividades",
    actividad: creado.codigo,
  })

  return res.status(200).json(creado)
}

async function eliminarActividad(req: VercelRequest, res: VercelResponse, codigo: string) {
  const aprobadoPor = typeof req.query.aprobado_por === "string" ? req.query.aprobado_por : ""
  if (req.query.confirmar !== "true" || !aprobadoPor.trim()) {
    const { data: actividad } = await supabaseAdmin.from("proyecto_actividades").select("*").eq("codigo", codigo).single()
    const dependientes = actividad
      ? (await supabaseAdmin.from("proyecto_actividades").select("codigo, dependencias")).data?.filter((a) =>
          (a.dependencias as string[]).includes(codigo)
        ) ?? []
      : []
    return res.status(409).json({
      error: "Requiere aprobación.",
      accion: `Eliminar actividad ${codigo}`,
      dependientesDirectos: dependientes.map((d) => d.codigo),
    })
  }

  const { error } = await supabaseAdmin.from("proyecto_actividades").delete().eq("codigo", codigo)
  if (error) {
    console.error("Error al eliminar actividad:", error)
    return res.status(500).json({ error: "No se pudo eliminar la actividad." })
  }

  await supabaseAdmin.from("proyecto_auditoria").insert({
    tipo_analisis: "Eliminación de actividad",
    origen: `Aprobado por ${aprobadoPor.trim()}`,
    actividad: codigo,
  })
  return res.status(200).json({ ok: true })
}

async function editarActividad(req: VercelRequest, res: VercelResponse, codigo: string) {
  const body = req.body ?? {}
  const actualizacion: Record<string, unknown> = {}
  const camposTocadosSensibles: string[] = []

  if ("area" in body) {
    if (!areaValida(body.area)) return res.status(400).json({ error: "El área no es válida." })
    actualizacion.area = body.area
  }
  if ("actividad" in body) {
    if (!actividadTextoValida(body.actividad)) return res.status(400).json({ error: "Falta el nombre de la actividad." })
    actualizacion.actividad = (body.actividad as string).trim()
    camposTocadosSensibles.push("actividad")
  }
  if ("responsable" in body) {
    if (!textoValido(body.responsable, { maxLength: 120 })) return res.status(400).json({ error: "El responsable no es válido." })
    actualizacion.responsable = body.responsable ? (body.responsable as string).trim() : null
    camposTocadosSensibles.push("responsable")
  }
  if ("estado" in body) {
    if (!estadoActividadValido(body.estado)) return res.status(400).json({ error: "El estado no es válido." })
    actualizacion.estado = body.estado
  }
  if ("fecha_inicio" in body) {
    if (body.fecha_inicio != null && !fechaValida(body.fecha_inicio)) return res.status(400).json({ error: "La fecha de inicio no es válida." })
    actualizacion.fecha_inicio = body.fecha_inicio ?? null
    camposTocadosSensibles.push("fecha_inicio")
  }
  if ("fecha_limite" in body) {
    if (body.fecha_limite != null && !fechaValida(body.fecha_limite)) return res.status(400).json({ error: "La fecha límite no es válida." })
    actualizacion.fecha_limite = body.fecha_limite ?? null
    camposTocadosSensibles.push("fecha_limite")
  }
  if ("avance_esperado" in body) {
    if (!porcentajeValido(body.avance_esperado)) return res.status(400).json({ error: "El avance esperado no es válido." })
    actualizacion.avance_esperado = body.avance_esperado
  }
  if ("avance_real" in body) {
    if (!porcentajeValido(body.avance_real)) return res.status(400).json({ error: "El avance real no es válido." })
    actualizacion.avance_real = body.avance_real
  }
  if ("prioridad" in body) {
    if (!prioridadValida(body.prioridad)) return res.status(400).json({ error: "La prioridad no es válida." })
    actualizacion.prioridad = body.prioridad
    camposTocadosSensibles.push("prioridad")
  }
  if ("riesgo" in body) {
    if (!riesgoValido(body.riesgo)) return res.status(400).json({ error: "El riesgo no es válido." })
    actualizacion.riesgo = body.riesgo
  }
  if ("dependencias" in body) {
    if (!listaCodigosValida(body.dependencias)) return res.status(400).json({ error: "Las dependencias no son válidas." })
    actualizacion.dependencias = body.dependencias
    camposTocadosSensibles.push("dependencias")
  }
  if ("observaciones" in body) {
    if (!textoValido(body.observaciones, { maxLength: 1000 })) return res.status(400).json({ error: "Las observaciones son demasiado largas." })
    actualizacion.observaciones = body.observaciones ? (body.observaciones as string).trim() : null
  }

  if (Object.keys(actualizacion).length === 0) return res.status(400).json({ error: "No hay cambios para aplicar." })

  const sensiblesTocados = camposTocadosSensibles.filter((c) => (CAMPOS_SENSIBLES_ACTIVIDAD as readonly string[]).includes(c))
  const aprobadoPor = typeof body.aprobado_por === "string" ? body.aprobado_por.trim() : ""
  if (sensiblesTocados.length > 0 && !(body.confirmar_cambio_sensible === true && aprobadoPor)) {
    return res.status(409).json({ error: "Requiere aprobación.", accion: `Editar ${codigo}`, camposSensibles: sensiblesTocados })
  }

  const { data: actualizado, error } = await supabaseAdmin
    .from("proyecto_actividades")
    .update(actualizacion)
    .eq("codigo", codigo)
    .select("*")
    .single()

  if (error || !actualizado) {
    console.error("Error al actualizar actividad:", error)
    return res.status(500).json({ error: "No se pudo actualizar la actividad." })
  }

  await supabaseAdmin.from("proyecto_auditoria").insert({
    tipo_analisis: "Edición de actividad",
    origen: aprobadoPor ? `Aprobado por ${aprobadoPor}` : "Panel de actividades",
    actividad: codigo,
    recomendacion: sensiblesTocados.length ? `Cambios sensibles: ${sensiblesTocados.join(", ")}` : null,
  })

  return res.status(200).json(actualizado)
}

async function manejarActividades(req: VercelRequest, res: VercelResponse) {
  const codigo = typeof req.query.codigo === "string" ? req.query.codigo : null

  if (!codigo) {
    if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido." })
    return crearActividad(req, res)
  }
  if (req.method === "PATCH") return editarActividad(req, res, codigo)
  if (req.method === "DELETE") return eliminarActividad(req, res, codigo)
  return res.status(405).json({ error: "Método no permitido." })
}

async function crearHito(req: VercelRequest, res: VercelResponse) {
  const body = req.body ?? {}

  if (!codigoValido(body.codigo)) return res.status(400).json({ error: "El código debe tener el formato HITO-NÚMERO, ej. HITO-06." })
  if (!textoValido(body.nombre, { maxLength: 150, requerido: true })) return res.status(400).json({ error: "Falta el nombre del hito." })
  if (!fechaValida(body.fecha)) return res.status(400).json({ error: "La fecha del hito no es válida." })
  if (body.estado_declarado != null && !estadoHitoValido(body.estado_declarado)) return res.status(400).json({ error: "El estado no es válido." })
  if (body.actividades_requeridas != null && !listaCodigosValida(body.actividades_requeridas)) {
    return res.status(400).json({ error: "Las actividades requeridas no son válidas." })
  }
  if (!textoValido(body.descripcion, { maxLength: 500 })) return res.status(400).json({ error: "La descripción es demasiado larga." })

  const { data: creado, error } = await supabaseAdmin
    .from("proyecto_hitos")
    .insert({
      codigo: body.codigo,
      nombre: (body.nombre as string).trim(),
      fecha: body.fecha,
      estado_declarado: body.estado_declarado ?? "Pendiente",
      actividades_requeridas: body.actividades_requeridas ?? [],
      descripcion: body.descripcion ? (body.descripcion as string).trim() : null,
    })
    .select("*")
    .single()

  if (error || !creado) {
    if (error?.code === "23505") return res.status(409).json({ error: `Ya existe un hito con el código ${body.codigo}.` })
    console.error("Error al crear hito:", error)
    return res.status(500).json({ error: "No se pudo crear el hito." })
  }

  const { data: actividades } = await supabaseAdmin.from("proyecto_actividades").select("codigo")
  const existentes = new Set((actividades ?? []).map((a) => a.codigo))
  const inexistentes = (creado.actividades_requeridas as string[]).filter((c) => !existentes.has(c))

  await supabaseAdmin.from("proyecto_auditoria").insert({
    tipo_analisis: "Nuevo hito",
    origen: "Panel de dashboard",
    actividad: creado.codigo,
  })

  return res.status(200).json({ ...creado, actividades_inexistentes: inexistentes })
}

async function eliminarHito(req: VercelRequest, res: VercelResponse, codigo: string) {
  const aprobadoPor = typeof req.query.aprobado_por === "string" ? req.query.aprobado_por : ""
  if (req.query.confirmar !== "true" || !aprobadoPor.trim()) {
    return res.status(409).json({ error: "Requiere aprobación.", accion: `Eliminar hito ${codigo}` })
  }

  const { error } = await supabaseAdmin.from("proyecto_hitos").delete().eq("codigo", codigo)
  if (error) {
    console.error("Error al eliminar hito:", error)
    return res.status(500).json({ error: "No se pudo eliminar el hito." })
  }

  await supabaseAdmin.from("proyecto_auditoria").insert({
    tipo_analisis: "Eliminación de hito",
    origen: `Aprobado por ${aprobadoPor.trim()}`,
    actividad: codigo,
  })
  return res.status(200).json({ ok: true })
}

async function editarHito(req: VercelRequest, res: VercelResponse, codigo: string) {
  const body = req.body ?? {}
  const actualizacion: Record<string, unknown> = {}
  const camposTocados: string[] = []

  if ("nombre" in body) {
    if (!textoValido(body.nombre, { maxLength: 150, requerido: true })) return res.status(400).json({ error: "Falta el nombre del hito." })
    actualizacion.nombre = (body.nombre as string).trim()
    camposTocados.push("nombre")
  }
  if ("fecha" in body) {
    if (!fechaValida(body.fecha)) return res.status(400).json({ error: "La fecha no es válida." })
    actualizacion.fecha = body.fecha
    camposTocados.push("fecha")
  }
  if ("estado_declarado" in body) {
    if (!estadoHitoValido(body.estado_declarado)) return res.status(400).json({ error: "El estado no es válido." })
    actualizacion.estado_declarado = body.estado_declarado
    camposTocados.push("estado_declarado")
  }
  if ("actividades_requeridas" in body) {
    if (!listaCodigosValida(body.actividades_requeridas)) return res.status(400).json({ error: "Las actividades requeridas no son válidas." })
    actualizacion.actividades_requeridas = body.actividades_requeridas
    camposTocados.push("actividades_requeridas")
  }
  if ("descripcion" in body) {
    if (!textoValido(body.descripcion, { maxLength: 500 })) return res.status(400).json({ error: "La descripción es demasiado larga." })
    actualizacion.descripcion = body.descripcion ? (body.descripcion as string).trim() : null
  }

  if (Object.keys(actualizacion).length === 0) return res.status(400).json({ error: "No hay cambios para aplicar." })

  const sensiblesTocados = camposTocados.filter((c) => (CAMPOS_SENSIBLES_HITO as readonly string[]).includes(c))
  const aprobadoPor = typeof body.aprobado_por === "string" ? body.aprobado_por.trim() : ""
  if (sensiblesTocados.length > 0 && !(body.confirmar_cambio_sensible === true && aprobadoPor)) {
    return res.status(409).json({ error: "Requiere aprobación.", accion: `Editar ${codigo}`, camposSensibles: sensiblesTocados })
  }

  const { data: actualizado, error } = await supabaseAdmin.from("proyecto_hitos").update(actualizacion).eq("codigo", codigo).select("*").single()
  if (error || !actualizado) {
    console.error("Error al actualizar hito:", error)
    return res.status(500).json({ error: "No se pudo actualizar el hito." })
  }

  let inexistentes: string[] = []
  if ("actividades_requeridas" in body) {
    const { data: actividades } = await supabaseAdmin.from("proyecto_actividades").select("codigo")
    const existentes = new Set((actividades ?? []).map((a) => a.codigo))
    inexistentes = (actualizado.actividades_requeridas as string[]).filter((c) => !existentes.has(c))
  }

  await supabaseAdmin.from("proyecto_auditoria").insert({
    tipo_analisis: "Edición de hito",
    origen: aprobadoPor ? `Aprobado por ${aprobadoPor}` : "Panel de dashboard",
    actividad: codigo,
  })

  return res.status(200).json({ ...actualizado, actividades_inexistentes: inexistentes })
}

async function manejarHitos(req: VercelRequest, res: VercelResponse) {
  const codigo = typeof req.query.codigo === "string" ? req.query.codigo : null

  if (!codigo) {
    if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido." })
    return crearHito(req, res)
  }
  if (req.method === "PATCH") return editarHito(req, res, codigo)
  if (req.method === "DELETE") return eliminarHito(req, res, codigo)
  return res.status(405).json({ error: "Método no permitido." })
}

async function listarPropuestas(_req: VercelRequest, res: VercelResponse) {
  const { data, error } = await supabaseAdmin.from("proyecto_propuestas").select("*").order("creado_en", { ascending: false })
  if (error) {
    console.error("Error al listar propuestas:", error)
    return res.status(500).json({ error: "No se pudieron cargar las propuestas." })
  }
  return res.status(200).json(data ?? [])
}

async function crearPropuesta(req: VercelRequest, res: VercelResponse) {
  const body = req.body ?? {}
  const codigo = typeof body.actividad_codigo === "string" ? body.actividad_codigo : null
  if (!codigo) return res.status(400).json({ error: "Falta la actividad." })
  if (body.nueva_fecha_limite != null && !fechaValida(body.nueva_fecha_limite)) {
    return res.status(400).json({ error: "La nueva fecha no es válida." })
  }

  const { data: actividades, error } = await supabaseAdmin.from("proyecto_actividades").select("*")
  if (error) {
    console.error("Error al cargar actividades para la propuesta:", error)
    return res.status(500).json({ error: "No se pudieron cargar las actividades." })
  }
  const lista = (actividades ?? []) as Actividad[]
  const base = lista.find((a) => a.codigo === codigo)
  if (!base) return res.status(404).json({ error: "No se encontró la actividad." })

  const desplazamiento = body.nueva_fecha_limite
    ? Math.round(
        (new Date(body.nueva_fecha_limite + "T00:00:00Z").getTime() - new Date((base.fecha_limite ?? body.nueva_fecha_limite) + "T00:00:00Z").getTime()) /
          MS_DIA
      )
    : DESPLAZAMIENTO_POR_DEFECTO

  const porCodigo = new Map(lista.map((a) => [a.codigo, a]))
  const nivelPorCodigo = new Map<string, number>([[codigo, 0]])
  const cola = [codigo]
  const afectadas: string[] = []
  while (cola.length) {
    const actual = cola.shift()!
    const nivelActual = nivelPorCodigo.get(actual)!
    for (const a of lista) {
      if (a.dependencias.includes(actual) && !nivelPorCodigo.has(a.codigo)) {
        nivelPorCodigo.set(a.codigo, nivelActual + 1)
        afectadas.push(a.codigo)
        cola.push(a.codigo)
      }
    }
  }

  const cronograma = [codigo, ...afectadas].map((c) => {
    const a = porCodigo.get(c)!
    return {
      codigo: c,
      nivel_dependencia: nivelPorCodigo.get(c)!,
      fecha_inicio_actual: a.fecha_inicio,
      fecha_inicio_propuesta: sumarDias(a.fecha_inicio, desplazamiento),
      fecha_limite_actual: a.fecha_limite,
      fecha_limite_propuesta: sumarDias(a.fecha_limite, desplazamiento),
      desplazamiento_dias: desplazamiento,
    }
  })

  const texto = [
    `PROPUESTA DE REPROGRAMACIÓN — ${codigo} (${base.actividad})`,
    "",
    `Desplazamiento propuesto: ${desplazamiento > 0 ? "+" : ""}${desplazamiento} día(s).`,
    afectadas.length
      ? `Actividades que dependen de ${codigo}, directa o indirectamente: ${afectadas.join(", ")}.`
      : "Ninguna otra actividad depende de esta.",
    "",
    "Ninguna fecha fue modificada todavía — esto es solo una propuesta a decidir.",
  ].join("\n")

  const { data: creada, error: errorInsert } = await supabaseAdmin
    .from("proyecto_propuestas")
    .insert({ actividad_codigo: codigo, texto, cronograma_propuesto: cronograma })
    .select("*")
    .single()

  if (errorInsert || !creada) {
    console.error("Error al crear propuesta:", errorInsert)
    return res.status(500).json({ error: "No se pudo crear la propuesta." })
  }

  await supabaseAdmin.from("proyecto_auditoria").insert({
    tipo_analisis: "Propuesta de reprogramación",
    origen: "Pestaña de propuestas",
    actividad: codigo,
    recomendacion: `Desplazamiento sugerido: ${desplazamiento} día(s).`,
  })

  return res.status(200).json(creada)
}

// Decide (aprobar/rechazar) una propuesta. La propia interfaz avisa que, si
// se aprueba, los cambios de fecha hay que aplicarlos editando la actividad
// a mano — esta acción solo registra la decisión, nunca mueve fechas sola.
async function decidirPropuesta(req: VercelRequest, res: VercelResponse, id: string) {
  const { aprobado, responsable, comentario } = req.body ?? {}
  if (typeof aprobado !== "boolean") return res.status(400).json({ error: "Falta indicar si se aprueba o rechaza." })
  if (!textoValido(responsable, { maxLength: 120, requerido: true })) return res.status(400).json({ error: "Falta el nombre de quien decide." })
  if (!textoValido(comentario, { maxLength: 500 })) return res.status(400).json({ error: "El comentario es demasiado largo." })

  const { data: propuesta, error: errorBusqueda } = await supabaseAdmin.from("proyecto_propuestas").select("*").eq("id", id).single()
  if (errorBusqueda || !propuesta) return res.status(404).json({ error: "No se encontró la propuesta." })
  if (propuesta.estado !== "PENDIENTE DE APROBACIÓN") return res.status(409).json({ error: "Esta propuesta ya fue decidida." })

  const { data: actualizada, error } = await supabaseAdmin
    .from("proyecto_propuestas")
    .update({
      estado: aprobado ? "APROBADA" : "RECHAZADA",
      decidido_por: (responsable as string).trim(),
      comentario_decision: comentario ? (comentario as string).trim() : null,
      decidido_en: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single()

  if (error || !actualizada) {
    console.error("Error al decidir propuesta:", error)
    return res.status(500).json({ error: "No se pudo registrar la decisión." })
  }

  await supabaseAdmin.from("proyecto_auditoria").insert({
    tipo_analisis: aprobado ? "Propuesta aprobada" : "Propuesta rechazada",
    origen: `Decidido por ${(responsable as string).trim()}`,
    actividad: propuesta.actividad_codigo,
    recomendacion: aprobado ? "Recordar aplicar el cambio de fecha manualmente en la actividad." : null,
  })

  return res.status(200).json(actualizada)
}

async function manejarPropuestas(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === "string" ? req.query.id : null

  if (id) {
    if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido." })
    return decidirPropuesta(req, res, id)
  }
  if (req.method === "GET") return listarPropuestas(req, res)
  if (req.method === "POST") return crearPropuesta(req, res)
  return res.status(405).json({ error: "Método no permitido." })
}

async function manejarReportesArea(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    const [{ data: reportes, error: eRep }, { data: actividades, error: eAct }] = await Promise.all([
      supabaseAdmin.from("proyecto_reportes_area").select("*").order("creado_en", { ascending: false }),
      supabaseAdmin.from("proyecto_actividades").select("codigo, avance_real"),
    ])
    if (eRep || eAct) {
      console.error("Error al listar reportes de área:", eRep ?? eAct)
      return res.status(500).json({ error: "No se pudieron cargar los reportes." })
    }
    const avancePorCodigo = new Map((actividades ?? []).map((a) => [a.codigo, a.avance_real]))
    const enriquecidos = (reportes ?? []).map((r) => {
      const avanceRegistrado = r.actividad_codigo ? avancePorCodigo.get(r.actividad_codigo) ?? null : null
      const diferencia = r.avance != null && avanceRegistrado != null ? r.avance - avanceRegistrado : null
      return { ...r, avance_registrado: avanceRegistrado, diferencia }
    })
    const agentesConReporte = new Set(enriquecidos.map((r) => r.agente))
    const agentesSinReporte = AGENTES_AREA.filter((a) => !agentesConReporte.has(a))
    return res.status(200).json({ reportes: enriquecidos, agentes_sin_reporte: agentesSinReporte })
  }

  if (req.method === "POST") {
    const body = req.body ?? {}
    if (!(AGENTES_AREA as readonly string[]).includes(body.agente)) return res.status(400).json({ error: "El agente de área no es válido." })
    if (!textoValido(body.actividad, { maxLength: 200, requerido: true })) return res.status(400).json({ error: "Falta describir la actividad." })
    if (body.avance != null && (typeof body.avance !== "number" || body.avance < 0 || body.avance > 100)) {
      return res.status(400).json({ error: "El avance debe ser un número entre 0 y 100." })
    }
    if (!textoValido(body.mensaje, { maxLength: 500, requerido: true })) return res.status(400).json({ error: "Falta el mensaje." })

    const { data: creado, error } = await supabaseAdmin
      .from("proyecto_reportes_area")
      .insert({
        agente: body.agente,
        actividad: (body.actividad as string).trim(),
        actividad_codigo: body.actividad_codigo || null,
        avance: body.avance ?? null,
        riesgo: body.riesgo ?? null,
        mensaje: (body.mensaje as string).trim(),
      })
      .select("*")
      .single()

    if (error || !creado) {
      console.error("Error al crear reporte de área:", error)
      return res.status(500).json({ error: "No se pudo registrar el reporte." })
    }

    await supabaseAdmin.from("proyecto_auditoria").insert({
      tipo_analisis: "Reporte de área",
      origen: `Agente ${body.agente}`,
      actividad: body.actividad_codigo || null,
    })

    return res.status(200).json(creado)
  }

  return res.status(405).json({ error: "Método no permitido." })
}

async function manejarAuditoria(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Método no permitido." })

  const { data, error } = await supabaseAdmin.from("proyecto_auditoria").select("*").order("creado_en", { ascending: false }).limit(150)
  if (error) {
    console.error("Error al listar auditoría:", error)
    return res.status(500).json({ error: "No se pudo cargar la auditoría." })
  }

  return res.status(200).json(data ?? [])
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error })

  const seccion = typeof req.query.seccion === "string" ? req.query.seccion : null

  switch (seccion) {
    case null:
      return manejarAnalisis(req, res)
    case "actividades":
      return manejarActividades(req, res)
    case "hitos":
      return manejarHitos(req, res)
    case "propuestas":
      return manejarPropuestas(req, res)
    case "reportes-area":
      return manejarReportesArea(req, res)
    case "auditoria":
      return manejarAuditoria(req, res)
    default:
      return res.status(404).json({ error: "Sección no encontrada." })
  }
}
