import type { VercelRequest, VercelResponse } from "@vercel/node"
import { supabaseAdmin } from "../_lib/supabaseAdmin.js"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método no permitido." })
  }

  const token = typeof req.query.token === "string" ? req.query.token : null
  if (!token) {
    return res.status(400).json({ error: "Falta el token." })
  }

  const { data: producto, error } = await supabaseAdmin
    .from("productos_pyme")
    .select(
      "id, nombre, descripcion, imagen_url, precio_ref, link_tienda, categoria, pyme_nombre, estado, token_usado, token_expira"
    )
    .eq("token", token)
    .single()

  if (error || !producto) {
    return res.status(404).json({ error: "Este enlace no es válido." })
  }
  if (producto.token_usado) {
    return res.status(410).json({ error: "Este enlace ya fue utilizado." })
  }
  if (new Date(producto.token_expira).getTime() < Date.now()) {
    return res.status(410).json({ error: "Este enlace venció. Escríbenos para generar uno nuevo." })
  }

  const { token_usado: _tokenUsado, token_expira: _tokenExpira, ...publico } = producto
  return res.status(200).json(publico)
}
