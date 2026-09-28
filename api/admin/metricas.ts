import type { VercelRequest, VercelResponse } from "@vercel/node"
import { supabaseAdmin } from "../_lib/supabaseAdmin"
import { requireAdmin } from "../_lib/auth"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método no permitido." })
  }

  const auth = await requireAdmin(req)
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error })

  const desde = typeof req.query.desde === "string" ? req.query.desde : null
  const hasta = typeof req.query.hasta === "string" ? req.query.hasta : null

  const { data: productos, error: errorProductos } = await supabaseAdmin
    .from("productos_pyme")
    .select("id, nombre, estado, pyme_nombre, pyme_email, categoria")
    .order("creado_en", { ascending: false })

  if (errorProductos) {
    console.error(errorProductos)
    return res.status(500).json({ error: "No se pudieron cargar los productos." })
  }

  const [{ data: metricas, error: errorMetricas }, { data: serieDiaria, error: errorSerie }] = await Promise.all([
    supabaseAdmin.rpc("metricas_producto", { desde, hasta }),
    supabaseAdmin.rpc("metricas_diarias", { desde, hasta }),
  ])

  if (errorMetricas || errorSerie) {
    console.error(errorMetricas ?? errorSerie)
    return res.status(500).json({ error: "No se pudieron calcular las métricas." })
  }

  interface MetricaFila {
    producto_id: string
    vistas_totales: number
    vistas_unicas: number
    clics_totales: number
    clics_unicos: number
    tasa_clic: number
  }

  const porProducto = new Map((metricas ?? []).map((m: MetricaFila) => [m.producto_id, m]))
  const vacio = { vistas_totales: 0, vistas_unicas: 0, clics_totales: 0, clics_unicos: 0, tasa_clic: 0 }

  const productosConMetricas = (productos ?? []).map((producto: { id: string }) => ({
    ...producto,
    ...(porProducto.get(producto.id) ?? vacio),
  }))

  return res.status(200).json({ productos: productosConMetricas, serieDiaria: serieDiaria ?? [] })
}
