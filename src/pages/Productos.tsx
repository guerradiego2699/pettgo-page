import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../lib/supabase"
import type { ProductoPymePublico } from "../types/productoPyme"

function formatoClp(valor: number | null) {
  if (valor == null) return null
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(valor)
}

function Productos() {
  const [productos, setProductos] = useState<ProductoPymePublico[]>([])
  const [loading, setLoading] = useState(true)
  const [categoria, setCategoria] = useState<string | null>(null)

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

  const categorias = useMemo(
    () => Array.from(new Set(productos.map((p) => p.categoria).filter((c): c is string => Boolean(c)))),
    [productos]
  )

  const visibles = categoria ? productos.filter((p) => p.categoria === categoria) : productos

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="font-heading text-3xl font-bold text-ink-900">Productos recomendados</h1>
      <p className="mt-2 max-w-2xl text-ink-500">
        Productos de pymes chilenas del rubro mascotas que recomendamos gratis. PettGo no vende
        directamente: cada "Ver en tienda" te lleva al sitio de la pyme.
      </p>

      {categorias.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategoria(null)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              categoria === null ? "bg-brand-500 text-white" : "bg-brand-100 text-brand-700 hover:bg-brand-200"
            }`}
          >
            Todas
          </button>
          {categorias.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategoria(c)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                categoria === c ? "bg-brand-500 text-white" : "bg-brand-100 text-brand-700 hover:bg-brand-200"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="mt-10 text-ink-500">Cargando…</p>
      ) : visibles.length === 0 ? (
        <p className="mt-10 text-ink-500">Todavía no hay productos publicados.</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visibles.map((producto) => (
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
                {producto.categoria && (
                  <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
                    {producto.categoria}
                  </span>
                )}
                <h3 className="mt-2 font-heading text-lg font-bold text-ink-900">{producto.nombre}</h3>
                {formatoClp(producto.precio_ref) && (
                  <p className="mt-1 text-sm font-semibold text-ink-700">{formatoClp(producto.precio_ref)}</p>
                )}
                <p className="mt-1 text-xs text-ink-400">Recomendado por {producto.pyme_nombre}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default Productos
