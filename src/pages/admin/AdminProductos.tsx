import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useAuth } from "../../context/AuthContext"
import { uploadImage, extensionFor } from "../../lib/storage"
import { CATEGORIAS_PRODUCTO, ESPECIE_LABEL, etiquetaCategoria, normalizarCategoria } from "../../lib/categoriasProducto"
import type { MetricasResponse, ProductoPymeEspecie, ProductoPymeMetrica } from "../../types/productoPyme"

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
  especie: "ambos" as ProductoPymeEspecie,
  pyme_nombre: "",
  pyme_email: "",
}

const CAMPOS_EDICION_INICIALES = {
  nombre: "",
  descripcion: "",
  precio_ref: "",
  link_tienda: "",
  categoria: "",
  especie: "ambos" as ProductoPymeEspecie,
}

function AdminProductos() {
  const { session } = useAuth()
  const [rango, setRango] = useState<(typeof RANGOS)[number]["id"]>("30")
  const [metricas, setMetricas] = useState<MetricasResponse | null>(null)
  const [cargandoMetricas, setCargandoMetricas] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(CAMPOS_INICIALES)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(CAMPOS_EDICION_INICIALES)
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null)
  const [editPreview, setEditPreview] = useState<string | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const [enviando, setEnviando] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [filtroCategoria, setFiltroCategoria] = useState("")
  const [filtroMascota, setFiltroMascota] = useState("")

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

  const productosFiltrados = useMemo(() => {
    const lista = metricas?.productos ?? []
    return lista.filter((p) => {
      const cat = normalizarCategoria(p.categoria)
      if (filtroCategoria === "sin_categoria" ? cat !== null : filtroCategoria && cat !== filtroCategoria) return false
      if (filtroMascota && p.especie !== filtroMascota) return false
      return true
    })
  }, [metricas, filtroCategoria, filtroMascota])

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPreview(URL.createObjectURL(file))
  }

  async function subirFotoProducto(file: File): Promise<string> {
    try {
      const path = `${crypto.randomUUID()}.${extensionFor(file)}`
      return await uploadImage("products", path, file)
    } catch {
      throw new Error(
        "No se pudo confirmar la subida de la foto (puede ser un corte de conexión momentáneo). Intenta de nuevo."
      )
    }
  }

  async function handleProponer(event: FormEvent) {
    event.preventDefault()
    if (!session) return
    setError(null)
    setAviso(null)
    setEnviando("nuevo")

    try {
      let imagenUrl = form.imagen_url || null
      if (photoFile) {
        imagenUrl = await subirFotoProducto(photoFile)
      }

      const res = await fetch("/api/admin/proponer", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          ...form,
          imagen_url: imagenUrl,
          precio_ref: form.precio_ref ? Number(form.precio_ref) : null,
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || "No se pudo enviar la propuesta.")

      setAviso("Propuesta enviada por correo a la pyme.")
      setForm(CAMPOS_INICIALES)
      setPhotoFile(null)
      setPreview(null)
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

  function openEdit(producto: ProductoPymeMetrica) {
    setFormOpen(false)
    setConfirmingDeleteId(null)
    setEditingId(producto.id)
    setEditForm({
      nombre: producto.nombre,
      descripcion: producto.descripcion ?? "",
      precio_ref: producto.precio_ref != null ? String(producto.precio_ref) : "",
      link_tienda: producto.link_tienda ?? "",
      categoria: normalizarCategoria(producto.categoria) ?? "",
      especie: producto.especie ?? "ambos",
    })
    setEditPreview(producto.imagen_url ?? null)
    setEditPhotoFile(null)
  }

  function closeEdit() {
    setEditingId(null)
    setEditForm(CAMPOS_EDICION_INICIALES)
    setEditPhotoFile(null)
    setEditPreview(null)
  }

  function handleEditPhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setEditPhotoFile(file)
    setEditPreview(URL.createObjectURL(file))
  }

  async function handleGuardarEdicion(event: FormEvent) {
    event.preventDefault()
    if (!session || !editingId) return
    setError(null)
    setAviso(null)
    setEnviando(editingId)

    try {
      const payload: Record<string, unknown> = {
        nombre: editForm.nombre,
        descripcion: editForm.descripcion || null,
        precio_ref: editForm.precio_ref ? Number(editForm.precio_ref) : null,
        link_tienda: editForm.link_tienda,
        categoria: editForm.categoria || null,
        especie: editForm.especie,
      }
      if (editPhotoFile) {
        payload.imagen_url = await subirFotoProducto(editPhotoFile)
      }

      const res = await fetch(`/api/admin/producto/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(payload),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || "No se pudieron guardar los cambios.")

      setAviso("Cambios guardados.")
      closeEdit()
      cargarMetricas()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron guardar los cambios.")
    } finally {
      setEnviando(null)
    }
  }

  async function handleEliminar(id: string) {
    if (!session) return
    setError(null)
    setAviso(null)
    setEnviando(id)

    try {
      const res = await fetch(`/api/admin/producto/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || "No se pudo eliminar el producto.")

      setAviso("Producto eliminado.")
      setConfirmingDeleteId(null)
      cargarMetricas()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el producto.")
    } finally {
      setEnviando(null)
    }
  }

  async function handleEstado(id: string, estado: "publicado" | "rechazado") {
    if (!session) return
    setError(null)
    setAviso(null)
    setEnviando(id)

    try {
      const res = await fetch(`/api/admin/producto/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ estado }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || "No se pudo actualizar el estado.")

      setAviso(estado === "publicado" ? "Producto publicado directamente por ti." : "Producto rechazado.")
      cargarMetricas()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el estado.")
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
      "mascota",
      "estado",
      "vistas_totales",
      "vistas_unicas",
      "clics_totales",
      "clics_unicos",
      "tasa_clic",
    ]
    const filas = metricas.productos.map((p) =>
      [p.nombre, p.pyme_nombre, p.pyme_email, etiquetaCategoria(p.categoria) ?? "", ESPECIE_LABEL[p.especie ?? "ambos"], p.estado, p.vistas_totales, p.vistas_unicas, p.clics_totales, p.clics_unicos, p.tasa_clic]
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
            onClick={() => {
              closeEdit()
              setFormOpen(true)
            }}
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
              Categoría *
              <select
                required
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              >
                <option value="">Elige una categoría…</option>
                {CATEGORIAS_PRODUCTO.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
            Mascota
            <select
              value={form.especie}
              onChange={(e) => setForm({ ...form, especie: e.target.value as ProductoPymeEspecie })}
              className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="ambos">Perro y gato</option>
              <option value="perro">Perro</option>
              <option value="gato">Gato</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
            Descripción
            <textarea
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              rows={3}
              className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </label>

          <div className="flex items-center gap-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-brand-100">
              {preview ? (
                <img src={preview} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full items-center justify-center text-2xl" aria-hidden="true">
                  🛍️
                </span>
              )}
            </div>
            <label className="text-sm font-medium text-ink-700">
              Foto del producto
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="mt-1 block text-sm text-ink-500 file:mr-3 file:rounded-full file:border-0 file:bg-brand-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand-700"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
            Precio de referencia (CLP)
            <input
              type="number"
              value={form.precio_ref}
              onChange={(e) => setForm({ ...form, precio_ref: e.target.value })}
              className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </label>

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

      {editingId && (
        <form onSubmit={handleGuardarEdicion} className="mt-6 flex flex-col gap-4 rounded-2xl border border-brand-100 bg-white p-6">
          <h3 className="font-heading text-lg font-bold text-ink-900">Editar producto</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
              Nombre del producto *
              <input
                required
                value={editForm.nombre}
                onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
              Categoría
              <select
                value={editForm.categoria}
                onChange={(e) => setEditForm({ ...editForm, categoria: e.target.value })}
                className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              >
                <option value="">Sin categoría</option>
                {CATEGORIAS_PRODUCTO.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
            Mascota
            <select
              value={editForm.especie}
              onChange={(e) => setEditForm({ ...editForm, especie: e.target.value as ProductoPymeEspecie })}
              className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="ambos">Perro y gato</option>
              <option value="perro">Perro</option>
              <option value="gato">Gato</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
            Descripción
            <textarea
              value={editForm.descripcion}
              onChange={(e) => setEditForm({ ...editForm, descripcion: e.target.value })}
              rows={3}
              className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </label>

          <div className="flex items-center gap-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-brand-100">
              {editPreview ? (
                <img src={editPreview} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full items-center justify-center text-2xl" aria-hidden="true">
                  🛍️
                </span>
              )}
            </div>
            <label className="text-sm font-medium text-ink-700">
              Foto del producto
              <input
                type="file"
                accept="image/*"
                onChange={handleEditPhotoChange}
                className="mt-1 block text-sm text-ink-500 file:mr-3 file:rounded-full file:border-0 file:bg-brand-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand-700"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
            Precio de referencia (CLP)
            <input
              type="number"
              value={editForm.precio_ref}
              onChange={(e) => setEditForm({ ...editForm, precio_ref: e.target.value })}
              className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
            Link de la tienda (URL https) *
            <input
              type="url"
              required
              value={editForm.link_tienda}
              onChange={(e) => setEditForm({ ...editForm, link_tienda: e.target.value })}
              placeholder="https://..."
              className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </label>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={enviando === editingId}
              className="rounded-full bg-gradient-to-br from-brand-400 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:shadow-lg disabled:opacity-60"
            >
              {enviando === editingId ? "Guardando…" : "Guardar cambios"}
            </button>
            <button
              type="button"
              onClick={closeEdit}
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

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-medium text-ink-600">
              Categoría
              <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                className="rounded-lg border border-ink-900/15 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
              >
                <option value="">Todas</option>
                {CATEGORIAS_PRODUCTO.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
                <option value="sin_categoria">Sin categoría</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-ink-600">
              Mascota
              <select
                value={filtroMascota}
                onChange={(e) => setFiltroMascota(e.target.value)}
                className="rounded-lg border border-ink-900/15 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
              >
                <option value="">Todas</option>
                <option value="perro">Perro</option>
                <option value="gato">Gato</option>
                <option value="ambos">Perro y gato</option>
              </select>
            </label>
            {(filtroCategoria || filtroMascota) && (
              <button
                type="button"
                onClick={() => {
                  setFiltroCategoria("")
                  setFiltroMascota("")
                }}
                className="text-sm font-semibold text-brand-700 hover:underline"
              >
                Quitar filtros
              </button>
            )}
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-brand-100 bg-white">
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
                {productosFiltrados.map((producto: ProductoPymeMetrica) => (
                  <tr key={producto.id} className="border-b border-brand-50 last:border-0">
                    <td className="px-4 py-3 font-medium text-ink-900">
                      {producto.nombre}
                      <div className="text-xs font-normal text-ink-400">
                        {etiquetaCategoria(producto.categoria) ?? "Sin categoría"} · {ESPECIE_LABEL[producto.especie ?? "ambos"]}
                      </div>
                    </td>
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
                      <div className="flex flex-wrap items-center gap-3 text-sm font-semibold">
                        {producto.estado === "pendiente" && (
                          <>
                            <button
                              type="button"
                              disabled={enviando === producto.id}
                              onClick={() => handleEstado(producto.id, "publicado")}
                              className="text-emerald-700 hover:underline disabled:opacity-50"
                            >
                              Aceptar
                            </button>
                            <button
                              type="button"
                              disabled={enviando === producto.id}
                              onClick={() => handleEstado(producto.id, "rechazado")}
                              className="text-red-600 hover:underline disabled:opacity-50"
                            >
                              Rechazar
                            </button>
                          </>
                        )}
                        {producto.estado !== "publicado" && (
                          <button
                            type="button"
                            disabled={enviando === producto.id}
                            onClick={() => handleReenviar(producto.id)}
                            className="text-brand-700 hover:underline disabled:opacity-50"
                          >
                            {enviando === producto.id ? "…" : "Reenviar"}
                          </button>
                        )}
                        <button type="button" onClick={() => openEdit(producto)} className="text-ink-600 hover:underline">
                          Editar
                        </button>
                        {confirmingDeleteId === producto.id ? (
                          <>
                            <span className="font-normal text-ink-500">¿Eliminar?</span>
                            <button
                              type="button"
                              disabled={enviando === producto.id}
                              onClick={() => handleEliminar(producto.id)}
                              className="text-red-600 hover:underline disabled:opacity-50"
                            >
                              Sí
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmingDeleteId(null)}
                              className="font-normal text-ink-500 hover:underline"
                            >
                              No
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmingDeleteId(producto.id)}
                            className="text-red-600 hover:underline"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {productosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-ink-400">
                      {(metricas?.productos ?? []).length === 0
                        ? "Todavía no has propuesto ningún producto."
                        : "No hay productos con esos filtros."}
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
