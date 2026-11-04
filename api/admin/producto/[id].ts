import type { VercelRequest, VercelResponse } from "@vercel/node"
import { supabaseAdmin } from "../../_lib/supabaseAdmin.js"
import { requireAdmin } from "../../_lib/auth.js"
import { esUrlHttpsValida, textoValido, precioValido, especieValida } from "../../_lib/validation.js"
import { categoriaValida } from "../../_lib/categorias.js"
import { enviarConsultaStock } from "../../_lib/resend.js"
import { bloqueoConsultaStock, VIGENCIA_ENLACE_STOCK_MS } from "../../_lib/stock.js"
import { randomUUID } from "node:crypto"

const ESTADOS_VALIDOS = ["pendiente", "publicado", "rechazado"]

// Correcciones y control manual del admin sobre un producto ya propuesto:
// editar campos (si la pyme escribió algo mal), eliminarlo, o forzar
// aceptar/rechazar cuando la pyme nunca responde al correo.
// Además (POST con `accion`): preguntar el stock a la pyme por correo, archivar y reactivar.
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

  if (req.method === "POST") {
    const accion = req.body?.accion

    if (accion === "consultar_stock") {
      const { data: producto } = await supabaseAdmin
        .from("productos_pyme")
        .select("id, nombre, imagen_url, pyme_nombre, pyme_email, estado, stock_consultado_en, stock_token, stock_token_expira, stock_token_usado")
        .eq("id", id)
        .maybeSingle()

      if (!producto) return res.status(404).json({ error: "No se encontró el producto." })
      if (producto.estado !== "publicado") {
        return res.status(409).json({ error: "Solo se puede preguntar el stock de productos publicados." })
      }
      const bloqueadoHasta = bloqueoConsultaStock(producto)
      if (bloqueadoHasta) {
        return res.status(429).json({ error: "Ya se le preguntó el stock a la pyme y aún no responde.", bloqueado_hasta: bloqueadoHasta })
      }

      const ahora = new Date()
      const token = randomUUID()
      const tokenExpira = new Date(ahora.getTime() + VIGENCIA_ENLACE_STOCK_MS).toISOString()

      // Primero se registra la consulta (así un doble clic no manda dos correos) y después se envía.
      // Solo gana la primera solicitud: la actualización exige que nadie haya consultado entre medio.
      const { data: registrada, error: errorGuardar } = await supabaseAdmin
        .from("productos_pyme")
        .update({ stock_token: token, stock_token_expira: tokenExpira, stock_token_usado: false, stock_consultado_en: ahora.toISOString() })
        .eq("id", id)
        .eq("estado", "publicado")
        .filter("stock_consultado_en", producto.stock_consultado_en === null ? "is" : "eq", producto.stock_consultado_en)
        .select("id")
      if (errorGuardar) {
        console.error("Error al registrar la consulta de stock:", errorGuardar)
        return res.status(500).json({ error: "No se pudo registrar la consulta de stock." })
      }
      if (!registrada || registrada.length === 0) {
        return res.status(429).json({ error: "Ya se le preguntó el stock a la pyme y aún no responde." })
      }

      try {
        await enviarConsultaStock({
          destinatario: producto.pyme_email,
          pymeNombre: producto.pyme_nombre,
          productoNombre: producto.nombre,
          imagenUrl: producto.imagen_url,
          token,
          tokenExpira,
        })
      } catch (error) {
        console.error("Error al enviar la consulta de stock:", error)
        // Si el correo no salió, se deshace el registro para que el botón no quede bloqueado en vano.
        await supabaseAdmin
          .from("productos_pyme")
          .update({
            stock_token: producto.stock_token,
            stock_token_expira: producto.stock_token_expira,
            stock_token_usado: producto.stock_token_usado,
            stock_consultado_en: producto.stock_consultado_en,
          })
          .eq("id", id)
        return res.status(502).json({ error: "No se pudo enviar el correo a la pyme. Intenta de nuevo." })
      }

      return res.status(200).json({
        ok: true,
        bloqueado_hasta: bloqueoConsultaStock({ stock_consultado_en: ahora.toISOString(), stock_token_usado: false }),
      })
    }

    if (accion === "archivar") {
      // Si había una consulta de stock sin responder, su enlace deja de servir.
      const { data, error } = await supabaseAdmin
        .from("productos_pyme")
        .update({ estado: "archivado", archivado_en: new Date().toISOString(), archivado_motivo: "manual", stock_token_usado: true })
        .eq("id", id)
        .eq("estado", "publicado")
        .select("id")
      if (error) {
        console.error("Error al archivar producto:", error)
        return res.status(500).json({ error: "No se pudo archivar el producto." })
      }
      if (!data || data.length === 0) return res.status(409).json({ error: "Solo se pueden archivar productos publicados." })
      return res.status(200).json({ ok: true })
    }

    if (accion === "reactivar") {
      // Al volver a publicarlo el stock queda "sin confirmar": hay que volver a preguntarlo si se quiere.
      const { data, error } = await supabaseAdmin
        .from("productos_pyme")
        .update({
          estado: "publicado",
          archivado_en: null,
          archivado_motivo: null,
          stock_estado: null,
          stock_confirmado_en: null,
          stock_token_usado: true,
        })
        .eq("id", id)
        .eq("estado", "archivado")
        .select("id")
      if (error) {
        console.error("Error al reactivar producto:", error)
        return res.status(500).json({ error: "No se pudo reactivar el producto." })
      }
      if (!data || data.length === 0) return res.status(409).json({ error: "Solo se pueden reactivar productos archivados." })
      return res.status(200).json({ ok: true })
    }

    return res.status(400).json({ error: "Acción no válida." })
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
      // Vacío o null = "Sin categoría" (productos antiguos que no calzaron con ninguna).
      if (body.categoria != null && body.categoria !== "" && !categoriaValida(body.categoria)) {
        return res.status(400).json({ error: "La categoría no es válida." })
      }
      actualizacion.categoria = body.categoria || null
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
