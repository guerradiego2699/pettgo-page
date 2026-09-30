import { useEffect, useState, type FormEvent } from "react"
import type { Session } from "@supabase/supabase-js"
import { proyectoApi } from "../../lib/proyectoApi"
import { AGENTES_AREA } from "../../types/proyecto"
import type { ReporteArea } from "../../types/proyecto"

function AreasTab({ session }: { session: Session }) {
  const [reportes, setReportes] = useState<ReporteArea[]>([])
  const [agentesSinReporte, setAgentesSinReporte] = useState<string[]>([])
  const [form, setForm] = useState({ agente: AGENTES_AREA[0] as string, actividad: "", actividad_codigo: "", avance: "", riesgo: "Bajo", mensaje: "" })
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function cargar() {
    try {
      const res = await proyectoApi.listarReportesArea(session.access_token)
      setReportes(res.reportes)
      setAgentesSinReporte(res.agentes_sin_reporte)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los reportes.")
    }
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setEnviando(true)
    setError(null)
    try {
      await proyectoApi.crearReporteArea(session.access_token, {
        ...form,
        avance: form.avance ? Number(form.avance) : null,
        actividad_codigo: form.actividad_codigo || null,
      })
      setForm({ agente: AGENTES_AREA[0], actividad: "", actividad_codigo: "", avance: "", riesgo: "Bajo", mensaje: "" })
      await cargar()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el reporte.")
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-brand-100 bg-white p-5">
          <h2 className="font-heading text-lg font-bold text-ink-900">Agentes de área</h2>
          <div className="mt-3 flex flex-col divide-y divide-brand-50">
            {AGENTES_AREA.map((a) => (
              <div key={a} className="flex items-center justify-between py-2 text-sm">
                <span className="text-ink-700">Agente {a}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${agentesSinReporte.includes(a) ? "bg-ink-100 text-ink-500" : "bg-emerald-100 text-emerald-700"}`}>
                  {agentesSinReporte.includes(a) ? "Sin reportar" : "Activo"}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-ink-400">
            Cada agente registra su avance con el formulario de al lado; esta pestaña consolida y contrasta contra lo cargado
            en Actividades.
          </p>
        </div>

        <div className="rounded-2xl border border-brand-100 bg-white p-5">
          <h2 className="font-heading text-lg font-bold text-ink-900">Registrar reporte de un área</h2>
          <form onSubmit={handleSubmit} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
              Agente
              <select value={form.agente} onChange={(e) => setForm({ ...form, agente: e.target.value })} className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none">
                {AGENTES_AREA.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
              ID relacionado
              <input value={form.actividad_codigo} onChange={(e) => setForm({ ...form, actividad_codigo: e.target.value })} placeholder="PET-XX" className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink-700 sm:col-span-2">
              Actividad *
              <input required value={form.actividad} onChange={(e) => setForm({ ...form, actividad: e.target.value })} className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
              Avance %
              <input type="number" min={0} max={100} value={form.avance} onChange={(e) => setForm({ ...form, avance: e.target.value })} className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
              Riesgo
              <select value={form.riesgo} onChange={(e) => setForm({ ...form, riesgo: e.target.value })} className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none">
                <option>Bajo</option>
                <option>Medio</option>
                <option>Alto</option>
                <option>Crítico</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink-700 sm:col-span-2">
              Mensaje *
              <input required value={form.mensaje} onChange={(e) => setForm({ ...form, mensaje: e.target.value })} className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
            </label>
            {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
            <button
              type="submit"
              disabled={enviando}
              className="rounded-full bg-gradient-to-br from-brand-400 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:shadow-lg disabled:opacity-60 sm:col-span-2"
            >
              {enviando ? "Enviando…" : "Enviar reporte"}
            </button>
          </form>
        </div>
      </div>

      <div className="rounded-2xl border border-brand-100 bg-white p-5">
        <h2 className="font-heading text-lg font-bold text-ink-900">Información consolidada de las áreas</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-brand-100 text-xs font-semibold uppercase text-ink-400">
              <tr>
                <th className="px-3 py-2">Agente</th>
                <th className="px-3 py-2">Actividad</th>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2 text-right">Avance reportado</th>
                <th className="px-3 py-2 text-right">Avance registrado</th>
                <th className="px-3 py-2 text-right">Diferencia</th>
                <th className="px-3 py-2">Riesgo</th>
                <th className="px-3 py-2">Mensaje</th>
              </tr>
            </thead>
            <tbody>
              {reportes.map((r) => (
                <tr key={r.id} className="border-b border-brand-50 last:border-0">
                  <td className="px-3 py-2 font-semibold text-ink-900">{r.agente}</td>
                  <td className="px-3 py-2 text-ink-700">{r.actividad}</td>
                  <td className="px-3 py-2 text-ink-500">{r.actividad_codigo || "—"}</td>
                  <td className="px-3 py-2 text-right">{r.avance ?? "—"}%</td>
                  <td className="px-3 py-2 text-right">{r.avance_registrado ?? "—"}%</td>
                  <td className="px-3 py-2 text-right">
                    {r.diferencia == null ? (
                      "—"
                    ) : Math.abs(r.diferencia) >= 15 ? (
                      <span className="font-semibold text-red-600">
                        {r.diferencia > 0 ? "+" : ""}
                        {r.diferencia} pp ⚠
                      </span>
                    ) : (
                      `${r.diferencia} pp`
                    )}
                  </td>
                  <td className="px-3 py-2 text-ink-500">{r.riesgo || "—"}</td>
                  <td className="px-3 py-2 text-xs text-ink-500">{r.mensaje}</td>
                </tr>
              ))}
              {reportes.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-ink-400">
                    Sin reportes todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ink-400">Diferencias de 15 puntos porcentuales o más se marcan como información contradictoria.</p>
      </div>
    </div>
  )
}

export default AreasTab
