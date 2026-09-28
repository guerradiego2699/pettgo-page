import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import type { ProductoPymePropuesta } from "../types/productoPyme"

function formatoClp(valor: number | null) {
  if (valor == null) return null
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(valor)
}

function Propuesta() {
  const { token } = useParams()
  const [datos, setDatos] = useState<ProductoPymePropuesta | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modo, setModo] = useState<"ver" | "editar" | "rechazar">("ver")
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<"aceptado" | "rechazado" | null>(null)

  const [nombre, setNombre] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [precioRef, setPrecioRef] = useState("")
  const [linkTienda, setLinkTienda] = useState("")
  const [imagenUrl, setImagenUrl] = useState("")
  const [motivo, setMotivo] = useState("")

  useEffect(() => {
    if (!token) return
    fetch(`/api/propuesta?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const body = await res.json()
        if (!res.ok) throw new Error(body.error || "No se pudo cargar la propuesta.")
        setDatos(body)
        setNombre(body.nombre)
        setDescripcion(body.descripcion ?? "")
        setPrecioRef(body.precio_ref != null ? String(body.precio_ref) : "")
        setLinkTienda(body.link_tienda)
        setImagenUrl(body.imagen_url ?? "")
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar la propuesta."))
      .finally(() => setCargando(false))
  }, [token])

  async function responder(accion: "aceptar" | "rechazar") {
    setEnviando(true)
    setError(null)
    try {
      const cambios =
        accion === "aceptar" && modo === "editar"
          ? {
              nombre,
              descripcion: descripcion || null,
              precio_ref: precioRef ? Number(precioRef) : null,
              link_tienda: linkTienda,
              imagen_url: imagenUrl || null,
            }
          : undefined

      const res = await fetch("/api/propuesta/responder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, accion, cambios, motivo: accion === "rechazar" ? motivo : undefined }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || "No se pudo enviar tu respuesta.")
      setResultado(accion === "aceptar" ? "aceptado" : "rechazado")
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
          {resultado === "aceptado" ? "¡Gracias! Tu producto ya está en revisión final." : "Listo, registramos tu respuesta."}
        </h1>
        <p className="mt-3 text-ink-500">
          {resultado === "aceptado"
            ? "En breve verás tu producto publicado en pettgo.cl/productos."
            : "Gracias por avisarnos. Si cambias de opinión, escríbenos a contacto@pettgo.cl."}
        </p>
      </div>
    )
  }

  if (error && !datos) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <h1 className="font-heading text-2xl font-bold text-ink-900">No pudimos abrir este enlace</h1>
        <p className="mt-3 text-ink-500">{error}</p>
        <p className="mt-3 text-ink-500">
          Escríbenos a{" "}
          <a className="font-semibold text-brand-700 hover:underline" href="mailto:contacto@pettgo.cl">
            contacto@pettgo.cl
          </a>{" "}
          y te ayudamos.
        </p>
      </div>
    )
  }

  if (!datos) return null

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-heading text-3xl font-bold text-ink-900">Propuesta de PettGo para {datos.pyme_nombre}</h1>
      <p className="mt-2 text-ink-500">
        Queremos recomendar este producto en pettgo.cl, sin costo. Revisa cómo se vería, edítalo si
        quieres cambiar algo, o recházalo si no te interesa.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-2xl bg-brand-50">
          {(modo === "editar" ? imagenUrl : datos.imagen_url) && (
            <img src={modo === "editar" ? imagenUrl : datos.imagen_url ?? ""} alt="" className="h-full w-full object-cover" />
          )}
        </div>

        {modo === "editar" ? (
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
              Nombre
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
              Descripción
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={3}
                className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
              Precio de referencia (CLP)
              <input
                type="number"
                value={precioRef}
                onChange={(e) => setPrecioRef(e.target.value)}
                className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
              Link de la tienda
              <input
                value={linkTienda}
                onChange={(e) => setLinkTienda(e.target.value)}
                className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
              Imagen (URL)
              <input
                value={imagenUrl}
                onChange={(e) => setImagenUrl(e.target.value)}
                className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </label>
          </div>
        ) : (
          <div>
            {datos.categoria && (
              <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
                {datos.categoria}
              </span>
            )}
            <h2 className="mt-3 font-heading text-2xl font-bold text-ink-900">{datos.nombre}</h2>
            {formatoClp(datos.precio_ref) && (
              <p className="mt-2 text-lg font-semibold text-ink-700">{formatoClp(datos.precio_ref)}</p>
            )}
            {datos.descripcion && <p className="mt-3 text-ink-600">{datos.descripcion}</p>}
            <p className="mt-3 break-all text-sm text-ink-400">Tienda: {datos.link_tienda}</p>
          </div>
        )}
      </div>

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      {modo === "rechazar" ? (
        <div className="mt-8 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
            Motivo (opcional)
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={2}
              className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={enviando}
              onClick={() => responder("rechazar")}
              className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              Confirmar rechazo
            </button>
            <button
              type="button"
              onClick={() => setModo("ver")}
              className="rounded-full border border-ink-900/15 px-5 py-2.5 text-sm font-medium text-ink-600 hover:bg-brand-50"
            >
              Volver
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={enviando}
            onClick={() => responder("aceptar")}
            className="rounded-full bg-gradient-to-br from-brand-400 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:shadow-lg disabled:opacity-60"
          >
            {modo === "editar" ? "Guardar y aceptar" : "Aceptar propuesta"}
          </button>
          {modo === "ver" ? (
            <button
              type="button"
              onClick={() => setModo("editar")}
              className="rounded-full border border-ink-900/15 px-5 py-2.5 text-sm font-medium text-ink-600 hover:bg-brand-50"
            >
              Editar antes de aceptar
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setModo("ver")}
              className="rounded-full border border-ink-900/15 px-5 py-2.5 text-sm font-medium text-ink-600 hover:bg-brand-50"
            >
              Cancelar edición
            </button>
          )}
          <button
            type="button"
            onClick={() => setModo("rechazar")}
            className="rounded-full px-5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Rechazar
          </button>
        </div>
      )}
    </div>
  )
}

export default Propuesta
