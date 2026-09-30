import { useState } from "react"
import { NIVEL_ALERTA_ESTILO } from "../../lib/proyectoEstilos"
import type { AnalisisProyecto, Alerta } from "../../types/proyecto"

function AlertaCard({ a }: { a: Alerta }) {
  return (
    <div className={`rounded-xl p-4 text-sm ${NIVEL_ALERTA_ESTILO[a.nivel]}`}>
      <h3 className="text-xs font-bold uppercase tracking-wide text-ink-700">
        ALERTA · {a.nivel} · {a.tipo}
      </h3>
      <dl className="mt-2 grid grid-cols-[130px_1fr] gap-x-2 gap-y-1 text-xs text-ink-700">
        <dt className="font-semibold text-ink-500">Área</dt>
        <dd>{a.area}</dd>
        <dt className="font-semibold text-ink-500">Actividad</dt>
        <dd>{a.actividad}</dd>
        <dt className="font-semibold text-ink-500">Problema</dt>
        <dd>{a.problema}</dd>
        <dt className="font-semibold text-ink-500">Impacto</dt>
        <dd>{a.impacto}</dd>
        <dt className="font-semibold text-ink-500">Relacionadas</dt>
        <dd>{a.actividades_relacionadas.join(", ") || "Ninguna"}</dd>
        <dt className="font-semibold text-ink-500">Fecha límite</dt>
        <dd>{a.fecha_limite || "—"}</dd>
        <dt className="font-semibold text-ink-500">Acción recomendada</dt>
        <dd>{a.accion_recomendada}</dd>
      </dl>
      {a.requiere_aprobacion && (
        <span className="mt-2 inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-700">
          ACCIÓN REQUIERE APROBACIÓN DEL RESPONSABLE DE GESTIÓN DE PROYECTOS
        </span>
      )}
    </div>
  )
}

function AlertasTab({ analisis }: { analisis: AnalisisProyecto }) {
  const [nivel, setNivel] = useState("")
  const filtradas = nivel ? analisis.alertas.filter((a) => a.nivel === nivel) : analisis.alertas

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <select value={nivel} onChange={(e) => setNivel(e.target.value)} className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none">
          <option value="">Todos los niveles</option>
          <option>CRÍTICO</option>
          <option>ALTO</option>
          <option>MEDIO</option>
          <option>BAJO</option>
        </select>
        <span className="text-sm text-ink-500">{filtradas.length} alerta(s)</span>
      </div>
      {filtradas.length === 0 ? (
        <p className="text-sm text-ink-400">Sin alertas con ese filtro.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtradas.map((a, i) => (
            <AlertaCard key={i} a={a} />
          ))}
        </div>
      )}
    </div>
  )
}

export default AlertasTab
