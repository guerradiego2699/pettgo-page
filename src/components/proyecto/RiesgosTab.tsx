import { RIESGO_ESTILO, PRIORIDAD_ESTILO } from "../../lib/proyectoEstilos"
import type { AnalisisProyecto } from "../../types/proyecto"

function RiesgosTab({ analisis }: { analisis: AnalisisProyecto }) {
  const porNivel = { Bajo: 0, Medio: 0, Alto: 0, Crítico: 0 }
  const porCategoria = new Map<string, number>()
  for (const a of analisis.actividades) {
    porNivel[a.riesgo_calculado]++
    if (a.riesgo_calculado === "Alto" || a.riesgo_calculado === "Crítico") {
      for (const f of a.factores_riesgo) {
        porCategoria.set(f.regla, (porCategoria.get(f.regla) ?? 0) + 1)
      }
    }
  }
  const principales = [...analisis.actividades].sort((a, b) => b.puntaje_riesgo - a.puntaje_riesgo).slice(0, 12)
  const prioridades = [...analisis.actividades].sort((a, b) => b.puntaje_riesgo - a.puntaje_riesgo)

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-brand-100 bg-white p-5">
          <h2 className="font-heading text-lg font-bold text-ink-900">Riesgos por nivel</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(porNivel).map(([nivel, cantidad]) => (
              <div key={nivel} className={`rounded-xl p-3 text-center ${RIESGO_ESTILO[nivel]}`}>
                <div className="text-2xl font-bold">{cantidad}</div>
                <div className="text-xs font-semibold">{nivel}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-brand-100 bg-white p-5">
          <h2 className="font-heading text-lg font-bold text-ink-900">Riesgos altos/críticos por categoría</h2>
          {porCategoria.size === 0 ? (
            <p className="mt-3 text-sm text-ink-400">Sin riesgos altos o críticos.</p>
          ) : (
            <div className="mt-3 flex flex-col divide-y divide-brand-50">
              {[...porCategoria.entries()].map(([cat, n]) => (
                <div key={cat} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-ink-700">{cat}</span>
                  <strong className="text-ink-900">{n}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-brand-100 bg-white p-5">
        <h2 className="font-heading text-lg font-bold text-ink-900">Riesgos principales</h2>
        {principales.length === 0 ? (
          <p className="mt-3 text-sm text-ink-400">Sin actividades registradas.</p>
        ) : (
          <div className="mt-3 flex flex-col divide-y divide-brand-50">
            {principales.map((a) => (
              <div key={a.codigo} className="py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-ink-900">
                    {a.codigo} · {a.actividad}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${RIESGO_ESTILO[a.riesgo_calculado]}`}>{a.riesgo_calculado}</span>
                    <span className="text-xs text-ink-400">{a.puntaje_riesgo} pts</span>
                  </span>
                </div>
                <div className="text-xs text-ink-500">
                  {a.area} · Factores: {a.factores_riesgo.map((f) => f.regla).join(", ") || "—"}
                  {a.discrepancia_con_declarado && <span className="text-red-600"> · declarado «{a.riesgo}» (discrepancia)</span>}
                </div>
                {a.factores_riesgo.length > 0 && (
                  <div className="mt-1 text-xs text-ink-600">
                    {a.factores_riesgo.map((f) => `${f.regla}: ${f.detalle} (+${f.puntos})`).join(" · ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-brand-100 bg-white p-5">
        <h2 className="font-heading text-lg font-bold text-ink-900">Priorización sugerida</h2>
        <p className="text-xs text-ink-500">
          La prioridad oficial solo puede cambiarla el responsable — cambiarla en "Editar" requiere aprobación.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="border-b border-brand-100 text-xs font-semibold uppercase text-ink-400">
              <tr>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Actividad</th>
                <th className="px-3 py-2">Oficial</th>
                <th className="px-3 py-2">Sugerida</th>
                <th className="px-3 py-2 text-right">Pts</th>
                <th className="px-3 py-2">Explicación</th>
              </tr>
            </thead>
            <tbody>
              {prioridades.map((a) => (
                <tr key={a.codigo} className="border-b border-brand-50 last:border-0">
                  <td className="px-3 py-2 font-semibold text-ink-900">{a.codigo}</td>
                  <td className="px-3 py-2 text-ink-700">{a.actividad}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORIDAD_ESTILO[a.prioridad]}`}>{a.prioridad}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORIDAD_ESTILO[a.prioridad_sugerida]}`}>{a.prioridad_sugerida}</span>
                  </td>
                  <td className="px-3 py-2 text-right">{a.puntaje_riesgo}</td>
                  <td className="px-3 py-2 text-xs text-ink-500">{a.explicacion_prioridad}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default RiesgosTab
