import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import type { Product } from "../types/product"

function Tienda() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setProducts(data ?? [])
        setLoading(false)
      })
  }, [])

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="font-heading text-3xl font-bold text-ink-900">Tienda</h1>
      <p className="mt-2 text-ink-500">
        Productos para el cuidado de tu mascota. La compra se realiza directamente con cada vendedor.
      </p>

      {loading ? (
        <p className="mt-10 text-ink-500">Cargando…</p>
      ) : products.length === 0 ? (
        <p className="mt-10 text-ink-500">Aún no hay productos publicados.</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <div
              key={product.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm"
            >
              <div className="h-40 w-full bg-brand-100">
                {product.photo_url && (
                  <img src={product.photo_url} alt={product.name} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-5">
                <h3 className="font-heading text-lg font-bold text-ink-900">{product.name}</h3>
                {product.description && <p className="text-sm text-ink-500">{product.description}</p>}

                <div className="mt-auto flex flex-col gap-1 pt-3 text-sm">
                  {product.external_link && (
                    <a
                      href={product.external_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-brand-700 hover:underline"
                    >
                      Comprar →
                    </a>
                  )}
                  {product.external_contact && (
                    <p className="text-ink-500">{product.external_contact}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Tienda
