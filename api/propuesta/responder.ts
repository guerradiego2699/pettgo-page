import type { VercelRequest, VercelResponse } from "@vercel/node"
import { supabaseAdmin } from "../_lib/supabaseAdmin.js"
import { esUrlHttpsValida, textoValido, precioValido } from "../_lib/validation.js"
import { enviarAvisoRespuesta } from "../_lib/resend.js"

const CAMPOS_EDITABLES = ["nombre", "descripcion", "precio_ref", "link_tienda", "imagen_url"] as const
type CampoEditable = (typeof CAMPOS_EDITABLES)[number]

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido." })
  }

  const { token, accion, cambios, motivo } = req.body ?? {}

  if (typeof token !== "string" || (accion !== "aceptar" && accion !== "rechazar")) {
    return res.status(400).json({ error: "Solicitud inválida." })
  }

  const { data: producto, error: errorBusqueda } = await supabaseAdmin
    .from("productos_pyme")
    .select("*")
    .eq("token", token)
    .single()

  if (errorBusqueda || !producto) {
    return res.status(404).json({ error: "Este enlace no es válido." })
  }
  if (producto.token_usado) {
    return res.status(410).json({ error: "Este enlace ya fue utilizado." })
  }
  if (new Date(producto.token_expira).getTime() < Date.now()) {
    return res.status(410).json({ error: "Este enlace venció." })
  }

  const actualizacion: Record<string, unknown> = { token_usado: true }
  const cambiosAplicados: Record<string, unknown> = {}

  if (accion === "rechazar") {
    if (!textoValido(motivo, { maxLength: 500 })) {
      return res.status(400).json({ error: "El motivo es demasiado largo." })
    }
    actualizacion.estado = "rechazado"
    actualizacion.motivo_rechazo = motivo ? (motivo as string).trim() : null
  } else {
    if (cambios && typeof cambios === "object") {
      for (const campo of CAMPOS_EDITABLES as readonly CampoEditable[]) {
        if (!(campo in cambios)) continue
        const valor = (cambios as Record<string, unknown>)[campo]

        if (campo === "nombre" && !textoValido(valor, { maxLength: 120, requerido: true })) {
          return res.status(400).json({ error: "El nombre no es válido." })
        }
        if (campo === "descripcion" && !textoValido(valor, { maxLength: 1000 })) {
          return res.status(400).json({ error: "La descripción es demasiado larga." })
        }
        if (campo === "precio_ref" && valor != null && !precioValido(valor)) {
          return res.status(400).json({ error: "El precio no es válido." })
        }
        if ((campo === "link_tienda" || campo === "imagen_url") && valor && !esUrlHttpsValida(valor)) {
          return res.status(400).json({
            error: `${campo === "link_tienda" ? "El link de la tienda" : "La imagen"} debe ser una URL https válida.`,
          })
        }

        actualizacion[campo] = typeof valor === "string" ? valor.trim() || null : valor
        cambiosAplicados[campo] = valor
      }
    }

    actualizacion.estado = "publicado"
    actualizacion.aceptado_en = new Date().toISOString()
    actualizacion.editado_por_pyme = Object.keys(cambiosAplicados).length > 0
  }

  const { error: errorUpdate } = await supabaseAdmin.from("productos_pyme").update(actualizacion).eq("id", producto.id)

  if (errorUpdate) {
    console.error("Error al actualizar propuesta:", errorUpdate)
    return res.status(500).json({ error: "No se pudo guardar tu respuesta." })
  }

  await enviarAvisoRespuesta({
    productoNombre: producto.nombre,
    pymeNombre: producto.pyme_nombre,
    accion,
    cambios: cambiosAplicados,
    motivo: accion === "rechazar" ? motivo : undefined,
  })

  return res.status(200).json({ ok: true })
}
