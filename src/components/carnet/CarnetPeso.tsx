import { aFecha, formatoFecha, hoyISO } from "../../lib/carnet"
import type { PetWeight } from "../../types/pet"
import { BotonEliminar, Campo, CabeceraSeccion, FormularioRegistro, INPUT, Vacio } from "./ui"
import { useFormCarnet } from "./useFormCarnet"

interface Props {
  petId: string
  pesos: PetWeight[]
  onCambio: () => void
}

function GraficoPeso({ pesos }: { pesos: PetWeight[] }) {
  const W = 640
  const H = 200
  const pl = 44
  const pr = 16
  const pt = 26
  const pb = 30
  const ts = pesos.map((p) => aFecha(p.measured_on).getTime())
  const ks = pesos.map((p) => p.kg)
  const holgura = Math.max(0.3, (Math.max(...ks) - Math.min(...ks)) * 0.25)
  const lo = Math.max(0, Math.min(...ks) - holgura)
  const hi = Math.max(...ks) + holgura
  const t0 = ts[0]
  const t1 = ts[ts.length - 1]
  const X = (t: number) => pl + ((t - t0) / (t1 - t0 || 1)) * (W - pl - pr)
  const Y = (k: number) => pt + ((hi - k) / (hi - lo)) * (H - pt - pb)
  const puntos = pesos.map((p, i) => [X(ts[i]), Y(p.kg)])
  const linea = puntos.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ")
  const area = `${linea} L${puntos[puntos.length - 1][0]} ${H - pb} L${puntos[0][0]} ${H - pb} Z`
  const marcas = [0, 1, 2, 3].map((i) => lo + ((hi - lo) * i) / 3)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Evolución del peso" className="w-full">
      {marcas.map((k) => (
        <g key={k}>
          <line x1={pl} x2={W - pr} y1={Y(k)} y2={Y(k)} stroke="#f0ded0" strokeWidth="1" />
          <text x={pl - 8} y={Y(k) + 4} textAnchor="end" fontSize="11" fill="#8c5a4a">
            {k.toFixed(1)}
          </text>
        </g>
      ))}
      <path d={area} fill="#e08a3f" fillOpacity=".12" />
      <path d={linea} fill="none" stroke="#e08a3f" strokeWidth="2.5" strokeLinejoin="round" />
      {puntos.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={i === puntos.length - 1 ? 5 : 3} fill={i === puntos.length - 1 ? "#e08a3f" : "#ffffff"} stroke="#e08a3f" strokeWidth="2" />
      ))}
      <text x={pl} y={H - 8} fontSize="11" fill="#8c5a4a">
        {formatoFecha(pesos[0].measured_on)}
      </text>
      <text x={W - pr} y={H - 8} textAnchor="end" fontSize="11" fill="#8c5a4a">
        {formatoFecha(pesos[pesos.length - 1].measured_on)}
      </text>
      <text x={pl - 8} y={pt - 14} textAnchor="end" fontSize="10" fill="#8c5a4a">
        kg
      </text>
    </svg>
  )
}

function CarnetPeso({ petId, pesos, onCambio }: Props) {
  const f = useFormCarnet<PetWeight>("pet_weights", onCambio, null, () => {})
  const cronologico = [...pesos].sort((a, b) => (a.measured_on < b.measured_on ? -1 : 1))
  const recientes = [...cronologico].reverse()

  function enviar(d: FormData) {
    const kg = Number(String(d.get("kg")).replace(",", "."))
    if (!(kg > 0) || kg >= 200) return f.setError("Ingresa un peso válido, en kilos.")
    // Registrar otro peso el mismo día reemplaza al anterior (lo resuelve la base).
    f.guardar({ pet_id: petId, measured_on: String(d.get("measured_on")), kg: Math.round(kg * 10) / 10 })
  }

  return (
    <div className="flex flex-col gap-4">
      <CabeceraSeccion onAgregar={() => f.abrir(null)} textoBoton="Registrar peso" oculto={f.abierto} />

      {f.abierto && (
        <FormularioRegistro key={f.clave} onSubmit={enviar} onCancelar={f.cerrar} guardando={f.guardando} error={f.error} textoGuardar="Guardar">
          <Campo etiqueta="Fecha *">
            <input type="date" name="measured_on" required defaultValue={hoyISO()} className={INPUT} />
          </Campo>
          <Campo etiqueta="Peso (kg) *">
            <input type="number" name="kg" required step="0.1" min="0.1" max="199" inputMode="decimal" className={INPUT} />
          </Campo>
        </FormularioRegistro>
      )}

      {f.errorLista && <p className="text-sm text-red-600">{f.errorLista}</p>}

      {cronologico.length === 0 ? (
        <Vacio>Sin registros de peso.</Vacio>
      ) : (
        <>
          {cronologico.length > 1 && <div className="rounded-2xl border border-brand-100 bg-white p-3">{<GraficoPeso pesos={cronologico} />}</div>}
          <div className="overflow-x-auto rounded-2xl border border-brand-100 bg-white">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="border-b border-brand-100 text-xs font-semibold uppercase text-ink-500">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Peso</th>
                  <th className="px-4 py-3">Cambio</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {recientes.map((x, i) => {
                  const anterior = recientes[i + 1]
                  const cambio = anterior ? x.kg - anterior.kg : null
                  return (
                    <tr key={x.id} className="border-b border-brand-50 last:border-0">
                      <td className="px-4 py-3 text-ink-700">{formatoFecha(x.measured_on)}</td>
                      <td className="px-4 py-3 font-semibold text-ink-900">{Number(x.kg).toFixed(1)} kg</td>
                      <td className="px-4 py-3 text-ink-700">{cambio === null ? "—" : `${cambio >= 0 ? "+" : ""}${cambio.toFixed(1)} kg`}</td>
                      <td className="px-4 py-3 text-right">
                        <BotonEliminar onConfirmar={() => f.eliminar(x.id)} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

export default CarnetPeso
