import type { VercelRequest, VercelResponse } from "@vercel/node"
import { supabaseAdmin } from "../../../_lib/supabaseAdmin.js"
import { requireAdmin } from "../../../_lib/auth.js"
import { fechaValida } from "../../../_lib/proyectoValidacion.js"
import type { Actividad } from "../../../../src/types/proyecto.js"

const MS_DIA = 24 * 60 * 60 * 1000
const DESPLAZAMIENTO_POR_DEFECTO = 7

function sumarDias(iso: string | null, dias: number): string | null {
  if (!iso) return null
  const d = new Date(iso + "T00:00:00Z")
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error })

  if (req.method === "GET") {
    const { data, error } = await supabaseAdmin.from("proyecto_propuestas").select("*").order("creado_en", { ascending: false })
    if (error) {
      console.error("Error al listar propuestas:", error)
      return res.status(500).json({ error: "No se pudieron cargar las propuestas." })
    }
    return res.status(200).json(data ?? [])
  }

  if (req.method === "POST") {
    const body = req.body ?? {}
    const codigo = typeof body.actividad_codigo === "string" ? body.actividad_codigo : null
    if (!codigo) return res.status(400).json({ error: "Falta la actividad." })
    if (body.nueva_fecha_limite != null && !fechaValida(body.nueva_fecha_limite)) {
      return res.status(400).json({ error: "La nueva fecha no es válida." })
    }

    const { data: actividades, error } = await supabaseAdmin.from("proyecto_actividades").select("*")
    if (error) {
      console.error("Error al cargar actividades para la propuesta:", error)
      return res.status(500).json({ error: "No se pudieron cargar las actividades." })
    }
    const lista = (actividades ?? []) as Actividad[]
    const base = lista.find((a) => a.codigo === codigo)
    if (!base) return res.status(404).json({ error: "No se encontró la actividad." })

    const desplazamiento = body.nueva_fecha_limite
      ? Math.round(
          (new Date(body.nueva_fecha_limite + "T00:00:00Z").getTime() - new Date((base.fecha_limite ?? body.nueva_fecha_limite) + "T00:00:00Z").getTime()) /
            MS_DIA
        )
      : DESPLAZAMIENTO_POR_DEFECTO

    // BFS de dependientes (directos e indirectos) para armar el cronograma propuesto.
    const porCodigo = new Map(lista.map((a) => [a.codigo, a]))
    const nivelPorCodigo = new Map<string, number>([[codigo, 0]])
    const cola = [codigo]
    const afectadas: string[] = []
    while (cola.length) {
      const actual = cola.shift()!
      const nivelActual = nivelPorCodigo.get(actual)!
      for (const a of lista) {
        if (a.dependencias.includes(actual) && !nivelPorCodigo.has(a.codigo)) {
          nivelPorCodigo.set(a.codigo, nivelActual + 1)
          afectadas.push(a.codigo)
          cola.push(a.codigo)
        }
      }
    }

    const cronograma = [codigo, ...afectadas].map((c) => {
      const a = porCodigo.get(c)!
      return {
        codigo: c,
        nivel_dependencia: nivelPorCodigo.get(c)!,
        fecha_inicio_actual: a.fecha_inicio,
        fecha_inicio_propuesta: sumarDias(a.fecha_inicio, desplazamiento),
        fecha_limite_actual: a.fecha_limite,
        fecha_limite_propuesta: sumarDias(a.fecha_limite, desplazamiento),
        desplazamiento_dias: desplazamiento,
      }
    })

    const texto = [
      `PROPUESTA DE REPROGRAMACIÓN — ${codigo} (${base.actividad})`,
      "",
      `Desplazamiento propuesto: ${desplazamiento > 0 ? "+" : ""}${desplazamiento} día(s).`,
      afectadas.length
        ? `Actividades que dependen de ${codigo}, directa o indirectamente: ${afectadas.join(", ")}.`
        : "Ninguna otra actividad depende de esta.",
      "",
      "Ninguna fecha fue modificada todavía — esto es solo una propuesta a decidir.",
    ].join("\n")

    const { data: creada, error: errorInsert } = await supabaseAdmin
      .from("proyecto_propuestas")
      .insert({ actividad_codigo: codigo, texto, cronograma_propuesto: cronograma })
      .select("*")
      .single()

    if (errorInsert || !creada) {
      console.error("Error al crear propuesta:", errorInsert)
      return res.status(500).json({ error: "No se pudo crear la propuesta." })
    }

    await supabaseAdmin.from("proyecto_auditoria").insert({
      tipo_analisis: "Propuesta de reprogramación",
      origen: "Pestaña de propuestas",
      actividad: codigo,
      recomendacion: `Desplazamiento sugerido: ${desplazamiento} día(s).`,
    })

    return res.status(200).json(creada)
  }

  return res.status(405).json({ error: "Método no permitido." })
}
