import type { VercelRequest, VercelResponse } from "@vercel/node"
import { supabaseAdmin } from "../../_lib/supabaseAdmin.js"
import { requireAdmin } from "../../_lib/auth.js"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método no permitido." })
  }

  const auth = await requireAdmin(req)
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error })

  const { data, error } = await supabaseAdmin
    .from("proyecto_auditoria")
    .select("*")
    .order("creado_en", { ascending: false })
    .limit(150)

  if (error) {
    console.error("Error al listar auditoría:", error)
    return res.status(500).json({ error: "No se pudo cargar la auditoría." })
  }

  return res.status(200).json(data ?? [])
}
