import type { VercelRequest, VercelResponse } from "@vercel/node"
import { supabaseAdmin } from "../../../_lib/supabaseAdmin.js"
import { requireAdmin } from "../../../_lib/auth.js"
import { textoValido } from "../../../_lib/validation.js"
import { estadoHitoValido, fechaValida, listaCodigosValida } from "../../../_lib/proyectoValidacion.js"

const CAMPOS_SENSIBLES = ["nombre", "fecha", "estado_declarado", "actividades_requeridas"] as const

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error })

  const codigo = typeof req.query.codigo === "string" ? req.query.codigo : null
  if (!codigo) return res.status(400).json({ error: "Falta el código del hito." })

  if (req.method === "DELETE") {
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

  if (req.method === "PATCH") {
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

    if (Object.keys(actualizacion).length === 0) {
      return res.status(400).json({ error: "No hay cambios para aplicar." })
    }

    const sensiblesTocados = camposTocados.filter((c) => (CAMPOS_SENSIBLES as readonly string[]).includes(c))
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

  return res.status(405).json({ error: "Método no permitido." })
}
