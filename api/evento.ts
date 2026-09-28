import type { VercelRequest, VercelResponse } from "@vercel/node"
import { supabaseAdmin } from "./_lib/supabaseAdmin"
import { hashVisitante, esBot } from "./_lib/hash"

function obtenerIp(req: VercelRequest): string {
  const forwarded = req.headers["x-forwarded-for"]
  const primero = Array.isArray(forwarded) ? forwarded[0] : forwarded
  return primero?.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? "desconocida"
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido." })
  }

  const { producto_id: productoId } = req.body ?? {}
  if (typeof productoId !== "string") {
    return res.status(400).json({ error: "Falta producto_id." })
  }

  const userAgent = (req.headers["user-agent"] as string) ?? ""
  if (esBot(userAgent)) {
    return res.status(204).end()
  }

  const visitanteHash = hashVisitante(obtenerIp(req), userAgent)
  const inicioDia = new Date()
  inicioDia.setUTCHours(0, 0, 0, 0)

  const { data: existente } = await supabaseAdmin
    .from("eventos_producto")
    .select("id")
    .eq("producto_id", productoId)
    .eq("tipo", "vista")
    .eq("visitante_hash", visitanteHash)
    .gte("creado_en", inicioDia.toISOString())
    .limit(1)
    .maybeSingle()

  if (!existente) {
    await supabaseAdmin.from("eventos_producto").insert({
      producto_id: productoId,
      tipo: "vista",
      visitante_hash: visitanteHash,
      referer: (req.headers.referer as string) ?? null,
    })
  }

  return res.status(204).end()
}
