import { formatoFecha, hoyISO } from "../../lib/carnet"
import type { HealthEventKind, PetHealthEvent } from "../../types/pet"
import { BotonEliminar, Campo, CabeceraSeccion, FormularioRegistro, INPUT, Vacio, texto } from "./ui"
import { useFormCarnet } from "./useFormCarnet"

const TIPOS: { id: HealthEventKind; label: string }[] = [
  { id: "consulta", label: "Consulta" },
  { id: "diagnostico", label: "Diagnóstico" },
  { id: "tratamiento", label: "Tratamiento" },
  { id: "examen", label: "Examen" },
  { id: "cirugia", label: "Cirugía" },
]
const ETIQUETA = Object.fromEntries(TIPOS.map((t) => [t.id, t.label])) as Record<HealthEventKind, string>

interface Props {
  petId: string
  eventos: PetHealthEvent[]
  onCambio: () => void
}

function CarnetHistorial({ petId, eventos, onCambio }: Props) {
  const f = useFormCarnet<PetHealthEvent>("pet_health_events", onCambio, null, () => {})
  const ordenados = [...eventos].sort((a, b) => (a.occurred_on < b.occurred_on ? 1 : -1))
  const v = f.editando
    ? { occurred_on: f.editando.occurred_on, kind: f.editando.kind, title: f.editando.title, vet_name: f.editando.vet_name ?? "", detail: f.editando.detail ?? "" }
    : { occurred_on: hoyISO(), kind: "consulta", title: "", vet_name: "", detail: "" }

  function enviar(d: FormData) {
    f.guardar({
      pet_id: petId,
      occurred_on: String(d.get("occurred_on")),
      kind: String(d.get("kind")),
      title: texto(d, "title"),
      vet_name: texto(d, "vet_name"),
      detail: texto(d, "detail"),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <CabeceraSeccion onAgregar={() => f.abrir(null)} textoBoton="Agregar evento" oculto={f.abierto} />

      {f.abierto && (
        <FormularioRegistro key={f.clave} onSubmit={enviar} onCancelar={f.cerrar} guardando={f.guardando} error={f.error} textoGuardar={f.editando ? "Guardar cambios" : "Guardar"}>
          <Campo etiqueta="Fecha *">
            <input type="date" name="occurred_on" required defaultValue={v.occurred_on} className={INPUT} />
          </Campo>
          <Campo etiqueta="Tipo">
            <select name="kind" defaultValue={v.kind} className={INPUT}>
              {TIPOS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Motivo o título *">
            <input name="title" required maxLength={120} defaultValue={v.title} className={INPUT} />
          </Campo>
          <Campo etiqueta="Veterinario/a">
            <input name="vet_name" maxLength={120} defaultValue={v.vet_name} className={INPUT} />
          </Campo>
          <Campo etiqueta="Detalle" completo>
            <textarea name="detail" rows={3} maxLength={2000} defaultValue={v.detail} placeholder="Indicaciones, medicamentos, observaciones" className={INPUT} />
          </Campo>
        </FormularioRegistro>
      )}

      {f.errorLista && <p className="text-sm text-red-600">{f.errorLista}</p>}

      {ordenados.length === 0 ? (
        <Vacio>El historial está vacío. Agrega consultas, diagnósticos, exámenes o cirugías.</Vacio>
      ) : (
        <ol className="flex flex-col gap-4 border-l-2 border-brand-200 pl-5">
          {ordenados.map((x) => (
            <li key={x.id} className="relative rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
              <span className="absolute -left-[27px] top-5 h-3 w-3 rounded-full border-2 border-brand-500 bg-white" aria-hidden="true" />
              <p className="text-xs text-ink-500">
                <span className="font-semibold">{formatoFecha(x.occurred_on)}</span> · {ETIQUETA[x.kind]}
                {x.vet_name ? ` · ${x.vet_name}` : ""}
              </p>
              <h3 className="mt-1 font-heading text-base font-bold text-ink-900">{x.title}</h3>
              {x.detail && <p className="mt-1 whitespace-pre-wrap text-sm text-ink-700">{x.detail}</p>}
              <div className="mt-3 flex items-center gap-4">
                <button type="button" onClick={() => f.abrir(x)} className="text-sm font-semibold text-brand-700 hover:underline">
                  Editar
                </button>
                <BotonEliminar onConfirmar={() => f.eliminar(x.id)} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export default CarnetHistorial
