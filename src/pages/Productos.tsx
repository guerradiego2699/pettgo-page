import { useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { supabase } from "../lib/supabase"
import {
  CATEGORIAS_PRODUCTO,
  ESPECIE_LABEL,
  coincideMascota,
  etiquetaCategoria,
  normalizarCategoria,
  type CategoriaProducto,
} from "../lib/categoriasProducto"
import type { ProductoPymePublico } from "../types/productoPyme"

type FiltroMascota = "perro" | "gato" | null

const MASCOTAS: { id: FiltroMascota; label: string }[] = [
  { id: null, label: "Todas las mascotas" },
  { id: "perro", label: "Perros" },
  { id: "gato", label: "Gatos" },
]

function formatoClp(valor: number | null) {
  if (valor == null) return null
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(valor)
}

function chipClase(activo: boolean) {
  return `rounded-full px-4 py-1.5 text-sm font-semibold transition ${
    activo ? "bg-brand-500 text-white" : "bg-brand-100 text-brand-700 hover:bg-brand-200"
  }`
}

function Productos() {
  const [productos, setProductos] = useState<ProductoPymePublico[]>([])
  const [loading, setLoading] = useState(true)
  const [params, setParams] = useSearchParams()

  // Los filtros viven en la URL (/productos?mascota=perro&categoria=alimento) para poder compartir o enlazar una vista.
  const mascota: FiltroMascota = params.get("mascota") === "perro" ? "perro" : params.get("mascota") === "gato" ? "gato" : null
  const categoria: CategoriaProducto | null = normalizarCategoria(params.get("categoria"))

  function cambiarFiltro(clave: "mascota" | "categoria", valor: string | null) {
    const siguiente = new URLSearchParams(params)
    if (valor) siguiente.set(clave, valor)
    else siguiente.delete(clave)
    setParams(siguiente, { replace: true })
  }

  useEffect(() => {
    supabase
      .from("productos_pyme_publicos")
      .select("*")
      .order("creado_en", { ascending: false })
      .then(({ data }) => {
        setProductos(data ?? [])
        setLoading(false)
      })
  }, [])

  // Los conteos de cada categoría respetan el filtro de mascota elegido.
  const porMascota = useMemo(() => productos.filter((p) => coincideMascota(p.especie, mascota)), [productos, mascota])
  const conteos = useMemo(() => {
    const c: Record<string, number> = {}
    for (const p of porMascota) {
      const id = normalizarCategoria(p.categoria)
      if (id) c[id] = (c[id] ?? 0) + 1
    }
    return c
  }, [porMascota])

  const visibles = categoria ? porMascota.filter((p) => normalizarCategoria(p.categoria) === categoria) : porMascota
  const hayFiltros = mascota !== null || categoria !== null

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="font-heading text-3xl font-bold text-ink-900">Productos recomendados</h1>
      <p className="mt-2 max-w-2xl text-ink-500">
        Productos de pymes chilenas del rubro mascotas que recomendamos gratis. PettGo no vende
        directamente: cada "Ver en tienda" te lleva al sitio de la pyme.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por mascota">
          {MASCOTAS.map((m) => (
            <button key={m.label} type="button" onClick={() => cambiarFiltro("mascota", m.id)} className={chipClase(mascota === m.id)}>
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por categoría">
          <button type="button" onClick={() => cambiarFiltro("categoria", null)} className={chipClase(categoria === null)}>
            Todas las categorías
          </button>
          {CATEGORIAS_PRODUCTO.map((c) => (
            <button key={c.id} type="button" onClick={() => cambiarFiltro("categoria", c.id)} className={chipClase(categoria === c.id)}>
              {c.label}
              {!loading && <span className="ml-1.5 text-xs font-medium opacity-70">{conteos[c.id] ?? 0}</span>}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="mt-10 text-ink-500">Cargando…</p>
      ) : visibles.length === 0 ? (
        <div className="mt-10 text-ink-500">
          <p>{hayFiltros ? "No hay productos con estos filtros todavía." : "Todavía no hay productos publicados."}</p>
          {hayFiltros && (
            <button
              type="button"
              onClick={() => setParams({}, { replace: true })}
              className="mt-2 text-sm font-semibold text-brand-700 hover:underline"
            >
              Quitar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visibles.map((producto) => {
            const etiqueta = etiquetaCategoria(producto.categoria)
            return (
              <Link
                key={producto.id}
                to={`/productos/${producto.id}`}
                className="group overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm transition hover:shadow-lg"
              >
                <div className="aspect-square w-full overflow-hidden bg-brand-50">
                  {producto.imagen_url && (
                    <img
                      src={producto.imagen_url}
                      alt={producto.nombre}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  )}
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap gap-1.5">
                    {etiqueta && (
                      <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">{etiqueta}</span>
                    )}
                    {producto.especie && (
                      <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-600">
                        {ESPECIE_LABEL[producto.especie]}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 font-heading text-lg font-bold text-ink-900">{producto.nombre}</h3>
                  {formatoClp(producto.precio_ref) && (
                    <p className="mt-1 text-sm font-semibold text-ink-700">{formatoClp(producto.precio_ref)}</p>
                  )}
                  <p className="mt-1 text-xs text-ink-400">Recomendado por {producto.pyme_nombre}</p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Productos
