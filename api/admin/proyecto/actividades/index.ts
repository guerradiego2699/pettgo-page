import type { VercelRequest, VercelResponse } from "@vercel/node"
import { supabaseAdmin } from "../../../_lib/supabaseAdmin.js"
import { requireAdmin } from "../../../_lib/auth.js"
import { textoValido } from "../../../_lib/validation.js"
import {
  actividadTextoValida,
  areaValida,
  codigoValido,
  estadoActividadValido,
  fechaValida,
  listaCodigosValida,
  porcentajeValido,
  prioridadValida,
  riesgoValido,
} from "../../../_lib/proyectoValidacion.js"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido." })
  }

  const auth = await requireAdmin(req)
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error })

  const body = req.body ?? {}

  if (!codigoValido(body.codigo)) {
    return res.status(400).json({ error: "El código debe tener el formato ÁREA-NÚMERO, ej. PET-05." })
  }
  if (!areaValida(body.area)) {
    return res.status(400).json({ error: "El área no es válida." })
  }
  if (!actividadTextoValida(body.actividad)) {
    return res.status(400).json({ error: "Falta el nombre de la actividad." })
  }
  if (!textoValido(body.responsable, { maxLength: 120 })) {
    return res.status(400).json({ error: "El responsable no es válido." })
  }
  if (body.estado != null && !estadoActividadValido(body.estado)) {
    return res.status(400).json({ error: "El estado no es válido." })
  }
  if (body.fecha_inicio != null && !fechaValida(body.fecha_inicio)) {
    return res.status(400).json({ error: "La fecha de inicio no es válida." })
  }
  if (body.fecha_limite != null && !fechaValida(body.fecha_limite)) {
    return res.status(400).json({ error: "La fecha límite no es válida." })
  }
  if (body.avance_esperado != null && !porcentajeValido(body.avance_esperado)) {
    return res.status(400).json({ error: "El avance esperado debe ser un número entre 0 y 100." })
  }
  if (body.avance_real != null && !porcentajeValido(body.avance_real)) {
    return res.status(400).json({ error: "El avance real debe ser un número entre 0 y 100." })
  }
  if (body.prioridad != null && !prioridadValida(body.prioridad)) {
    return res.status(400).json({ error: "La prioridad no es válida." })
  }
  if (body.riesgo != null && !riesgoValido(body.riesgo)) {
    return res.status(400).json({ error: "El riesgo no es válido." })
  }
  if (body.dependencias != null && !listaCodigosValida(body.dependencias)) {
    return res.status(400).json({ error: "Las dependencias deben ser códigos válidos (ej. PET-03)." })
  }
  if (!textoValido(body.observaciones, { maxLength: 1000 })) {
    return res.status(400).json({ error: "Las observaciones son demasiado largas." })
  }

  const { data: creado, error } = await supabaseAdmin
    .from("proyecto_actividades")
    .insert({
      codigo: body.codigo,
      area: body.area,
      actividad: (body.actividad as string).trim(),
      responsable: body.responsable ? (body.responsable as string).trim() : null,
      estado: body.estado ?? "Pendiente",
      fecha_inicio: body.fecha_inicio ?? null,
      fecha_limite: body.fecha_limite ?? null,
      avance_esperado: body.avance_esperado ?? 0,
      avance_real: body.avance_real ?? 0,
      prioridad: body.prioridad ?? "Media",
      riesgo: body.riesgo ?? "Bajo",
      dependencias: body.dependencias ?? [],
      observaciones: body.observaciones ? (body.observaciones as string).trim() : null,
    })
    .select("*")
    .single()

  if (error || !creado) {
    if (error?.code === "23505") {
      return res.status(409).json({ error: `Ya existe una actividad con el código ${body.codigo}.` })
    }
    console.error("Error al crear actividad:", error)
    return res.status(500).json({ error: "No se pudo crear la actividad." })
  }

  await supabaseAdmin.from("proyecto_auditoria").insert({
    tipo_analisis: "Nueva actividad",
    origen: "Panel de actividades",
    actividad: creado.codigo,
  })

  return res.status(200).json(creado)
}
