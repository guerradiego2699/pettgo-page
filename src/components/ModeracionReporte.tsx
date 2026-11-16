import { useEffect, useRef, useState, type ReactNode } from "react"
import { supabase } from "../lib/supabase"

interface Evaluacion {
  body: string
  recomendacion: string
  confianza: string
  categorias: string[]
  razones: string[]
}

type Estado =
  | { tipo: "pendiente" }
  | { tipo: "evaluado"; resultado: Evaluacion }
  | { tipo: "desactualizado" }
  | { tipo: "error"; mensaje: string }

export default function ModeracionReporte({
  reportId,
  body,
  onActualizar,
  children,
}: { reportId: string; body?: string; onActualizar: () => void; children: ReactNode }) {
  const panel = useRef<HTMLElement>(null)
  const [estado, setEstado] = useState<Estado>({ tipo: "pendiente" })
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    const element = panel.current
    if (body === undefined || !element) return
    const controller = new AbortController()
    const { signal } = controller

    async function evaluar() {
      try {
        const { data } = await supabase.auth.getSession()
        if (signal.aborted) return
        if (!data.session) throw new Error("Vuelve a iniciar sesión.")
        const response = await fetch("/api/admin/moderar-reporte", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reportId }),
          signal,
        })
        const result = await response.json()
        if (signal.aborted) return
        if (response.status === 409 || (response.ok && result.body !== body)) {
          setEstado({ tipo: "desactualizado" })
          return
        }
        if (!response.ok) throw new Error(result.error)
        setEstado({ tipo: "evaluado", resultado: result })
      } catch (err) {
        if (signal.aborted) return
        const mensaje = err instanceof Error && err.message ? err.message : "No se pudo evaluar el contenido."
        setEstado({ tipo: "error", mensaje })
      }
    }

    const observer = new IntersectionObserver((entries) => {
      if (signal.aborted || !entries.some((entry) => entry.isIntersecting)) return
      observer.disconnect()
      void evaluar()
    })
    observer.observe(element)

    return () => {
      observer.disconnect()
      controller.abort()
    }
  }, [reportId, body, intento])

  function reintentar() {
    setEstado({ tipo: "pendiente" })
    setIntento((actual) => actual + 1)
  }

  return (
    <>
      {body !== undefined && (
        <section ref={panel} className="mt-4 rounded-xl border border-ink-900/10 bg-cream-50 p-4 text-sm">
          <h2 className="font-semibold text-ink-900">Evaluación con IA</h2>
          <div aria-live="polite" className="mt-2 text-ink-700">
            {estado.tipo === "pendiente" && <p>Evaluando contenido…</p>}
            {estado.tipo === "error" && <p>{estado.mensaje} Puedes decidir tras una revisión manual.</p>}
            {estado.tipo === "desactualizado" && <p>El contenido cambió. Actualiza el reporte para evaluar la versión actual.</p>}
            {estado.tipo === "evaluado" && (
              <>
                <p><strong>Recomendación:</strong> <span className="capitalize">{estado.resultado.recomendacion}</span></p>
                <p><strong>Confianza:</strong> {estado.resultado.confianza}</p>
                <p><strong>Categorías:</strong> {estado.resultado.categorias.map((category) => category.replaceAll("_", " ")).join(", ") || "Ninguna"}</p>
                <p className="mt-2 font-semibold">Razones</p>
                <ul className="ml-5 list-disc">
                  {estado.resultado.razones.map((razon, index) => <li key={index}>{razon}</li>)}
                </ul>
              </>
            )}
          </div>
          {estado.tipo === "error" && (
            <button type="button" onClick={reintentar} className="mt-2 font-semibold text-brand-700 hover:underline">
              Reintentar evaluación
            </button>
          )}
          {estado.tipo === "desactualizado" && (
            <button type="button" onClick={onActualizar} className="mt-2 font-semibold text-brand-700 hover:underline">
              Actualizar reporte
            </button>
          )}
        </section>
      )}
      <fieldset disabled={body !== undefined && (estado.tipo === "pendiente" || estado.tipo === "desactualizado")}
        className="mt-4 flex min-w-0 flex-wrap gap-4 text-sm font-semibold">
        {children}
      </fieldset>
    </>
  )
}
