import { randomUUID } from "node:crypto"
import type { VercelRequest, VercelResponse } from "@vercel/node"
import { supabaseAdmin } from "../_lib/supabaseAdmin"
import { requireAdmin } from "../_lib/auth"
import { esUrlHttpsValida, esEmailValido, textoValido, precioValido } from "../_lib/validation"
import { enviarPropuesta } from "../_lib/resend"

const CATORCE_DIAS_MS = 14 * 24 * 60 * 60 * 1000

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido." })
  }

  const auth = await requireAdmin(req)
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error })

  const body = req.body ?? {}

  try {
    let producto

    if (body.id) {
      // Reenvío: mismo producto, token nuevo.
      const { data: actualizado, error } = await supabaseAdmin
        .from("productos_pyme")
        .update({
          token: randomUUID(),
          token_expira: new Date(Date.now() + CATORCE_DIAS_MS).toISOString(),
          token_usado: false,
        })
        .eq("id", body.id)
        .select("*")
        .single()

      if (error || !actualizado) {
        return res.status(404).json({ error: "No se encontró el producto a reenviar." })
      }
      producto = actualizado
    } else {
      if (!textoValido(body.nombre, { maxLength: 120, requerido: true })) {
        return res.status(400).json({ error: "El nombre del producto no es válido." })
      }
      if (!textoValido(body.descripcion, { maxLength: 1000 })) {
        return res.status(400).json({ error: "La descripción es demasiado larga." })
      }
      if (body.imagen_url && !esUrlHttpsValida(body.imagen_url)) {
        return res.status(400).json({ error: "La imagen debe ser una URL https válida." })
      }
      if (!esUrlHttpsValida(body.link_tienda)) {
        return res.status(400).json({ error: "El link de la tienda debe ser una URL https válida." })
      }
      if (body.precio_ref != null && !precioValido(body.precio_ref)) {
        return res.status(400).json({ error: "El precio de referencia no es válido." })
      }
      if (!textoValido(body.categoria, { maxLength: 60 })) {
        return res.status(400).json({ error: "La categoría no es válida." })
      }
      if (!textoValido(body.pyme_nombre, { maxLength: 120, requerido: true })) {
        return res.status(400).json({ error: "El nombre de la pyme no es válido." })
      }
      if (!esEmailValido(body.pyme_email)) {
        return res.status(400).json({ error: "El correo de la pyme no es válido." })
      }

      const { data: creado, error } = await supabaseAdmin
        .from("productos_pyme")
        .insert({
          nombre: (body.nombre as string).trim(),
          descripcion: body.descripcion ? (body.descripcion as string).trim() : null,
          imagen_url: body.imagen_url ? (body.imagen_url as string).trim() : null,
          precio_ref: body.precio_ref ?? null,
          link_tienda: (body.link_tienda as string).trim(),
          categoria: body.categoria ? (body.categoria as string).trim() : null,
          pyme_nombre: (body.pyme_nombre as string).trim(),
          pyme_email: (body.pyme_email as string).trim().toLowerCase(),
        })
        .select("*")
        .single()

      if (error || !creado) throw error
      producto = creado
    }

    await enviarPropuesta({
      destinatario: producto.pyme_email,
      pymeNombre: producto.pyme_nombre,
      productoNombre: producto.nombre,
      descripcion: producto.descripcion,
      imagenUrl: producto.imagen_url,
      precioRef: producto.precio_ref,
      token: producto.token,
      tokenExpira: producto.token_expira,
    })

    return res.status(200).json({ ok: true, id: producto.id })
  } catch (error) {
    console.error("Error en /api/admin/proponer:", error)
    return res.status(500).json({ error: "No se pudo crear ni enviar la propuesta." })
  }
}
