import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import { supabase } from "../lib/supabase"
import { ESPECIE_LABEL, etiquetaCategoria } from "../lib/categoriasProducto"
import type { ProductoPymeDestacado } from "../types/productoPyme"

// Cuántos productos se muestran en la portada.
const CANTIDAD = 2

function formatoClp(valor: number | null) {
  if (valor == null) return null
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(valor)
}

function ProductosDestacados() {
  const [productos, setProductos] = useState<ProductoPymeDestacado[]>([])
  const [listo, setListo] = useState(false)

  useEffect(() => {
    supabase
      .from("productos_pyme_destacados")
      .select("*")
      // Desempate por fecha: con todos en cero clics (catálogo recién publicado)
      // muestra los más nuevos en vez de un orden arbitrario.
      .order("clics", { ascending: false })
      .order("creado_en", { ascending: false })
      .limit(CANTIDAD)
      .then(({ data }) => {
        setProductos(data ?? [])
        setListo(true)
      })
  }, [])

  // En la portada, una sección vacía o un "Cargando…" se ve peor que no mostrarla.
  if (!listo || productos.length === 0) return null

  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h2 className="font-heading text-3xl font-bold text-ink-900">Lo más visto</h2>
          <p className="mx-auto mt-2 max-w-xl text-ink-500">
            Los productos que más están mirando en PettGo. Son de pymes chilenas y los recomendamos gratis.
          </p>
        </motion.div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {productos.map((producto, index) => {
            const etiqueta = etiquetaCategoria(producto.categoria)
            const precio = formatoClp(producto.precio_ref)
            return (
              <motion.div
                key={producto.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Link
                  to={`/productos/${producto.id}`}
                  className="group flex h-full gap-5 overflow-hidden rounded-2xl border border-brand-100 bg-white p-4 shadow-sm transition hover:shadow-lg"
                >
                  <div className="h-32 w-32 shrink-0 overflow-hidden rounded-xl bg-brand-50 sm:h-36 sm:w-36">
                    {producto.imagen_url && (
                      <img
                        src={producto.imagen_url}
                        alt={producto.nombre}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex flex-wrap gap-1.5">
                      {etiqueta && (
                        <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
                          {etiqueta}
                        </span>
                      )}
                      {producto.especie && (
                        <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-600">
                          {ESPECIE_LABEL[producto.especie]}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 font-heading text-lg font-bold text-ink-900">{producto.nombre}</h3>
                    {precio && <p className="mt-1 text-sm font-semibold text-ink-700">{precio}</p>}
                    <p className="mt-1 text-xs text-ink-400">Recomendado por {producto.pyme_nombre}</p>
                    <span className="mt-auto pt-3 text-sm font-semibold text-brand-700 group-hover:underline">
                      Ver producto →
                    </span>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/productos"
            className="inline-block rounded-full bg-gradient-to-br from-brand-400 to-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:shadow-lg"
          >
            Ver todos los productos
          </Link>
        </div>
      </div>
    </section>
  )
}

export default ProductosDestacados
