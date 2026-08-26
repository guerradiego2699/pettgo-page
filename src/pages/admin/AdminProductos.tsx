import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import ProductForm from "../../components/ProductForm"
import type { Product } from "../../types/product"

function AdminProductos() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const loadProducts = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false })
    setProducts(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  function openCreate() {
    setEditingProduct(null)
    setFormOpen(true)
  }

  function openEdit(product: Product) {
    setEditingProduct(product)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingProduct(null)
  }

  function handleSaved() {
    closeForm()
    loadProducts()
  }

  async function handleDelete(id: string) {
    await supabase.from("products").delete().eq("id", id)
    setConfirmingId(null)
    loadProducts()
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <Link to="/admin" className="text-sm font-semibold text-brand-700 hover:underline">
        ← Panel de administrador
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-3xl font-bold text-ink-900">Productos</h1>
        {!formOpen && (
          <button
            type="button"
            onClick={openCreate}
            className="rounded-full bg-gradient-to-br from-brand-400 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:shadow-lg"
          >
            + Nuevo producto
          </button>
        )}
      </div>

      {formOpen && (
        <div className="mt-6">
          <ProductForm product={editingProduct ?? undefined} onCancel={closeForm} onSaved={handleSaved} />
        </div>
      )}

      {loading ? (
        <p className="mt-10 text-ink-500">Cargando…</p>
      ) : products.length === 0 && !formOpen ? (
        <p className="mt-10 text-ink-500">No hay productos creados todavía.</p>
      ) : (
        <div className="mt-8 flex flex-col gap-4">
          {products.map((product) => (
            <div key={product.id} className="flex items-center gap-4 rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-brand-100">
                {product.photo_url && (
                  <img src={product.photo_url} alt={product.name} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-heading text-lg font-bold text-ink-900">{product.name}</h3>
                {product.description && (
                  <p className="truncate text-sm text-ink-500">{product.description}</p>
                )}

                {confirmingId === product.id ? (
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                    <span className="font-medium text-ink-700">¿Eliminar {product.name}?</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(product.id)}
                      className="font-semibold text-red-600 hover:underline"
                    >
                      Sí, eliminar
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingId(null)}
                      className="font-semibold text-ink-500 hover:underline"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 flex gap-4 text-sm font-semibold">
                    <button
                      type="button"
                      onClick={() => openEdit(product)}
                      className="text-brand-700 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingId(product.id)}
                      className="text-red-600 hover:underline"
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AdminProductos
