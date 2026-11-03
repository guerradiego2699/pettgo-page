import { esUltimaVacuna, estadoProxima, formatoFecha, hoyISO } from "../../lib/carnet"
import type { PetSpecies, PetVaccine } from "../../types/pet"
import { BotonEliminar, Campo, CabeceraSeccion, ChipEstado, FormularioRegistro, INPUT, Vacio, texto } from "./ui"
import { useFormCarnet } from "./useFormCarnet"

const SUGERENCIAS: Record<PetSpecies, string[]> = {
  perro: ["Antirrábica", "Óctuple", "Séxtuple", "KC (tos de las perreras)", "Parvovirus"],
  gato: ["Triple felina", "Antirrábica", "Leucemia felina"],
}

interface Props {
  petId: string
  especie: PetSpecies
  vacunas: PetVaccine[]
  onCambio: () => void
  prefill: Record<string, string> | null
  onPrefillUsado: () => void
}

function CarnetVacunas({ petId, especie, vacunas, onCambio, prefill, onPrefillUsado }: Props) {
  const f = useFormCarnet<PetVaccine>("pet_vaccines", onCambio, prefill, onPrefillUsado)
  const ordenadas = [...vacunas].sort((a, b) => (a.applied_on < b.applied_on ? 1 : -1))
  const v = f.editando
    ? { name: f.editando.name, applied_on: f.editando.applied_on, next_due_on: f.editando.next_due_on ?? "", vet_name: f.editando.vet_name ?? "", batch: f.editando.batch ?? "" }
    : { name: "", applied_on: hoyISO(), next_due_on: "", vet_name: "", batch: "", ...f.valores }

  function enviar(d: FormData) {
    const aplicada = String(d.get("applied_on"))
    const proxima = texto(d, "next_due_on")
    if (proxima && proxima < aplicada) return f.setError("La próxima dosis no puede ser anterior a la fecha de aplicación.")
    f.guardar({ pet_id: petId, name: texto(d, "name"), applied_on: aplicada, next_due_on: proxima, vet_name: texto(d, "vet_name"), batch: texto(d, "batch") })
  }

  return (
    <div className="flex flex-col gap-4">
      <CabeceraSeccion onAgregar={() => f.abrir(null)} textoBoton="Registrar vacuna" oculto={f.abierto} />

      {f.abierto && (
        <FormularioRegistro key={f.clave} onSubmit={enviar} onCancelar={f.cerrar} guardando={f.guardando} error={f.error} textoGuardar={f.editando ? "Guardar cambios" : "Guardar"}>
          <Campo etiqueta="Vacuna *">
            <input name="name" required maxLength={80} list="sugerencias-vacunas" defaultValue={v.name} placeholder="Ej: Antirrábica" className={INPUT} />
            <datalist id="sugerencias-vacunas">
              {SUGERENCIAS[especie].map((o) => (
                <option key={o} value={o} />
              ))}
            </datalist>
          </Campo>
          <Campo etiqueta="Fecha de aplicación *">
            <input type="date" name="applied_on" required defaultValue={v.applied_on} className={INPUT} />
          </Campo>
          <Campo etiqueta="Próxima dosis (la indica el veterinario)">
            <input type="date" name="next_due_on" defaultValue={v.next_due_on} className={INPUT} />
          </Campo>
          <Campo etiqueta="Veterinario/a">
            <input name="vet_name" maxLength={120} defaultValue={v.vet_name} className={INPUT} />
          </Campo>
          <Campo etiqueta="N° de lote (etiqueta de la vacuna)">
            <input name="batch" maxLength={60} defaultValue={v.batch} className={INPUT} />
          </Campo>
        </FormularioRegistro>
      )}

      {f.errorLista && <p className="text-sm text-red-600">{f.errorLista}</p>}

      {ordenadas.length === 0 ? (
        <Vacio>Aún no hay vacunas registradas. Usa «Registrar vacuna» para agregar la primera.</Vacio>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {ordenadas.map((x) => {
            const estado = esUltimaVacuna(x, vacunas) ? estadoProxima(x.next_due_on) : null
            return (
              <article key={x.id} className="rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-heading text-base font-bold text-ink-900">{x.name}</h3>
                  {estado ? <ChipEstado estado={estado.estado} texto={estado.texto} /> : <ChipEstado estado="anterior" texto="Dosis anterior" />}
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <dt className="text-xs text-ink-500">Aplicada</dt>
                    <dd className="font-semibold text-ink-900">{formatoFecha(x.applied_on)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-500">Próxima</dt>
                    <dd className="font-semibold text-ink-900">{formatoFecha(x.next_due_on)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-500">Lote</dt>
                    <dd className="font-semibold text-ink-900">{x.batch || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-500">Veterinario/a</dt>
                    <dd className="font-semibold text-ink-900">{x.vet_name || "—"}</dd>
                  </div>
                </dl>
                <div className="mt-3 flex items-center justify-end gap-4">
                  <button type="button" onClick={() => f.abrir(x)} className="text-sm font-semibold text-brand-700 hover:underline">
                    Editar
                  </button>
                  <BotonEliminar onConfirmar={() => f.eliminar(x.id)} />
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default CarnetVacunas
