import { esUltimaDesparasitacion, estadoProxima, formatoFecha, hoyISO } from "../../lib/carnet"
import type { DewormingKind, PetDeworming } from "../../types/pet"
import { BotonEliminar, Campo, CabeceraSeccion, ChipEstado, FormularioRegistro, INPUT, Vacio, texto } from "./ui"
import { useFormCarnet } from "./useFormCarnet"

const TIPOS: { id: DewormingKind; label: string }[] = [
  { id: "interna", label: "Interna" },
  { id: "externa", label: "Externa" },
]

interface Props {
  petId: string
  registros: PetDeworming[]
  onCambio: () => void
  prefill: Record<string, string> | null
  onPrefillUsado: () => void
}

function CarnetDesparasitaciones({ petId, registros, onCambio, prefill, onPrefillUsado }: Props) {
  const f = useFormCarnet<PetDeworming>("pet_dewormings", onCambio, prefill, onPrefillUsado)
  const ordenados = [...registros].sort((a, b) => (a.applied_on < b.applied_on ? 1 : -1))
  const v = f.editando
    ? { kind: f.editando.kind, product: f.editando.product, applied_on: f.editando.applied_on, next_due_on: f.editando.next_due_on ?? "" }
    : { kind: "interna", product: "", applied_on: hoyISO(), next_due_on: "", ...f.valores }

  function enviar(d: FormData) {
    const aplicada = String(d.get("applied_on"))
    const proxima = texto(d, "next_due_on")
    if (proxima && proxima < aplicada) return f.setError("La próxima fecha no puede ser anterior a la fecha de aplicación.")
    f.guardar({ pet_id: petId, kind: String(d.get("kind")), product: texto(d, "product"), applied_on: aplicada, next_due_on: proxima })
  }

  return (
    <div className="flex flex-col gap-4">
      <CabeceraSeccion onAgregar={() => f.abrir(null)} textoBoton="Registrar desparasitación" oculto={f.abierto} />

      {f.abierto && (
        <FormularioRegistro key={f.clave} onSubmit={enviar} onCancelar={f.cerrar} guardando={f.guardando} error={f.error} textoGuardar={f.editando ? "Guardar cambios" : "Guardar"}>
          <Campo etiqueta="Tipo">
            <select name="kind" defaultValue={v.kind} className={INPUT}>
              {TIPOS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Producto *">
            <input name="product" required maxLength={120} defaultValue={v.product} placeholder="Ej: Pipeta antipulgas" className={INPUT} />
          </Campo>
          <Campo etiqueta="Fecha *">
            <input type="date" name="applied_on" required defaultValue={v.applied_on} className={INPUT} />
          </Campo>
          <Campo etiqueta="Próxima (la indica el veterinario)">
            <input type="date" name="next_due_on" defaultValue={v.next_due_on} className={INPUT} />
          </Campo>
        </FormularioRegistro>
      )}

      {f.errorLista && <p className="text-sm text-red-600">{f.errorLista}</p>}

      {ordenados.length === 0 ? (
        <Vacio>Sin registros de desparasitación.</Vacio>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-brand-100 bg-white">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="border-b border-brand-100 text-xs font-semibold uppercase text-ink-500">
              <tr>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Próxima</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {ordenados.map((x) => {
                const estado = esUltimaDesparasitacion(x, registros) ? estadoProxima(x.next_due_on) : null
                return (
                  <tr key={x.id} className="border-b border-brand-50 last:border-0">
                    <td className="px-4 py-3 capitalize text-ink-700">{x.kind}</td>
                    <td className="px-4 py-3 font-medium text-ink-900">{x.product}</td>
                    <td className="px-4 py-3 text-ink-700">{formatoFecha(x.applied_on)}</td>
                    <td className="px-4 py-3 text-ink-700">{formatoFecha(x.next_due_on)}</td>
                    <td className="px-4 py-3">
                      {estado ? <ChipEstado estado={estado.estado} texto={estado.texto} /> : <ChipEstado estado="anterior" texto="Dosis anterior" />}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-4">
                        <button type="button" onClick={() => f.abrir(x)} className="font-semibold text-brand-700 hover:underline">
                          Editar
                        </button>
                        <BotonEliminar onConfirmar={() => f.eliminar(x.id)} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default CarnetDesparasitaciones
