import type { VercelRequest, VercelResponse } from "@vercel/node"
import { supabaseAdmin } from "../../_lib/supabaseAdmin.js"
import { requireAdmin } from "../../_lib/auth.js"
import { textoValido } from "../../_lib/validation.js"
import { AGENTES_AREA } from "../../../src/types/proyecto.js"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error })

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
    if (!(AGENTES_AREA as readonly string[]).includes(body.agente)) {
      return res.status(400).json({ error: "El agente de área no es válido." })
    }
    if (!textoValido(body.actividad, { maxLength: 200, requerido: true })) {
      return res.status(400).json({ error: "Falta describir la actividad." })
    }
    if (body.avance != null && (typeof body.avance !== "number" || body.avance < 0 || body.avance > 100)) {
      return res.status(400).json({ error: "El avance debe ser un número entre 0 y 100." })
    }
    if (!textoValido(body.mensaje, { maxLength: 500, requerido: true })) {
      return res.status(400).json({ error: "Falta el mensaje." })
    }

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
