import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "react-router-dom"

type Respuesta = "disponible" | "agotado"

interface Consulta {
  nombre: string
  imagen_url: string | null
  pyme_nombre: string
  vigente: boolean
  respondida: boolean
  respuesta: Respuesta | null
}

const OPCIONES: { id: Respuesta; titulo: string }[] = [
  { id: "disponible", titulo: "Sí, sigue disponible" },
  { id: "agotado", titulo: "No, está agotado" },
]

// Página pública que abre la pyme desde el correo de consulta de stock. Los botones del correo solo
// eligen una opción: nada se guarda hasta que aquí se pulsa "Confirmar".
function StockPyme() {
  const { token } = useParams()
  const [params] = useSearchParams()
  const [consulta, setConsulta] = useState<Consulta | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [elegida, setElegida] = useState<Respuesta | null>(params.get("r") === "si" ? "disponible" : params.get("r") === "no" ? "agotado" : null)
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<Respuesta | null>(null)

  useEffect(() => {
    if (!token) return
    fetch(`/api/propuesta?stock=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const body = await res.json()
        if (!res.ok) throw new Error(body.error || "No se pudo cargar la consulta.")
        setConsulta(body)
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar la consulta."))
      .finally(() => setCargando(false))
  }, [token])

  async function confirmar() {
    if (!elegida) return
    setEnviando(true)
    setError(null)
    try {
      const res = await fetch("/api/propuesta/responder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock_token: token, respuesta: elegida }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || "No se pudo enviar tu respuesta.")
      setResultado(elegida)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar tu respuesta.")
    } finally {
      setEnviando(false)
    }
  }

  if (cargando) return <p className="px-6 py-16 text-center text-ink-500">Cargando…</p>

  if (resultado) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <h1 className="font-heading text-2xl font-bold text-ink-900">
          {resultado === "disponible" ? "¡Gracias! Seguimos mostrando tu producto." : "Listo, registramos que está agotado."}
        </h1>
        <p className="mt-3 text-ink-600">
          {resultado === "disponible"
            ? "Confirmamos que sigue disponible. Puedes cerrar esta página."
            : "Lo pausamos en PettGo para que nadie llegue a un producto sin stock. Cuando vuelva a estar disponible, escríbenos a contacto@pettgo.cl y lo activamos de nuevo."}
        </p>
      </div>
    )
  }

  if (!consulta) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <h1 className="font-heading text-2xl font-bold text-ink-900">No pudimos abrir este enlace</h1>
        <p className="mt-3 text-ink-600">{error}</p>
      </div>
    )
  }

  if (!consulta.vigente) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <h1 className="font-heading text-2xl font-bold text-ink-900">
          {consulta.respondida ? "Ya registramos tu respuesta" : "No hay nada que confirmar"}
        </h1>
        <p className="mt-3 text-ink-600">
          {consulta.respondida
            ? `Respondiste que «${consulta.nombre}» ${consulta.respuesta === "agotado" ? "está agotado" : "sigue disponible"}. ¡Gracias!`
            : `«${consulta.nombre}» ya no está publicado en PettGo, así que no necesitamos tu respuesta.`}
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <p className="text-sm font-semibold text-brand-700">Hola, {consulta.pyme_nombre}</p>
      <h1 className="mt-1 font-heading text-2xl font-bold text-ink-900">¿Sigue disponible este producto?</h1>

      <div className="mt-6 flex items-center gap-4 rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
        {consulta.imagen_url && <img src={consulta.imagen_url} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />}
        <p className="font-heading text-lg font-bold text-ink-900">{consulta.nombre}</p>
      </div>

      <div className="mt-6 flex flex-col gap-3" role="radiogroup" aria-label="Disponibilidad del producto">
        {OPCIONES.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={elegida === o.id}
            onClick={() => setElegida(o.id)}
            className={`rounded-2xl border-2 px-5 py-3 text-left text-sm font-semibold transition ${
              elegida === o.id ? "border-brand-500 bg-brand-50 text-ink-900" : "border-ink-900/10 bg-white text-ink-600 hover:border-brand-300"
            }`}
          >
            {o.titulo}
          </button>
        ))}
      </div>

      {elegida === "agotado" && (
        <p className="mt-3 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
          Al confirmar, pausaremos este producto en PettGo hasta que nos avises que volvió a tener stock.
        </p>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={confirmar}
        disabled={!elegida || enviando}
        className="mt-6 w-full rounded-full bg-gradient-to-br from-brand-400 to-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:shadow-lg disabled:opacity-50"
      >
        {enviando ? "Enviando…" : "Confirmar respuesta"}
      </button>
    </div>
  )
}

export default StockPyme
