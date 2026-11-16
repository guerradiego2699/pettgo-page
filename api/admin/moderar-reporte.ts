import { createHash, createHmac } from "node:crypto"
import type { VercelRequest, VercelResponse } from "@vercel/node"
import { requireAdmin } from "../_lib/auth.js"
import { supabaseAdmin } from "../_lib/supabaseAdmin.js"

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store")
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST")
    return res.status(405).json({ error: "Método no permitido." })
  }
  const admin = await requireAdmin(req)
  if (!admin.ok) return res.status(admin.status).json({ error: admin.error })

  const { reportId } = req.body ?? {}
  if (typeof reportId !== "string" || !uuid.test(reportId)) {
    return res.status(400).json({ error: "Reporte inválido." })
  }
  const { data: report, error: reportError } = await supabaseAdmin.from("reports")
    .select("post_id, thread_id").eq("id", reportId).eq("resolved", false).maybeSingle()
  if (reportError) return res.status(503).json({ error: "No se pudo consultar el reporte." })
  const contentId = report?.post_id ?? report?.thread_id
  if (!contentId) return res.status(404).json({ error: "No hay contenido pendiente en este reporte." })

  async function readContent() {
    if (report?.post_id) {
      const { data, error } = await supabaseAdmin.from("forum_posts").select("body").eq("id", contentId).maybeSingle()
      return { text: data?.body, error }
    }
    const { data, error } = await supabaseAdmin.from("forum_threads").select("title, body").eq("id", contentId).maybeSingle()
    return { text: data ? `${data.title} — ${data.body}` : undefined, error }
  }

  const { text, error: contentError } = await readContent()
  if (contentError) return res.status(503).json({ error: "No se pudo consultar el contenido reportado." })
  if (text === undefined) return res.status(404).json({ error: "El contenido reportado ya no está disponible." })
  if (!text.trim() || text.length > 4000) {
    return res.status(422).json({ error: "El texto requiere revisión manual por su longitud." })
  }
  const secret = process.env.MODERATION_WEBHOOK_SECRET
  if (!secret || secret.length < 32) return res.status(503).json({ error: "Falta configurar el moderador." })

  const revision = createHash("sha256").update(text).digest("hex")
  const body = JSON.stringify({ id: contentId, revision, comentario: text })
  const timestamp = String(Math.floor(Date.now() / 1000))
  const signature = createHmac("sha256", secret).update(`${timestamp}.`).update(body).digest("hex")
  try {
    const response = await fetch("https://pettgo-moderacion.vercel.app/api/webhook", {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(23_000),
      headers: {
        "Content-Type": "application/json",
        "X-PettGo-Timestamp": timestamp,
        "X-PettGo-Signature": signature,
      },
      body,
    })
    if (!response.ok) throw new Error("Webhook no disponible")
    const result = await response.json()
    if (
      typeof result !== "object" || result === null ||
      !("estado" in result) || result.estado !== "evaluado" ||
      !("id" in result) || result.id !== contentId ||
      !("revision" in result) || result.revision !== revision ||
      !("recomendacion" in result) ||
      (result.recomendacion !== "permitir" && result.recomendacion !== "revisar" && result.recomendacion !== "rechazar") ||
      !("confianza" in result) ||
      (result.confianza !== "baja" && result.confianza !== "media" && result.confianza !== "alta") ||
      !("categorias" in result) || !Array.isArray(result.categorias) ||
      !result.categorias.every((category: unknown) => typeof category === "string") ||
      !("razones" in result) || !Array.isArray(result.razones) ||
      !result.razones.every((reason: unknown) => typeof reason === "string")
    ) {
      throw new Error("Respuesta inválida del webhook")
    }
    const { text: current, error } = await readContent()
    if (error) throw error
    if (current !== text) return res.status(409).json({ error: "El contenido cambió. Actualiza el reporte." })
    return res.status(200).json({
      body: text,
      recomendacion: result.recomendacion,
      confianza: result.confianza,
      categorias: result.categorias,
      razones: result.razones,
    })
  } catch {
    return res.status(503).json({ error: "No se pudo evaluar el contenido." })
  }
}
