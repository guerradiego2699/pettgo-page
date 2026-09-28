import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useAuth } from "../../context/AuthContext"
import type { MetricasResponse, ProductoPymeMetrica } from "../../types/productoPyme"

const RANGOS = [
  { id: "7", label: "7 días", dias: 7 },
  { id: "30", label: "30 días", dias: 30 },
  { id: "todo", label: "Todo", dias: null },
] as const

const ESTADO_ESTILO: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-700",
  publicado: "bg-emerald-100 text-emerald-700",
  rechazado: "bg-red-100 text-red-700",
}

const CAMPOS_INICIALES = {
  nombre: "",
  descripcion: "",
  imagen_url: "",
  precio_ref: "",
  link_tienda: "",
  categoria: "",
  pyme_nombre: "",
  pyme_email: "",
}

function AdminProductos() {
  const { session } = useAuth()
  const [rango, setRango] = useState<(typeof RANGOS)[number]["id"]>("30")
  const [metricas, setMetricas] = useState<MetricasResponse | null>(null)
  const [cargandoMetricas, setCargandoMetricas] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(CAMPOS_INICIALES)
  const [enviando, setEnviando] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const desde = useMemo(() => {
    const rangoActual = RANGOS.find((r) => r.id === rango)
    if (!rangoActual?.dias) return null
    const fecha = new Date()
    fecha.setDate(fecha.getDate() - rangoActual.dias)
    return fecha.toISOString()
  }, [rango])

  const cargarMetricas = useCallback(async () => {
    if (!session) return
    setCargandoMetricas(true)
    const params = new URLSearchParams()
    if (desde) params.set("desde", desde)

    try {
      const res = await fetch(`/api/admin/metricas?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || "No se pudieron cargar las métricas.")
      setMetricas(body)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las métricas.")
    } finally {
      setCargandoMetricas(false)
    }
  }, [session, desde])

  useEffect(() => {
    cargarMetricas()
  }, [cargarMetricas])

  async function handleProponer(event: FormEvent) {
    event.preventDefault()
    if (!session) return
    setError(null)
    setAviso(null)
    setEnviando("nuevo")

    try {
      const res = await fetch("/api/admin/proponer", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          ...form,
          precio_ref: form.precio_ref ? Number(form.precio_ref) : null,
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || "No se pudo enviar la propuesta.")

      setAviso("Propuesta enviada por correo a la pyme.")
      setForm(CAMPOS_INICIALES)
      setFormOpen(false)
      cargarMetricas()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar la propuesta.")
    } finally {
      setEnviando(null)
    }
  }

  async function handleReenviar(id: string) {
    if (!session) return
    setError(null)
    setAviso(null)
    setEnviando(id)

    try {
      const res = await fetch("/api/admin/proponer", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ id }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || "No se pudo reenviar la propuesta.")

      setAviso("Propuesta reenviada con un nuevo enlace.")
      cargarMetricas()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reenviar la propuesta.")
    } finally {
      setEnviando(null)
    }
  }

  function exportarCsv() {
    if (!metricas) return
    const encabezado = [
      "nombre",
      "pyme_nombre",
      "pyme_email",
      "categoria",
      "estado",
      "vistas_totales",
      "vistas_unicas",
      "clics_totales",
      "clics_unicos",
      "tasa_clic",
    ]
    const filas = metricas.productos.map((p) =>
      [p.nombre, p.pyme_nombre, p.pyme_email, p.categoria ?? "", p.estado, p.vistas_totales, p.vistas_unicas, p.clics_totales, p.clics_unicos, p.tasa_clic]
        .map((valor) => `"${String(valor).replace(/"/g, '""')}"`)
        .join(",")
    )
    const csv = [encabezado.join(","), ...filas].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const enlace = document.createElement("a")
    enlace.href = url
    enlace.download = `metricas-productos-${new Date().toISOString().slice(0, 10)}.csv`
    enlace.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <Link to="/admin" className="text-sm font-semibold text-brand-700 hover:underline">
        ← Panel de administrador
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-3xl font-bold text-ink-900">Productos de pymes</h1>
        {!formOpen && (
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="rounded-full bg-gradient-to-br from-brand-400 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:shadow-lg"
          >
            + Proponer producto
          </button>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {aviso && <p className="mt-4 text-sm text-emerald-600">{aviso}</p>}

      {formOpen && (
        <form onSubmit={handleProponer} className="mt-6 flex flex-col gap-4 rounded-2xl border border-brand-100 bg-white p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
              Nombre del producto *
              <input
                required
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
              Categoría
              <input
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
            Descripción
            <textarea
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              rows={3}
              className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
              Imagen (URL https)
              <input
                type="url"
                value={form.imagen_url}
                onChange={(e) => setForm({ ...form, imagen_url: e.target.value })}
                placeholder="https://..."
                className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
              Precio de referencia (CLP)
              <input
                type="number"
                value={form.precio_ref}
                onChange={(e) => setForm({ ...form, precio_ref: e.target.value })}
                className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
            Link de la tienda (URL https) *
            <input
              type="url"
              required
              value={form.link_tienda}
              onChange={(e) => setForm({ ...form, link_tienda: e.target.value })}
              placeholder="https://..."
              className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
              Nombre de la pyme *
              <input
                required
                value={form.pyme_nombre}
                onChange={(e) => setForm({ ...form, pyme_nombre: e.target.value })}
                className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
              Correo de la pyme *
              <input
                type="email"
                required
                value={form.pyme_email}
                onChange={(e) => setForm({ ...form, pyme_email: e.target.value })}
                className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </label>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={enviando === "nuevo"}
              className="rounded-full bg-gradient-to-br from-brand-400 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:shadow-lg disabled:opacity-60"
            >
              {enviando === "nuevo" ? "Enviando…" : "Enviar propuesta por correo"}
            </button>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded-full border border-ink-900/15 px-5 py-2.5 text-sm font-medium text-ink-600 hover:bg-brand-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-heading text-xl font-bold text-ink-900">Métricas</h2>
        <div className="flex gap-2">
          {RANGOS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRango(r.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                rango === r.id ? "bg-brand-500 text-white" : "bg-brand-100 text-brand-700 hover:bg-brand-200"
              }`}
            >
              {r.label}
            </button>
          ))}
          <button
            type="button"
            onClick={exportarCsv}
            disabled={!metricas}
            className="rounded-full border border-ink-900/15 px-4 py-1.5 text-sm font-semibold text-ink-600 hover:bg-brand-50 disabled:opacity-50"
          >
            Exportar CSV
          </button>
        </div>
      </div>

      {cargandoMetricas ? (
        <p className="mt-6 text-ink-500">Cargando métricas…</p>
      ) : (
        <>
          {metricas && metricas.serieDiaria.length > 0 && (
            <div className="mt-6 h-64 rounded-2xl border border-brand-100 bg-white p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metricas.serieDiaria}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0ded0" />
                  <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="vistas" name="Vistas" stroke="#e08a3f" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="clics" name="Clics" stroke="#292524" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="mt-6 overflow-x-auto rounded-2xl border border-brand-100 bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-brand-100 text-xs font-semibold uppercase text-ink-400">
                <tr>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Pyme</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Vistas</th>
                  <th className="px-4 py-3">Clics</th>
                  <th className="px-4 py-3">Tasa de clic</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {(metricas?.productos ?? []).map((producto: ProductoPymeMetrica) => (
                  <tr key={producto.id} className="border-b border-brand-50 last:border-0">
                    <td className="px-4 py-3 font-medium text-ink-900">{producto.nombre}</td>
                    <td className="px-4 py-3 text-ink-500">
                      {producto.pyme_nombre}
                      <div className="text-xs text-ink-400">{producto.pyme_email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ESTADO_ESTILO[producto.estado]}`}>
                        {producto.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-700">
                      {producto.vistas_totales} <span className="text-ink-400">({producto.vistas_unicas} únicas)</span>
                    </td>
                    <td className="px-4 py-3 text-ink-700">
                      {producto.clics_totales} <span className="text-ink-400">({producto.clics_unicos} únicos)</span>
                    </td>
                    <td className="px-4 py-3 text-ink-700">{producto.tasa_clic}%</td>
                    <td className="px-4 py-3">
                      {producto.estado !== "publicado" && (
                        <button
                          type="button"
                          disabled={enviando === producto.id}
                          onClick={() => handleReenviar(producto.id)}
                          className="font-semibold text-brand-700 hover:underline disabled:opacity-50"
                        >
                          {enviando === producto.id ? "Enviando…" : "Reenviar"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {(metricas?.productos ?? []).length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-ink-400">
                      Todavía no has propuesto ningún producto.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

export default AdminProductos
