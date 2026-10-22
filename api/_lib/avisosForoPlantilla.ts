// Plantillas de los correos de moderación del foro (sin dependencias, para poder probarlas solas).
// Se envían a seguridad@pettgo.cl cuando alguien publica un tema nuevo o reporta un tema/respuesta.

export interface CorreoListo {
  asunto: string
  html: string
  text: string
}

interface Estructura {
  etiqueta: string
  fondoEtiqueta: string
  colorEtiqueta: string
  titulo: string
  intro: string
  filas: { etiqueta: string; valor: string }[]
  extractoTitulo: string
  extracto: string | null
  botonTexto: string
  botonUrl: string
  enlaceExtra: { texto: string; url: string } | null
}

export function escapar(valor: string): string {
  return valor.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")
}

// Texto corto de un comentario o tema, en una sola línea.
export function extracto(texto: string | null | undefined, max = 280): string | null {
  const limpio = (texto ?? "").replace(/\s+/g, " ").trim()
  if (!limpio) return null
  return limpio.length > max ? limpio.slice(0, max).trimEnd() + "…" : limpio
}

function fechaHora(iso: string): string {
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeStyle: "short", timeZone: "America/Santiago" }).format(new Date(iso))
}

// Los asuntos no pueden traer saltos de línea ni ser larguísimos.
function asuntoSeguro(texto: string): string {
  const una = texto.replace(/\s+/g, " ").trim()
  return una.length > 120 ? una.slice(0, 117) + "…" : una
}

function sinBarraFinal(url: string): string {
  return url.replace(/\/+$/, "")
}

