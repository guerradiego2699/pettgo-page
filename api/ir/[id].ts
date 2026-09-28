import type { VercelRequest, VercelResponse } from "@vercel/node"
import { supabaseAdmin } from "../_lib/supabaseAdmin.js"
import { hashVisitante, esBot } from "../_lib/hash.js"

function obtenerIp(req: VercelRequest): string {
  const forwarded = req.headers["x-forwarded-for"]
  const primero = Array.isArray(forwarded) ? forwarded[0] : forwarded
  return primero?.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? "desconocida"
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).send("Método no permitido.")
  }

  const id = typeof req.query.id === "string" ? req.query.id : null
  if (!id) {
    return res.status(400).send("Falta el identificador del producto.")
  }

  const { data: producto, error } = await supabaseAdmin
    .from("productos_pyme")
    .select("id, link_tienda, estado")
    .eq("id", id)
    .single()

  if (error || !producto || producto.estado !== "publicado") {
    return res.status(404).send("Producto no encontrado.")
  }

  const userAgent = (req.headers["user-agent"] as string) ?? ""
  if (!esBot(userAgent)) {
    await supabaseAdmin.from("eventos_producto").insert({
      producto_id: producto.id,
      tipo: "clic_tienda",
      visitante_hash: hashVisitante(obtenerIp(req), userAgent),
      referer: (req.headers.referer as string) ?? null,
    })
  }

  let destino: URL
  try {
    destino = new URL(producto.link_tienda)
  } catch {
    return res.status(500).send("El link de este producto no es válido.")
  }

  if (!destino.searchParams.has("utm_source")) destino.searchParams.set("utm_source", "pettgo")
  if (!destino.searchParams.has("utm_medium")) destino.searchParams.set("utm_medium", "referral")
  if (!destino.searchParams.has("utm_campaign")) destino.searchParams.set("utm_campaign", "productos")

  res.writeHead(302, { Location: destino.toString() })
  res.end()
}
