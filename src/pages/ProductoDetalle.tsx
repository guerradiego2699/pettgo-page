import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { registrarVista } from "../lib/eventos"
import type { ProductoPymePublico } from "../types/productoPyme"

function formatoClp(valor: number | null) {
  if (valor == null) return null
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(valor)
}

function ProductoDetalle() {
  const { id } = useParams()
  const [producto, setProducto] = useState<ProductoPymePublico | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    supabase
      .from("productos_pyme_publicos")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setProducto(data ?? null)
        setLoading(false)
        if (data) registrarVista(data.id)
      })
  }, [id])

  if (loading) return <p className="px-6 py-16 text-center text-ink-500">Cargando…</p>

  if (!producto) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-ink-500">No encontramos este producto.</p>
        <Link to="/productos" className="mt-4 inline-block font-semibold text-brand-700 hover:underline">
          Volver a productos
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <Link to="/productos" className="text-sm font-semibold text-brand-700 hover:underline">
        ← Productos
      </Link>

      <div className="mt-4 grid grid-cols-1 gap-8 sm:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-2xl bg-brand-50">
          {producto.imagen_url && (
            <img src={producto.imagen_url} alt={producto.nombre} className="h-full w-full object-cover" />
          )}
        </div>
        <div>
          {producto.categoria && (
            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
              {producto.categoria}
            </span>
          )}
          <h1 className="mt-3 font-heading text-3xl font-bold text-ink-900">{producto.nombre}</h1>
          {formatoClp(producto.precio_ref) && (
            <p className="mt-2 text-xl font-semibold text-ink-700">{formatoClp(producto.precio_ref)}</p>
          )}
          {producto.descripcion && <p className="mt-4 text-ink-600">{producto.descripcion}</p>}
          <p className="mt-4 text-sm text-ink-400">Recomendado por {producto.pyme_nombre}</p>

          <a
            href={`/api/ir/${producto.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-block rounded-full bg-gradient-to-br from-brand-400 to-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:shadow-lg"
          >
            Ver en la tienda
          </a>
        </div>
      </div>
    </div>
  )
}

export default ProductoDetalle
