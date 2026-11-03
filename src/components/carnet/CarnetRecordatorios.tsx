import { estadoProxima, formatoFecha, type Recordatorio } from "../../lib/carnet"
import { BTN_PRIMARIO, BTN_SECUNDARIO, ChipEstado } from "./ui"

interface Props {
  lista: Recordatorio[]
  onRegistrar: (r: Recordatorio) => void
  onVer: (r: Recordatorio) => void
}

function CarnetRecordatorios({ lista, onRegistrar, onVer }: Props) {
  return (
    <section>
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="font-heading text-lg font-bold text-ink-900">Recordatorios</h2>
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">Vencidos y próximos 60 días</span>
      </div>

      {lista.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-brand-200 bg-white px-5 py-6 text-center text-sm text-ink-500">
          Todo al día. No hay dosis vencidas ni próximas en los siguientes 60 días.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {lista.map((r) => {
            const estado = estadoProxima(r.fecha)
            return (
              <li key={`${r.tipo}-${r.id}`} className="flex flex-wrap items-center gap-3 rounded-2xl border border-brand-100 bg-white px-4 py-3 shadow-sm">
                <ChipEstado estado={estado.estado} texto={estado.texto} />
                <strong className="text-sm text-ink-900">{r.titulo}</strong>
                <span className="text-sm text-ink-500">{formatoFecha(r.fecha)}</span>
                <span className="ml-auto flex gap-2">
                  <button type="button" onClick={() => onRegistrar(r)} className={`${BTN_PRIMARIO} !px-3 !py-1.5 text-xs`}>
                    Registrar dosis
                  </button>
                  <button type="button" onClick={() => onVer(r)} className={`${BTN_SECUNDARIO} !px-3 !py-1.5 text-xs`}>
                    Ver registro
                  </button>
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default CarnetRecordatorios
