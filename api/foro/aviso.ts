import { timingSafeEqual } from "node:crypto"
import type { VercelRequest, VercelResponse } from "@vercel/node"
import { avisarReporte, avisarTemaNuevo } from "../_lib/avisosForo.js"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function secretoValido(recibido: unknown): boolean {
  const esperado = process.env.FORO_WEBHOOK_SECRET
  if (!esperado || typeof recibido !== "string") return false
  const a = Buffer.from(recibido)
  const b = Buffer.from(esperado)
  return a.length === b.length && timingSafeEqual(a, b)
}

// Lo llaman los Database Webhooks de Supabase (no el navegador) cada vez que se inserta un
// tema en forum_threads o un reporte en reports. Manda un correo a seguridad@pettgo.cl.
// Del cuerpo del webhook solo se toma la tabla y el id: el resto se lee de la base.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido." })
  }
  if (!secretoValido(req.headers["x-webhook-secret"])) {
    return res.status(401).json({ error: "No autorizado." })
  }

  const body = req.body ?? {}
  const id = body?.record?.id
  if (body?.type !== "INSERT" || typeof id !== "string" || !UUID.test(id)) {
    return res.status(400).json({ error: "Evento no válido." })
  }

  try {
    let enviado = false
    if (body.table === "forum_threads") enviado = await avisarTemaNuevo(id)
    else if (body.table === "reports") enviado = await avisarReporte(id)
    else return res.status(400).json({ error: "Tabla no soportada." })

    return res.status(200).json({ ok: true, enviado })
  } catch (error) {
    // Un fallo de correo no debe afectar al foro: solo se registra.
    console.error("Error en /api/foro/aviso:", error)
    return res.status(500).json({ error: "No se pudo enviar el aviso." })
  }
}
