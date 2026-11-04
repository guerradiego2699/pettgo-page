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

interface DatosInforme {
  destinatario: string
  periodoLabel: string
  rangoTexto: string
  pdfBase64: string
}

// Envía el informe de Tendencias (PDF generado en el navegador) como adjunto.
export async function enviarInformeTendencias(datos: DatosInforme) {
  const html = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:24px 16px;font-family:Arial,Helvetica,sans-serif;color:#292524;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;">
          <tr><td>
            <p style="margin:0 0 16px;font-size:15px;">Adjunto el informe de Tendencias de PettGo.</p>
            <p style="margin:0 0 16px;font-size:14px;color:#57534e;">Período: ${datos.periodoLabel} · ${datos.rangoTexto}</p>
            <p style="margin:24px 0 0;font-size:14px;">Equipo PettGo<br /><a href="https://pettgo.cl" style="color:#e08a3f;">pettgo.cl</a></p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  `.trim()

  await resend.emails.send({
    from: "PettGo <contacto@pettgo.cl>",
    to: datos.destinatario,
    subject: `Informe de Tendencias PettGo — ${datos.periodoLabel}`,
    html,
    text: `Adjunto el informe de Tendencias de PettGo. Período: ${datos.periodoLabel} · ${datos.rangoTexto}`,
    attachments: [
      {
        filename: `informe-tendencias-pettgo-${datos.periodoLabel.toLowerCase()}.pdf`,
        content: datos.pdfBase64,
      },
    ],
  })
}

// ---------- Consulta de stock a la pyme ----------

function escaparHtml(valor: string): string {
  return valor.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")
}

interface DatosConsultaStock {
  destinatario: string
  pymeNombre: string
  productoNombre: string
  imagenUrl: string | null
  token: string
  tokenExpira: string
}

// Correo con dos botones: "Sí, sigue disponible" y "No, está agotado". Los botones NO responden por sí
// solos: abren una página donde la pyme confirma con un clic. Así los filtros de correo que abren los
// enlaces automáticamente no pueden archivar un producto por error.
export async function enviarConsultaStock(datos: DatosConsultaStock) {
  const base = (process.env.SITE_URL ?? "https://www.pettgo.cl").replace(/\/+$/, "")
  const enlaceSi = `${base}/stock/${datos.token}?r=si`
  const enlaceNo = `${base}/stock/${datos.token}?r=no`
  const producto = escaparHtml(datos.productoNombre)
  const pyme = escaparHtml(datos.pymeNombre)
  const imagen = datos.imagenUrl && datos.imagenUrl.startsWith("https://")
    ? `<img src="${escaparHtml(datos.imagenUrl)}" alt="" width="200" style="max-width:100%;border-radius:12px;display:block;margin:0 0 16px;" />`
    : ""

  const html = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:24px 16px;font-family:Arial,Helvetica,sans-serif;color:#292524;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;">
          <tr><td>
            <p style="margin:0 0 16px;font-size:15px;">Hola ${pyme},</p>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">
              Queremos asegurarnos de que quienes llegan a su tienda desde PettGo encuentren lo que buscan.
              ¿Sigue disponible este producto?
            </p>
            ${imagen}
            <p style="margin:0 0 20px;font-size:16px;font-weight:bold;">${producto}</p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
              <tr>
                <td style="border-radius:999px;background:#2f6f5e;">
                  <a href="${enlaceSi}" style="display:inline-block;padding:12px 22px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;">Sí, sigue disponible</a>
                </td>
                <td style="width:12px;"></td>
                <td style="border-radius:999px;background:#ffffff;border:2px solid #a8a29e;">
                  <a href="${enlaceNo}" style="display:inline-block;padding:10px 20px;color:#44403c;text-decoration:none;font-size:14px;font-weight:bold;">No, está agotado</a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#78716c;">
              Al elegir una opción verá un paso final para confirmar. Si el producto está agotado, lo
              pausaremos en nuestro sitio hasta que nos avise que volvió. El enlace es personal y vence el
              ${formatoFecha(datos.tokenExpira)}.
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
    "Queremos asegurarnos de que quienes llegan a su tienda desde PettGo encuentren lo que buscan.",
    `¿Sigue disponible "${datos.productoNombre}"?`,
    "",
    `Sí, sigue disponible: ${enlaceSi}`,
    `No, está agotado: ${enlaceNo}`,
    "",
    "Al elegir una opción verá un paso final para confirmar. Si está agotado, lo pausaremos en nuestro sitio",
    `hasta que nos avise que volvió. El enlace es personal y vence el ${formatoFecha(datos.tokenExpira)}.`,
    "",
    "Equipo PettGo",
    "https://pettgo.cl",
  ].join("\n")

  const { error } = await resend.emails.send({
    from: "Equipo PettGo <contacto@pettgo.cl>",
    to: datos.destinatario,
    replyTo: "contacto@pettgo.cl",
    subject: `¿Sigue disponible "${datos.productoNombre}"? — PettGo`,
    html,
    text,
  })
  if (error) throw new Error(`Resend rechazó la consulta de stock: ${error.message}`)
}

interface DatosAvisoStock {
  productoNombre: string
  pymeNombre: string
  disponible: boolean
}

// Aviso interno al admin cuando una pyme responde a la consulta de stock.
export async function enviarAvisoStock(datos: DatosAvisoStock) {
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) return

  const linea = datos.disponible
    ? `${datos.pymeNombre} confirmó que "${datos.productoNombre}" sigue disponible.`
    : `${datos.pymeNombre} informó que "${datos.productoNombre}" está agotado. El producto fue archivado y ya no se muestra en el sitio.`

  await resend.emails.send({
    from: "PettGo <contacto@pettgo.cl>",
    to: adminEmail,
    subject: datos.disponible ? `Stock confirmado — ${datos.productoNombre}` : `Producto archivado por falta de stock — ${datos.productoNombre}`,
    text: linea,
  })
}
