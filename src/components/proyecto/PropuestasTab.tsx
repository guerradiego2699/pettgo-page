import { useEffect, useState, type FormEvent } from "react"
import type { Session } from "@supabase/supabase-js"
import { proyectoApi } from "../../lib/proyectoApi"
import type { AnalisisProyecto, Propuesta } from "../../types/proyecto"

const ESTADO_ESTILO: Record<string, string> = {
  "PENDIENTE DE APROBACIÓN": "bg-amber-100 text-amber-700",
  APROBADA: "bg-emerald-100 text-emerald-700",
  RECHAZADA: "bg-red-100 text-red-700",
}

function PropuestasTab({ session, analisis }: { session: Session; analisis: AnalisisProyecto }) {
  const [codigo, setCodigo] = useState(analisis.actividades[0]?.codigo ?? "")
  const [fecha, setFecha] = useState("")
  const [propuestas, setPropuestas] = useState<Propuesta[]>([])
  const [resultado, setResultado] = useState<Propuesta | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [decidiendo, setDecidiendo] = useState<{ id: string; aprobado: boolean } | null>(null)

  async function cargar() {
    try {
      setPropuestas(await proyectoApi.listarPropuestas(session.access_token))
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las propuestas.")
    }
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function generar(event: FormEvent) {
    event.preventDefault()
    if (!codigo) return
    setEnviando(true)
    setError(null)
    try {
      const p = await proyectoApi.crearPropuesta(session.access_token, codigo, fecha)
      setResultado(p)
      await cargar()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar la propuesta.")
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-brand-100 bg-white p-5">
        <form onSubmit={generar} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
            Actividad
            <select value={codigo} onChange={(e) => setCodigo(e.target.value)} className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none">
              {analisis.actividades.map((a) => (
                <option key={a.codigo} value={a.codigo}>
                  {a.codigo} · {a.actividad.slice(0, 40)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
            Nueva fecha límite (opcional)
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
          </label>
          <button
            type="submit"
            disabled={enviando || !codigo}
            className="rounded-full bg-gradient-to-br from-brand-400 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:shadow-lg disabled:opacity-60"
          >
            {enviando ? "Generando…" : "Generar propuesta de reprogramación"}
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {resultado && (
          <div className="mt-5 rounded-xl border border-brand-100 bg-brand-50 p-4">
            <h3 className="font-heading text-base font-bold text-ink-900">Propuesta de reprogramación — {resultado.actividad_codigo}</h3>
            <pre className="mt-2 whitespace-pre-wrap text-xs text-ink-700">{resultado.texto}</pre>
            {resultado.cronograma_propuesto.length > 0 && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-xs">
                  <thead className="border-b border-brand-200 font-semibold text-ink-500">
                    <tr>
                      <th className="py-1 pr-3">ID</th>
                      <th className="py-1 pr-3">Relación</th>
                      <th className="py-1 pr-3">Inicio actual → propuesto</th>
                      <th className="py-1 pr-3">Límite actual → propuesto</th>
                      <th className="py-1">Desplazamiento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.cronograma_propuesto.map((i) => (
                      <tr key={i.codigo} className="border-b border-brand-100 last:border-0">
                        <td className="py-1 pr-3">{i.codigo}</td>
                        <td className="py-1 pr-3">{i.nivel_dependencia === 0 ? "actividad elegida" : i.nivel_dependencia === 1 ? "directa" : `indirecta (nivel ${i.nivel_dependencia})`}</td>
                        <td className="py-1 pr-3">
                          {i.fecha_inicio_actual ?? "—"} → {i.fecha_inicio_propuesta ?? "—"}
                        </td>
                        <td className="py-1 pr-3">
                          {i.fecha_limite_actual ?? "—"} → {i.fecha_limite_propuesta ?? "—"}
                        </td>
                        <td className="py-1">
                          {i.desplazamiento_dias > 0 ? "+" : ""}
                          {i.desplazamiento_dias} d
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-3 text-xs text-ink-500">
              Ninguna fecha fue modificada. Decide esta propuesta en la lista de abajo — si la apruebas, recuerda aplicar el
              cambio de fecha editando la actividad.
            </p>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-brand-100 bg-white p-5">
        <h2 className="font-heading text-lg font-bold text-ink-900">Propuestas registradas</h2>
        {propuestas.length === 0 ? (
          <p className="mt-3 text-sm text-ink-400">Sin propuestas todavía.</p>
        ) : (
          <div className="mt-3 flex flex-col divide-y divide-brand-50">
            {propuestas.map((p) => (
              <div key={p.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-ink-900">{p.actividad_codigo}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ESTADO_ESTILO[p.estado]}`}>{p.estado}</span>
                </div>
                <div className="text-xs text-ink-500">
                  Creada {p.creado_en.replace("T", " ").slice(0, 16)}
                  {p.decidido_por && ` · decidida por ${p.decidido_por}: ${p.comentario_decision || ""}`}
                </div>
                {p.estado === "PENDIENTE DE APROBACIÓN" &&
                  (decidiendo?.id === p.id ? (
                    <DecisionForm
                      session={session}
                      propuesta={p}
                      aprobado={decidiendo.aprobado}
                      onCancelar={() => setDecidiendo(null)}
                      onDecidido={async () => {
                        setDecidiendo(null)
                        await cargar()
                      }}
                    />
                  ) : (
                    <div className="mt-2 flex gap-3 text-xs font-semibold">
                      <span className="rounded-full bg-brand-100 px-3 py-1 text-brand-700">
                        ACCIÓN REQUIERE APROBACIÓN DEL RESPONSABLE DE GESTIÓN DE PROYECTOS
                      </span>
                      <button type="button" onClick={() => setDecidiendo({ id: p.id, aprobado: true })} className="text-emerald-700 hover:underline">
                        Aprobar
                      </button>
                      <button type="button" onClick={() => setDecidiendo({ id: p.id, aprobado: false })} className="text-red-600 hover:underline">
                        Rechazar
                      </button>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function DecisionForm({
  session,
  propuesta,
  aprobado,
  onCancelar,
  onDecidido,
}: {
  session: Session
  propuesta: Propuesta
  aprobado: boolean
  onCancelar: () => void
  onDecidido: () => Promise<void>
}) {
  const [responsable, setResponsable] = useState("")
  const [comentario, setComentario] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setEnviando(true)
    setError(null)
    try {
      await proyectoApi.decidirPropuesta(session.access_token, propuesta.id, aprobado, responsable, comentario)
      await onDecidido()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar la decisión.")
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-xs font-medium text-ink-700">
        Responsable
        <input required value={responsable} onChange={(e) => setResponsable(e.target.value)} className="rounded-lg border border-ink-900/15 px-2 py-1.5 text-xs focus:border-brand-500 focus:outline-none" />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-ink-700">
        Comentario
        <input value={comentario} onChange={(e) => setComentario(e.target.value)} className="rounded-lg border border-ink-900/15 px-2 py-1.5 text-xs focus:border-brand-500 focus:outline-none" />
      </label>
      <button type="submit" disabled={enviando} className="rounded-full bg-ink-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
        {enviando ? "Guardando…" : `Confirmar ${aprobado ? "aprobación" : "rechazo"}`}
      </button>
      <button type="button" onClick={onCancelar} className="text-xs font-semibold text-ink-500 hover:underline">
        Cancelar
      </button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </form>
  )
}

export default PropuestasTab
