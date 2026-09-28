import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

function formatoClp(valor: number | null): string {
  if (valor == null) return ""
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(valor)
}

function formatoFecha(iso: string): string {
  return new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso))
}

interface DatosPropuesta {
  destinatario: string
  pymeNombre: string
  productoNombre: string
  descripcion: string | null
  imagenUrl: string | null
  precioRef: number | null
  token: string
  tokenExpira: string
}

// Correo de propuesta inicial. Sin JavaScript, sin formularios, con versión
// en texto plano — pensado para no dañar la reputación de un dominio nuevo.
export async function enviarPropuesta(datos: DatosPropuesta) {
  const siteUrl = process.env.SITE_URL
  const link = `${siteUrl}/propuesta/${datos.token}`
  const precioHtml = datos.precioRef != null
    ? `<p style="margin:0 0 12px;color:#57534e;font-size:14px;">Precio de referencia: ${formatoClp(datos.precioRef)}</p>`
    : ""
  const imagenHtml = datos.imagenUrl
    ? `<img src="${datos.imagenUrl}" alt="" width="480" style="max-width:100%;border-radius:12px;display:block;margin:0 0 16px;" />`
    : ""
  const descripcionHtml = datos.descripcion
    ? `<p style="margin:0 0 12px;color:#57534e;font-size:14px;">${datos.descripcion}</p>`
    : ""

  const html = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:24px 16px;font-family:Arial,Helvetica,sans-serif;color:#292524;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;">
          <tr><td>
            <p style="margin:0 0 16px;font-size:15px;">Hola ${datos.pymeNombre},</p>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">
              Somos PettGo, una plataforma para dueños de mascotas en Curicó. Nos gustaría
              recomendar uno de sus productos en nuestro sitio junto con un link directo a
              su tienda, sin costo para ustedes.
            </p>
            ${imagenHtml}
            <p style="margin:0 0 4px;font-size:16px;font-weight:bold;">${datos.productoNombre}</p>
            ${descripcionHtml}
            ${precioHtml}
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;">
              <tr>
                <td style="border-radius:999px;background:#e08a3f;">
                  <a href="${link}" style="display:inline-block;padding:12px 22px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;">
                    Revisar propuesta
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 16px;font-size:13px;color:#78716c;">
              Desde ahí pueden aceptarla tal como está, editar los datos antes de publicar, o
              rechazarla. El enlace es personal y vence el ${formatoFecha(datos.tokenExpira)}.
            </p>
            <p style="margin:24px 0 0;font-size:14px;">
              Equipo PettGo<br />
              <a href="https://pettgo.cl" style="color:#e08a3f;">pettgo.cl</a>
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  `.trim()

  const text = [
    `Hola ${datos.pymeNombre},`,
    "",
    "Somos PettGo, una plataforma para dueños de mascotas en Curicó. Nos gustaría recomendar",
    "uno de sus productos en nuestro sitio junto con un link directo a su tienda, sin costo",
    "para ustedes.",
    "",
    `Producto: ${datos.productoNombre}`,
    datos.descripcion ?? "",
    datos.precioRef != null ? `Precio de referencia: ${formatoClp(datos.precioRef)}` : "",
    "",
    `Revisen la propuesta aquí: ${link}`,
    `Este enlace es personal y vence el ${formatoFecha(datos.tokenExpira)}.`,
    "",
    "Equipo PettGo",
    "https://pettgo.cl",
  ]
    .filter(Boolean)
    .join("\n")

  await resend.emails.send({
    from: "Equipo PettGo <contacto@pettgo.cl>",
    to: datos.destinatario,
    replyTo: "contacto@pettgo.cl",
    subject: `Propuesta para destacar ${datos.productoNombre} en PettGo`,
    html,
    text,
  })
}

interface DatosAviso {
  productoNombre: string
  pymeNombre: string
  accion: "aceptar" | "rechazar"
  cambios?: Record<string, unknown>
  motivo?: string
}

// Aviso interno al admin cuando la pyme responde (nunca cambia el estado por
// sí solo, solo informa).
export async function enviarAvisoRespuesta(datos: DatosAviso) {
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) return

  const accionTexto = datos.accion === "aceptar" ? "aceptó" : "rechazó"
  const cambiosTexto =
    datos.cambios && Object.keys(datos.cambios).length > 0
      ? `Cambios: ${Object.entries(datos.cambios)
          .map(([campo, valor]) => `${campo} → ${String(valor)}`)
          .join(", ")}`
      : ""
  const motivoTexto = datos.motivo ? `Motivo: ${datos.motivo}` : ""

  const text = [`${datos.pymeNombre} ${accionTexto} la propuesta de ${datos.productoNombre}.`, cambiosTexto, motivoTexto]
    .filter(Boolean)
    .join("\n")

  await resend.emails.send({
    from: "PettGo <contacto@pettgo.cl>",
    to: adminEmail,
    subject: `${datos.pymeNombre} ${accionTexto} tu propuesta — ${datos.productoNombre}`,
    text,
  })
}
