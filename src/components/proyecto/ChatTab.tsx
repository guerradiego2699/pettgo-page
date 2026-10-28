import { useState } from "react"
import { analisisLocalProyecto } from "../../lib/proyectoAnalisis"
import type { AnalisisProyecto } from "../../types/proyecto"

const PREGUNTAS_RAPIDAS = [
  "¿Cómo está el proyecto?",
  "¿Qué actividades están atrasadas?",
  "¿Cuál es el problema más importante actualmente?",
  "¿Qué actividades debemos revisar primero?",
  "¿Está en riesgo algún hito?",
]

interface Mensaje {
  rol: "usuario" | "agente"
  texto: string
}

function responder(pregunta: string, analisis: AnalisisProyecto): string {
  const q = pregunta.toLowerCase()
  const codigoMatch = pregunta.match(/[A-Za-z]+-\d+/)

  if (codigoMatch) {
    const act = analisis.actividades.find((a) => a.codigo.toLowerCase() === codigoMatch[0].toLowerCase())
    if (act) {
      if (q.includes("depend")) {
        return `${act.codigo} depende de: ${act.dependencias.join(", ") || "ninguna"}. Dependen de ${act.codigo}: ${
          act.dependientes_directos.join(", ") || "ninguna"
        }.`
      }
      return `${act.codigo} · ${act.actividad}: estado ${act.estado_calculado}, ${act.avance_real}% de avance, riesgo ${act.riesgo_calculado}, prioridad sugerida ${act.prioridad_sugerida}.`
    }
    return `No encontré la actividad ${codigoMatch[0]}.`
  }

  if (q.includes("atrasad")) {
    const atrasadas = analisis.actividades.filter((a) => a.estado_calculado === "Atrasada")
    return atrasadas.length
      ? `Atrasadas: ${atrasadas.map((a) => `${a.codigo} (${a.dias_atraso} días)`).join(", ")}.`
      : "No hay actividades atrasadas en este momento."
  }

  if (q.includes("bloquead")) {
    const bloqueadas = analisis.actividades.filter((a) => a.estado_calculado === "Bloqueada")
    return bloqueadas.length ? `Bloqueadas: ${bloqueadas.map((a) => a.codigo).join(", ")}.` : "No hay actividades bloqueadas."
  }

  if (q.includes("problema más importante") || q.includes("problema mas importante") || q.includes("más urgente") || q.includes("mas urgente")) {
    const top = analisis.alertas[0]
    return top ? `[${top.nivel}] ${top.tipo} en ${top.actividad}: ${top.problema}` : "No hay alertas activas ahora mismo."
  }

  if (q.includes("revisar primero") || q.includes("prioridad")) {
    const top = [...analisis.actividades].sort((a, b) => b.puntaje_riesgo - a.puntaje_riesgo).slice(0, 3)
    return top.length
      ? `Primero revisaría: ${top.map((a) => `${a.codigo} (${a.prioridad_sugerida})`).join(", ")}.`
      : "No hay actividades registradas todavía."
  }

  if (q.includes("hito")) {
    const enRiesgo = analisis.hitos.filter((h) => h.en_riesgo)
    return enRiesgo.length
      ? `Hitos en riesgo: ${enRiesgo.map((h) => `${h.codigo} (${h.motivos.join("; ")})`).join(" | ")}.`
      : "Ningún hito está en riesgo por ahora."
  }

  if (q.includes("cómo está") || q.includes("como esta") || q.includes("resumen") || q.includes("estado")) {
    return analisisLocalProyecto(analisis)
  }

  if (q.includes("reprogramaci") || q.includes("propuesta")) {
    return "Para generar una propuesta de reprogramación, ve a la pestaña «Propuestas», elige la actividad y (opcionalmente) una nueva fecha."
  }

  return "No tengo una respuesta preparada para eso todavía. Prueba preguntando por el estado general, actividades atrasadas o bloqueadas, hitos en riesgo, o qué revisar primero."
}

function ChatTab({ analisis }: { analisis: AnalisisProyecto }) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    { rol: "agente", texto: "Hola, puedo responder preguntas sobre el estado actual del proyecto usando los datos calculados. Prueba una de las sugerencias de abajo." },
  ])
  const [input, setInput] = useState("")

  function enviar(texto: string) {
    if (!texto.trim()) return
    const respuesta = responder(texto, analisis)
    setMensajes((prev) => [...prev, { rol: "usuario", texto }, { rol: "agente", texto: respuesta }])
    setInput("")
  }

  return (
    <div className="rounded-2xl border border-brand-100 bg-white p-5">
      <div className="flex max-h-[55vh] min-h-[280px] flex-col gap-3 overflow-y-auto p-2">
        {mensajes.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] whitespace-pre-wrap rounded-2xl border px-4 py-2.5 text-sm ${
              m.rol === "usuario" ? "self-end rounded-br-sm border-transparent bg-gradient-to-br from-brand-400 to-brand-600 text-white" : "self-start rounded-bl-sm border-brand-100 bg-brand-50 text-ink-700"
            }`}
          >
            {m.texto}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {PREGUNTAS_RAPIDAS.map((p) => (
          <button key={p} type="button" onClick={() => enviar(p)} className="rounded-full bg-brand-100 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-200">
            {p}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          enviar(input)
        }}
        className="mt-3 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pregunta sobre el proyecto… (ej. ¿Qué depende de PET-05?)"
          className="flex-1 rounded-full border border-ink-900/15 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
        />
        <button type="submit" className="rounded-full bg-gradient-to-br from-brand-400 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:shadow-lg">
          Enviar
        </button>
      </form>
      <p className="mt-2 text-xs text-ink-400">Responde con reglas sobre los datos ya cargados — no usa un modelo de IA.</p>
    </div>
  )
}

export default ChatTab
