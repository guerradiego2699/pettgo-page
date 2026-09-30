import type { VercelRequest, VercelResponse } from "@vercel/node"
import { supabaseAdmin } from "../../../_lib/supabaseAdmin.js"
import { requireAdmin } from "../../../_lib/auth.js"
import { textoValido } from "../../../_lib/validation.js"
import { codigoValido, estadoHitoValido, fechaValida, listaCodigosValida } from "../../../_lib/proyectoValidacion.js"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido." })
  }

  const auth = await requireAdmin(req)
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error })

  const body = req.body ?? {}

  if (!codigoValido(body.codigo)) {
    return res.status(400).json({ error: "El código debe tener el formato HITO-NÚMERO, ej. HITO-06." })
  }
  if (!textoValido(body.nombre, { maxLength: 150, requerido: true })) {
    return res.status(400).json({ error: "Falta el nombre del hito." })
  }
  if (!fechaValida(body.fecha)) {
    return res.status(400).json({ error: "La fecha del hito no es válida." })
  }
  if (body.estado_declarado != null && !estadoHitoValido(body.estado_declarado)) {
    return res.status(400).json({ error: "El estado no es válido." })
  }
  if (body.actividades_requeridas != null && !listaCodigosValida(body.actividades_requeridas)) {
    return res.status(400).json({ error: "Las actividades requeridas no son válidas." })
  }
  if (!textoValido(body.descripcion, { maxLength: 500 })) {
    return res.status(400).json({ error: "La descripción es demasiado larga." })
  }

  const { data: creado, error } = await supabaseAdmin
    .from("proyecto_hitos")
    .insert({
      codigo: body.codigo,
      nombre: (body.nombre as string).trim(),
      fecha: body.fecha,
      estado_declarado: body.estado_declarado ?? "Pendiente",
      actividades_requeridas: body.actividades_requeridas ?? [],
      descripcion: body.descripcion ? (body.descripcion as string).trim() : null,
    })
    .select("*")
    .single()

  if (error || !creado) {
    if (error?.code === "23505") {
      return res.status(409).json({ error: `Ya existe un hito con el código ${body.codigo}.` })
    }
    console.error("Error al crear hito:", error)
    return res.status(500).json({ error: "No se pudo crear el hito." })
  }

  const { data: actividades } = await supabaseAdmin.from("proyecto_actividades").select("codigo")
  const existentes = new Set((actividades ?? []).map((a) => a.codigo))
  const inexistentes = (creado.actividades_requeridas as string[]).filter((c) => !existentes.has(c))

  await supabaseAdmin.from("proyecto_auditoria").insert({
    tipo_analisis: "Nuevo hito",
    origen: "Panel de dashboard",
    actividad: creado.codigo,
  })

  return res.status(200).json({ ...creado, actividades_inexistentes: inexistentes })
}
