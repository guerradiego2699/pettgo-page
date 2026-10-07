import type { ResumenTendencias } from "../types/tendencias"
import { nf, pctS, pct1, PERIODO_PREV } from "./tendenciasTexto"
import { etiquetaIdCategoria } from "./categoriasProducto"

const PERIODO_LARGO: Record<string, string> = {
  diario: "diario (hoy vs. ayer)",
  semanal: "semanal (7 días vs. 7 anteriores)",
  mensual: "mensual (30 días vs. 30 anteriores)",
}

// Resumen calculado a partir de los números reales del período — sin IA,
// gratis e inmediato (mismo criterio que el respaldo del mockup original).
export function analisisLocal(r: ResumenTendencias): string {
  if (r.productos.length === 0) {
    return "Todavía no hay productos publicados con actividad en este período. En cuanto se publiquen productos y empiecen a recibir vistas, este resumen se arma solo."
  }

  const deltaClics = r.totales.clicsPrev ? r.totales.clics / r.totales.clicsPrev - 1 : 0
  const deltaTienda = r.totales.tiendaPrev ? r.totales.tienda / r.totales.tiendaPrev - 1 : 0
  const topClics = [...r.productos].sort((a, b) => b.clics - a.clics)[0]
  const topTienda = [...r.productos].sort((a, b) => b.tienda - a.tienda)[0]
  const t = r.trending[0]
  const pymeLider = r.pymes[0]

  let s = `En el período ${PERIODO_LARGO[r.periodo]} se registraron ${nf.format(r.totales.clics)} clics en productos (${pctS(deltaClics)} frente a ${PERIODO_PREV[r.periodo]}) y ${nf.format(r.totales.tienda)} clics para ir a la tienda (${pctS(deltaTienda)}). El ${pct1(r.pasoTienda)} de los interesados pasó a la tienda. `

  if (topClics && topTienda) {
    s += `El producto con más clics fue ${topClics.nombre} y el que más visitas envió a la tienda fue ${topTienda.nombre} (${topTienda.pymeNombre}). `
  }
  if (t) {
    s += `El producto en mayor tendencia es ${t.nombre}, con ${pctS(t.tendencia)}. `
  }
  if (pymeLider) {
    s += `${pymeLider.nombre} recibe el ${pct1(pymeLider.share)} de los clics a tienda${pymeLider.productoEstrella ? `, y su producto estrella es ${pymeLider.productoEstrella.nombre}` : ""}. `
  }

  const topCategoria = r.categorias.find((c) => c.id !== "sin_categoria" && c.tienda > 0)
  if (topCategoria) {
    s += `La categoría que más visitas envió a la tienda fue ${etiquetaIdCategoria(topCategoria.id).toLowerCase()} (${pct1(topCategoria.share)} de los clics a tienda). `
  }

  const conVolumen = [...r.productos].filter((p) => p.clics > 0)
  const medianaClics = conVolumen.map((p) => p.clics).sort((a, b) => a - b)[Math.floor(conVolumen.length / 2)] ?? 0
  const bajoPaso = conVolumen.filter((p) => p.clics >= medianaClics).sort((a, b) => a.pasoTienda - b.pasoTienda)[0]

  s +=
    bajoPaso && r.pasoTienda > 0 && bajoPaso.pasoTienda < r.pasoTienda * 0.75
      ? `${bajoPaso.nombre} despierta interés pero pocos pasan a la tienda (${pct1(bajoPaso.pasoTienda)}); conviene revisar su ficha: precio visible, fotos y botón de tienda.`
      : "Recomendación: asegurar stock de los productos en alza con sus pymes antes de destacarlos en la portada."

  return s
}
