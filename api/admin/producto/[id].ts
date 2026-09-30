import type { VercelRequest, VercelResponse } from "@vercel/node"
import { supabaseAdmin } from "../../_lib/supabaseAdmin.js"
import { requireAdmin } from "../../_lib/auth.js"
import { esUrlHttpsValida, textoValido, precioValido, especieValida } from "../../_lib/validation.js"

const ESTADOS_VALIDOS = ["pendiente", "publicado", "rechazado"]

// Correcciones y control manual del admin sobre un producto ya propuesto:
// editar campos (si la pyme escribió algo mal), eliminarlo, o forzar
// aceptar/rechazar cuando la pyme nunca responde al correo.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error })

  const id = typeof req.query.id === "string" ? req.query.id : null
  if (!id) {
    return res.status(400).json({ error: "Falta el identificador del producto." })
  }

  if (req.method === "DELETE") {
    const { error } = await supabaseAdmin.from("productos_pyme").delete().eq("id", id)
    if (error) {
      console.error("Error al eliminar producto:", error)
      return res.status(500).json({ error: "No se pudo eliminar el producto." })
    }
    return res.status(200).json({ ok: true })
  }

  if (req.method === "PATCH") {
    const body = req.body ?? {}
    const actualizacion: Record<string, unknown> = {}

    if ("nombre" in body) {
      if (!textoValido(body.nombre, { maxLength: 120, requerido: true })) {
        return res.status(400).json({ error: "El nombre no es válido." })
      }
      actualizacion.nombre = (body.nombre as string).trim()
    }
    if ("descripcion" in body) {
      if (!textoValido(body.descripcion, { maxLength: 1000 })) {
        return res.status(400).json({ error: "La descripción es demasiado larga." })
      }
      actualizacion.descripcion = body.descripcion ? (body.descripcion as string).trim() : null
    }
    if ("precio_ref" in body) {
      if (body.precio_ref != null && !precioValido(body.precio_ref)) {
        return res.status(400).json({ error: "El precio no es válido." })
      }
      actualizacion.precio_ref = body.precio_ref ?? null
    }
    if ("link_tienda" in body) {
      if (!esUrlHttpsValida(body.link_tienda)) {
        return res.status(400).json({ error: "El link de la tienda debe ser una URL https válida." })
      }
      actualizacion.link_tienda = (body.link_tienda as string).trim()
    }
    if ("imagen_url" in body) {
      if (body.imagen_url && !esUrlHttpsValida(body.imagen_url)) {
        return res.status(400).json({ error: "La imagen debe ser una URL https válida." })
      }
      actualizacion.imagen_url = body.imagen_url ? (body.imagen_url as string).trim() : null
    }
    if ("categoria" in body) {
      if (!textoValido(body.categoria, { maxLength: 60 })) {
        return res.status(400).json({ error: "La categoría no es válida." })
      }
      actualizacion.categoria = body.categoria ? (body.categoria as string).trim() : null
    }
    if ("especie" in body) {
      if (!especieValida(body.especie)) {
        return res.status(400).json({ error: "La mascota no es válida." })
      }
      actualizacion.especie = body.especie
    }
    if ("estado" in body) {
      if (!ESTADOS_VALIDOS.includes(body.estado)) {
        return res.status(400).json({ error: "Estado inválido." })
      }
      actualizacion.estado = body.estado
      actualizacion.token_usado = true
      if (body.estado === "publicado") {
        actualizacion.aceptado_en = new Date().toISOString()
      }
      if (body.estado === "rechazado" && "motivo_rechazo" in body) {
        if (!textoValido(body.motivo_rechazo, { maxLength: 500 })) {
          return res.status(400).json({ error: "El motivo es demasiado largo." })
        }
        actualizacion.motivo_rechazo = body.motivo_rechazo ? (body.motivo_rechazo as string).trim() : null
      }
    }

    if (Object.keys(actualizacion).length === 0) {
      return res.status(400).json({ error: "No hay cambios para aplicar." })
    }

    const { error } = await supabaseAdmin.from("productos_pyme").update(actualizacion).eq("id", id)
    if (error) {
      console.error("Error al actualizar producto:", error)
      return res.status(500).json({ error: "No se pudo actualizar el producto." })
    }
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: "Método no permitido." })
}
