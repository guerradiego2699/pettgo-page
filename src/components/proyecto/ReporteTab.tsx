import { useState } from "react"
import type { Session } from "@supabase/supabase-js"
import { generarTextoReporteGeneral, generarResumenReunion } from "../../lib/proyectoAnalisis"
import type { AnalisisProyecto } from "../../types/proyecto"

interface Props {
  session: Session
  analisis: AnalisisProyecto
  onGenerado: () => void
}

function descargarTxt(nombre: string, contenido: string) {
  const blob = new Blob([contenido], { type: "text/plain;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}

function ReporteTab({ analisis, onGenerado }: Props) {
  const [texto, setTexto] = useState<string | null>(null)
  const [estado, setEstado] = useState<string | null>(null)

  function generarGeneral() {
    setEstado("Generando reporte…")
    const t = generarTextoReporteGeneral(analisis)
    setTexto(t)
    setEstado("Reporte generado y registrado en auditoría.")
    onGenerado()
  }

  function generarReunion() {
    setTexto(generarResumenReunion(analisis))
    setEstado(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-brand-100 bg-white p-5">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={generarGeneral}
            className="rounded-full bg-gradient-to-br from-brand-400 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:shadow-lg"
          >
            Generar reporte general
          </button>
          <button
            type="button"
            onClick={generarReunion}
            className="rounded-full border border-ink-900/15 px-5 py-2.5 text-sm font-medium text-ink-600 hover:bg-brand-50"
          >
            Resumen para reunión
          </button>
          {estado && <span className="text-xs text-ink-500">{estado}</span>}
        </div>

        {texto && (
          <>
            <pre className="mt-4 max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-xl bg-brand-50 p-4 font-mono text-xs leading-relaxed text-ink-800">
              {texto}
            </pre>
            <button
              type="button"
              onClick={() => descargarTxt(`reporte-proyecto-pettgo-${new Date().toISOString().slice(0, 10)}.txt`, texto)}
              className="mt-3 text-sm font-semibold text-brand-700 hover:underline"
            >
              Descargar como .txt
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default ReporteTab
