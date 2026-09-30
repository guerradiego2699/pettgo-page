import type { VercelRequest, VercelResponse } from "@vercel/node"
import { supabaseAdmin } from "../../../_lib/supabaseAdmin.js"
import { requireAdmin } from "../../../_lib/auth.js"
import { textoValido } from "../../../_lib/validation.js"
import {
  actividadTextoValida,
  areaValida,
  estadoActividadValido,
  fechaValida,
  listaCodigosValida,
  porcentajeValido,
  prioridadValida,
  riesgoValido,
} from "../../../_lib/proyectoValidacion.js"

const CAMPOS_SENSIBLES = ["actividad", "responsable", "fecha_inicio", "fecha_limite", "prioridad", "dependencias"] as const

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error })

  const codigo = typeof req.query.codigo === "string" ? req.query.codigo : null
  if (!codigo) return res.status(400).json({ error: "Falta el código de la actividad." })

  if (req.method === "DELETE") {
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

  if (req.method === "PATCH") {
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

    if (Object.keys(actualizacion).length === 0) {
      return res.status(400).json({ error: "No hay cambios para aplicar." })
    }

    const sensiblesTocados = camposTocadosSensibles.filter((c) => (CAMPOS_SENSIBLES as readonly string[]).includes(c))
    const aprobadoPor = typeof body.aprobado_por === "string" ? body.aprobado_por.trim() : ""
    if (sensiblesTocados.length > 0 && !(body.confirmar_cambio_sensible === true && aprobadoPor)) {
      return res.status(409).json({
        error: "Requiere aprobación.",
        accion: `Editar ${codigo}`,
        camposSensibles: sensiblesTocados,
      })
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

  return res.status(405).json({ error: "Método no permitido." })
}
