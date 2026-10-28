import type { VercelRequest, VercelResponse } from "@vercel/node"
import { requireAdmin } from "../../_lib/auth.js"
import { esEmailValido, textoValido } from "../../_lib/validation.js"
import { enviarInformeTendencias } from "../../_lib/resend.js"

const MAX_PDF_BASE64 = 8_000_000 // ~6 MB de PDF, de sobra para este informe

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido." })
  }

  const auth = await requireAdmin(req)
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error })

  const { destinatario, periodoLabel, rangoTexto, pdfBase64 } = req.body ?? {}

  if (!esEmailValido(destinatario)) {
    return res.status(400).json({ error: "El correo de destino no es válido." })
  }
  if (!textoValido(periodoLabel, { maxLength: 60, requerido: true })) {
    return res.status(400).json({ error: "Falta el período del informe." })
  }
  if (!textoValido(rangoTexto, { maxLength: 120, requerido: true })) {
    return res.status(400).json({ error: "Falta el rango del informe." })
  }
  if (typeof pdfBase64 !== "string" || pdfBase64.length === 0) {
    return res.status(400).json({ error: "Falta el PDF a enviar." })
  }
  if (pdfBase64.length > MAX_PDF_BASE64) {
    return res.status(413).json({ error: "El informe es demasiado grande para enviarlo por correo." })
  }

  try {
    await enviarInformeTendencias({ destinatario, periodoLabel, rangoTexto, pdfBase64 })
    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error("Error al enviar el informe de tendencias:", error)
    return res.status(500).json({ error: "No se pudo enviar el informe por correo." })
  }
}
