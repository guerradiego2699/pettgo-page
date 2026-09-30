import type { VercelRequest, VercelResponse } from "@vercel/node"
import { supabaseAdmin } from "../../../_lib/supabaseAdmin.js"
import { requireAdmin } from "../../../_lib/auth.js"
import { textoValido } from "../../../_lib/validation.js"

// Decide (aprobar/rechazar) una propuesta. La propia interfaz avisa que, si
// se aprueba, los cambios de fecha hay que aplicarlos editando la actividad
// a mano — esta acción solo registra la decisión, nunca mueve fechas sola.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido." })
  }

  const auth = await requireAdmin(req)
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error })

  const id = typeof req.query.id === "string" ? req.query.id : null
  if (!id) return res.status(400).json({ error: "Falta el identificador de la propuesta." })

  const { aprobado, responsable, comentario } = req.body ?? {}
  if (typeof aprobado !== "boolean") return res.status(400).json({ error: "Falta indicar si se aprueba o rechaza." })
  if (!textoValido(responsable, { maxLength: 120, requerido: true })) {
    return res.status(400).json({ error: "Falta el nombre de quien decide." })
  }
  if (!textoValido(comentario, { maxLength: 500 })) {
    return res.status(400).json({ error: "El comentario es demasiado largo." })
  }

  const { data: propuesta, error: errorBusqueda } = await supabaseAdmin.from("proyecto_propuestas").select("*").eq("id", id).single()
  if (errorBusqueda || !propuesta) return res.status(404).json({ error: "No se encontró la propuesta." })
  if (propuesta.estado !== "PENDIENTE DE APROBACIÓN") {
    return res.status(409).json({ error: "Esta propuesta ya fue decidida." })
  }

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