function armar(e: Estructura, asunto: string): CorreoListo {
  const filasHtml = e.filas
    .map(
      (f) => `
        <tr>
          <td style="padding:4px 12px 4px 0;font-size:13px;color:#78716c;white-space:nowrap;vertical-align:top;">${escapar(f.etiqueta)}</td>
          <td style="padding:4px 0;font-size:14px;color:#292524;">${escapar(f.valor)}</td>
        </tr>`
    )
    .join("")

  const extractoHtml = e.extracto
    ? `
      <p style="margin:20px 0 6px;font-size:12px;font-weight:bold;letter-spacing:.04em;text-transform:uppercase;color:#a8a29e;">${escapar(e.extractoTitulo)}</p>
      <p style="margin:0;padding:12px 14px;background:#faf5ee;border-left:3px solid #e08a3f;border-radius:6px;font-size:14px;line-height:1.5;color:#44403c;">${escapar(e.extracto)}</p>`
    : ""

  const enlaceExtraHtml = e.enlaceExtra
    ? `<p style="margin:0 0 4px;font-size:13px;"><a href="${escapar(e.enlaceExtra.url)}" style="color:#c96f2c;">${escapar(e.enlaceExtra.texto)}</a></p>`
    : ""

  const html = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf5ee;">
      <tr><td style="padding:28px 16px;font-family:Arial,Helvetica,sans-serif;color:#292524;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;margin:0 auto;">
          <tr><td style="padding:0 4px 14px;font-size:20px;font-weight:bold;color:#5c2a22;">Pett<span style="color:#e08a3f;">Go</span></td></tr>
          <tr><td style="background:#ffffff;border:1px solid #f0e2d0;border-radius:16px;padding:24px;">
            <span style="display:inline-block;padding:4px 12px;border-radius:999px;background:${e.fondoEtiqueta};color:${e.colorEtiqueta};font-size:12px;font-weight:bold;">${escapar(e.etiqueta)}</span>
            <h1 style="margin:14px 0 8px;font-size:20px;line-height:1.3;color:#292524;">${escapar(e.titulo)}</h1>
            <p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:#57534e;">${escapar(e.intro)}</p>
            <table role="presentation" cellpadding="0" cellspacing="0">${filasHtml}
            </table>
            ${extractoHtml}
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 14px;">
              <tr><td style="border-radius:999px;background:#e08a3f;">
                <a href="${escapar(e.botonUrl)}" style="display:inline-block;padding:12px 22px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;">${escapar(e.botonTexto)}</a>
              </td></tr>
            </table>
            ${enlaceExtraHtml}
          </td></tr>
          <tr><td style="padding:14px 4px 0;font-size:12px;color:#a8a29e;">
            Aviso automático de moderación de PettGo. Responder a este correo no publica ni modifica nada en el foro.
          </td></tr>
        </table>
      </td></tr>
    </table>
  `.trim()

  const text = [
    `PettGo — ${e.etiqueta}`,
    "",
    e.titulo,
    e.intro,
    "",
    ...e.filas.map((f) => `${f.etiqueta}: ${f.valor}`),
    ...(e.extracto ? ["", `${e.extractoTitulo}:`, e.extracto] : []),
    "",
    `${e.botonTexto}: ${e.botonUrl}`,
    ...(e.enlaceExtra ? [`${e.enlaceExtra.texto}: ${e.enlaceExtra.url}`] : []),
    "",
    "Aviso automático de moderación de PettGo.",
  ].join("\n")

  return { asunto, html, text }
}

export interface DatosTemaNuevo {
  siteUrl: string
  temaId: string
  titulo: string
  cuerpo: string
  autor: string
  creadoEn: string
}

export function construirCorreoTemaNuevo(d: DatosTemaNuevo): CorreoListo {
  const base = sinBarraFinal(d.siteUrl)
  return armar(
    {
      etiqueta: "Nuevo tema en el foro",
      fondoEtiqueta: "#fdebd3",
      colorEtiqueta: "#9a4f12",
      titulo: d.titulo,
      intro: "Alguien acaba de publicar un tema en la comunidad. Revísalo si quieres confirmar que cumple las normas.",
      filas: [
        { etiqueta: "Autor", valor: d.autor },
        { etiqueta: "Publicado", valor: fechaHora(d.creadoEn) },
      ],
      extractoTitulo: "Inicio del mensaje",
      extracto: extracto(d.cuerpo),
      botonTexto: "Ver el tema en el foro",
      botonUrl: `${base}/comunidad/${d.temaId}`,
      enlaceExtra: { texto: "Abrir panel de moderación", url: `${base}/admin/reportes` },
    },
    asuntoSeguro(`PettGo | Nuevo tema en el foro: ${d.titulo}`)
  )
}

export interface DatosReporte {
  siteUrl: string
  tipo: "tema" | "respuesta"
  hiloId: string | null
  motivo: string | null
  reportante: string
  autorContenido: string | null
  contenido: string | null
  creadoEn: string
}

export function construirCorreoReporte(d: DatosReporte): CorreoListo {
  const base = sinBarraFinal(d.siteUrl)
  const que = d.tipo === "tema" ? "un tema" : "una respuesta"
  return armar(
    {
      etiqueta: d.tipo === "tema" ? "Tema reportado" : "Respuesta reportada",
      fondoEtiqueta: "#fde2e2",
      colorEtiqueta: "#b42318",
      titulo: `Un usuario reportó ${que} del foro`,
      intro: "Decide desde el panel si conservar el contenido, eliminarlo o descartar el reporte.",
      filas: [
        { etiqueta: "Reportado por", valor: d.reportante },
        { etiqueta: "Autor del contenido", valor: d.autorContenido ?? "Contenido ya eliminado" },
        { etiqueta: "Motivo", valor: d.motivo?.trim() ? d.motivo.trim() : "No indicó motivo" },
        { etiqueta: "Fecha", valor: fechaHora(d.creadoEn) },
      ],
      extractoTitulo: "Contenido reportado",
      extracto: extracto(d.contenido),
      botonTexto: "Abrir panel de moderación",
      botonUrl: `${base}/admin/reportes`,
      enlaceExtra: d.hiloId ? { texto: "Ver en el foro", url: `${base}/comunidad/${d.hiloId}` } : null,
    },
    asuntoSeguro(`PettGo | ${d.tipo === "tema" ? "Tema reportado" : "Respuesta reportada"} en el foro`)
  )
}
