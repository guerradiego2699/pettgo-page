import { useEffect, useState } from "react"
import type { Session } from "@supabase/supabase-js"
import { proyectoApi } from "../../lib/proyectoApi"
import type { EntradaAuditoria } from "../../types/proyecto"

function AuditoriaTab({ session }: { session: Session }) {
  const [entradas, setEntradas] = useState<EntradaAuditoria[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function cargar() {
    setCargando(true)
    setError(null)
    try {
      setEntradas(await proyectoApi.listarAuditoria(session.access_token))
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la auditoría.")
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <div>
        <button type="button" onClick={cargar} className="rounded-full border border-ink-900/15 px-4 py-2 text-sm font-medium text-ink-600 hover:bg-brand-50">
          Actualizar
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="overflow-x-auto rounded-2xl border border-brand-100 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-brand-100 text-xs font-semibold uppercase text-ink-400">
            <tr>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Tipo de análisis</th>
              <th className="px-3 py-2">Origen</th>
              <th className="px-3 py-2">Actividad</th>
              <th className="px-3 py-2">Recomendación / acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-ink-400">
                  Cargando…
                </td>
              </tr>
            ) : entradas.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-ink-400">
                  Sin registros todavía.
                </td>
              </tr>
            ) : (
              entradas.map((e) => (
                <tr key={e.id} className="border-b border-brand-50 last:border-0">
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-ink-500">{e.fecha.replace("T", " ").slice(0, 19)}</td>
                  <td className="px-3 py-2 text-ink-700">{e.tipo_analisis}</td>
                  <td className="px-3 py-2 text-ink-500">{e.origen}</td>
                  <td className="px-3 py-2 text-ink-500">{e.actividad || "—"}</td>
                  <td className="px-3 py-2 text-xs text-ink-500">{e.recomendacion || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AuditoriaTab
