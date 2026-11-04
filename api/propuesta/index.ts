import type { VercelRequest, VercelResponse } from "@vercel/node"
import { supabaseAdmin } from "../_lib/supabaseAdmin.js"
import { UUID } from "../_lib/stock.js"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método no permitido." })
  }

  // Consulta de stock: el enlace del correo abre una página que primero lee esto (solo lectura).
  const stock = typeof req.query.stock === "string" ? req.query.stock : null
  if (stock) {
    if (!UUID.test(stock)) return res.status(404).json({ error: "Este enlace no es válido." })

    const { data: p } = await supabaseAdmin
      .from("productos_pyme")
      .select("nombre, imagen_url, pyme_nombre, estado, stock_estado, stock_token_usado, stock_token_expira")
      .eq("stock_token", stock)
      .maybeSingle()

    if (!p) return res.status(404).json({ error: "Este enlace no es válido." })
    const respondida = p.stock_token_usado
    if (!respondida && new Date(p.stock_token_expira).getTime() < Date.now()) {
      return res.status(410).json({ error: "Este enlace venció. Escríbenos y te enviamos uno nuevo." })
    }
    return res.status(200).json({
      nombre: p.nombre,
      imagen_url: p.imagen_url,
      pyme_nombre: p.pyme_nombre,
      // Si ya no está publicado (por ejemplo, ya fue archivado) no hay nada que confirmar.
      vigente: p.estado === "publicado" && !respondida,
      respondida,
      respuesta: respondida ? p.stock_estado : null,
    })
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
