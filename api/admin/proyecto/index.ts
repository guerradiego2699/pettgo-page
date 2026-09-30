import type { VercelRequest, VercelResponse } from "@vercel/node"
import { supabaseAdmin } from "../../_lib/supabaseAdmin.js"
import { requireAdmin } from "../../_lib/auth.js"
import { calcularAnalisis } from "../../_lib/proyectoCalculos.js"
import type { Actividad, Hito } from "../../../src/types/proyecto.js"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método no permitido." })
  }

  const auth = await requireAdmin(req)
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error })

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
