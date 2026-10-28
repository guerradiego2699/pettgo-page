import { Resend } from "resend"
import { supabaseAdmin } from "./supabaseAdmin.js"
import { construirCorreoReporte, construirCorreoTemaNuevo, type CorreoListo } from "./avisosForoPlantilla.js"

const resend = new Resend(process.env.RESEND_API_KEY)

const DESTINATARIO_POR_DEFECTO = "seguridad@pettgo.cl"

async function nombreDe(userId: string | null): Promise<string | null> {
  if (!userId) return null
  const { data } = await supabaseAdmin.from("profiles").select("name").eq("id", userId).maybeSingle()
  return data?.name?.trim() || "Usuario sin nombre"
}

async function enviar(correo: CorreoListo) {
  const { error } = await resend.emails.send({
    from: "PettGo Moderación <contacto@pettgo.cl>",
    to: process.env.SEGURIDAD_EMAIL || DESTINATARIO_POR_DEFECTO,
    subject: correo.asunto,
    html: correo.html,
    text: correo.text,
  })
  if (error) throw new Error(`Resend rechazó el aviso: ${error.message}`)
}

// Siempre se vuelve a leer la fila desde la base: del webhook solo se usa el id.
export async function avisarTemaNuevo(temaId: string): Promise<boolean> {
  const { data: tema } = await supabaseAdmin
    .from("forum_threads")
    .select("id, title, body, author_id, created_at")
    .eq("id", temaId)
    .maybeSingle()
  if (!tema) return false

  await enviar(
    construirCorreoTemaNuevo({
      siteUrl: process.env.SITE_URL ?? "https://pettgo.cl",
      temaId: tema.id,
      titulo: tema.title,
      cuerpo: tema.body,
      autor: (await nombreDe(tema.author_id)) ?? "Usuario desconocido",
      creadoEn: tema.created_at,
    })
  )
  return true
}

export async function avisarReporte(reporteId: string): Promise<boolean> {
  const { data: reporte } = await supabaseAdmin
    .from("reports")
    .select("id, reporter_id, thread_id, post_id, reason, created_at")
    .eq("id", reporteId)
    .maybeSingle()
  if (!reporte) return false

  let hiloId: string | null = reporte.thread_id
  let autorId: string | null = null
  let contenido: string | null = null

  if (reporte.post_id) {
    const { data: respuesta } = await supabaseAdmin
      .from("forum_posts")
      .select("thread_id, author_id, body")
      .eq("id", reporte.post_id)
      .maybeSingle()
    hiloId = respuesta?.thread_id ?? null
    autorId = respuesta?.author_id ?? null
    contenido = respuesta?.body ?? null
  } else if (reporte.thread_id) {
    const { data: tema } = await supabaseAdmin
      .from("forum_threads")
      .select("author_id, title, body")
      .eq("id", reporte.thread_id)
      .maybeSingle()
    autorId = tema?.author_id ?? null
    contenido = tema ? `${tema.title} — ${tema.body}` : null
  }

  await enviar(
    construirCorreoReporte({
      siteUrl: process.env.SITE_URL ?? "https://pettgo.cl",
      tipo: reporte.post_id ? "respuesta" : "tema",
      hiloId,
      motivo: reporte.reason,
      reportante: (await nombreDe(reporte.reporter_id)) ?? "Usuario desconocido",
      autorContenido: await nombreDe(autorId),
      contenido,
      creadoEn: reporte.created_at,
    })
  )
  return true
}
