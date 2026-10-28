import * as XLSX from "xlsx"
import type { ResumenTendencias, PlataformaTendencias } from "../types/tendencias"
import { PERIODO_PREV } from "./tendenciasTexto"
import { etiquetaIdCategoria } from "./categoriasProducto"

function sheet(rows: unknown[][], widths: number[]) {
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws["!cols"] = widths.map((w) => ({ wch: w }))
  return ws
}

// Aplica formato de porcentaje (0,0%) a las celdas numéricas indicadas.
function formatoPorcentaje(ws: XLSX.WorkSheet, direcciones: string[]) {
  for (const a of direcciones) {
    const celda = ws[a]
    if (celda && typeof celda.v === "number") celda.z = "0.0%"
  }
}

export function construirInformeExcel(r: ResumenTendencias, p: PlataformaTendencias): ArrayBuffer {
  const wb = XLSX.utils.book_new()
  const prev = PERIODO_PREV[r.periodo]
  const deltaClics = r.totales.clicsPrev ? r.totales.clics / r.totales.clicsPrev - 1 : 0
  const deltaTienda = r.totales.tiendaPrev ? r.totales.tienda / r.totales.tiendaPrev - 1 : 0
  const deltaPaso = r.pasoTiendaPrev ? r.pasoTienda - r.pasoTiendaPrev : 0

  const resumen: unknown[][] = [
    ["PettGo — Informe de Tendencias"],
    [],
    ["Período", r.rangoTexto],
    ["Generado", new Date().toLocaleString("es-CL")],
    [],
    ["Indicador", "Valor", "Variación vs. " + prev],
    ["Clics en productos", r.totales.clics, +deltaClics.toFixed(4)],
    ["Clics a la tienda", r.totales.tienda, +deltaTienda.toFixed(4)],
    ["Paso a la tienda", +r.pasoTienda.toFixed(4), +deltaPaso.toFixed(4)],
    ["Productos en alza", r.productos.filter((x) => x.estadoTendencia === "up").length, ""],
    ["Tienda líder", r.pymes[0]?.nombre ?? "—", ""],
    [],
    ["Usuarios registrados", p.usuarios.total],
    ["Mascotas registradas", p.mascotas.total],
    ["Clínicas veterinarias publicadas", p.veterinarias.aprobadas],
    ["Profesionales publicados", p.especialistas.aprobados],
    ["Propuestas enviadas a pymes", p.propuestas.enviadas],
    ["Productos de pymes publicados", p.propuestas.publicadas],
    [],
    ["Top en tendencia", "Tienda", "Tendencia"],
    ...r.trending.map((x) => [x.nombre, x.pymeNombre, +x.tendencia.toFixed(4)]),
  ]
  const wsR = sheet(resumen, [32, 26, 24])
  const filaTrending = resumen.length - r.trending.length + 1
  formatoPorcentaje(wsR, ["C7", "C8", "B9", "C9", ...r.trending.map((_, i) => "C" + (filaTrending + i))])
  XLSX.utils.book_append_sheet(wb, wsR, "Resumen")

  const prods: unknown[][] = [
    [
      "Producto",
      "Tienda",
      "Categoría",
      "Mascota",
      "Clics en producto",
      "Clics a tienda",
      "Paso a tienda",
      "Clics producto (anterior)",
      "Clics tienda (anterior)",
      "Tendencia",
      "Estado",
    ],
    ...[...r.productos]
      .sort((a, b) => b.tendencia - a.tendencia)
      .map((x) => [
        x.nombre,
        x.pymeNombre,
        etiquetaIdCategoria(x.categoria ?? "sin_categoria"),
        x.especie === "ambos" ? "Perro y gato" : x.especie === "perro" ? "Perro" : "Gato",
        x.clics,
        x.tienda,
        +x.pasoTienda.toFixed(4),
        x.clicsPrev,
        x.tiendaPrev,
        +x.tendencia.toFixed(4),
        x.estadoTendencia === "up" ? "En alza" : x.estadoTendencia === "down" ? "A la baja" : "Estable",
      ]),
  ]
  const wsP = sheet(prods, [24, 20, 14, 13, 17, 14, 13, 23, 21, 11, 11])
  formatoPorcentaje(
    wsP,
    prods.slice(1).flatMap((_, i) => ["G" + (i + 2), "J" + (i + 2)])
  )
  wsP["!autofilter"] = { ref: "A1:K" + prods.length }
  XLSX.utils.book_append_sheet(wb, wsP, "Productos")

  const pym: unknown[][] = [
    [
      "Tienda",
      "Correo",
      "Productos",
      "Clics en producto",
      "Clics a tienda",
      "Participación en clics a tienda",
      "Producto estrella",
      "Clics a tienda del estrella",
      "% de la tienda",
    ],
    ...r.pymes.map((x) => [
      x.nombre,
      x.email,
      x.nProductos,
      x.clics,
      x.tienda,
      +x.share.toFixed(4),
      x.productoEstrella?.nombre ?? "—",
      x.productoEstrella?.tienda ?? 0,
      +x.starShare.toFixed(4),
    ]),
  ]
  const wsY = sheet(pym, [22, 26, 10, 17, 14, 28, 24, 25, 14])
  formatoPorcentaje(
    wsY,
    pym.slice(1).flatMap((_, i) => ["F" + (i + 2), "I" + (i + 2)])
  )
  XLSX.utils.book_append_sheet(wb, wsY, "Tiendas")

  const cats: unknown[][] = [
    ["Categoría", "Productos", "Clics en producto", "Clics a tienda", "Participación en clics a tienda", "Paso a tienda", "Tendencia", "Producto estrella"],
    ...r.categorias.map((c) => [
      etiquetaIdCategoria(c.id),
      c.nProductos,
      c.clics,
      c.tienda,
      +c.share.toFixed(4),
      +c.pasoTienda.toFixed(4),
      +c.tendencia.toFixed(4),
      c.productoEstrella ?? "—",
    ]),
  ]
  const wsC = sheet(cats, [18, 10, 17, 14, 28, 13, 11, 24])
  formatoPorcentaje(
    wsC,
    cats.slice(1).flatMap((_, i) => ["E" + (i + 2), "F" + (i + 2), "G" + (i + 2)])
  )
  XLSX.utils.book_append_sheet(wb, wsC, "Categorías")

  const serie: unknown[][] = [["Período", "Clics en producto", "Clics a la tienda"], ...r.serieDiaria.map((s) => [s.dia, s.vistas, s.clics])]
  const wsS = sheet(serie, [16, 22, 16])
  XLSX.utils.book_append_sheet(wb, wsS, "Serie de tiempo")

  const origen: unknown[][] = [["Origen", "Clics en producto", "Clics a tienda"], ...p.origenVisitas.map((o) => [o.origen, o.vistas, o.clics])]
  const wsO = sheet(origen, [18, 18, 14])
  XLSX.utils.book_append_sheet(wb, wsO, "Origen de visitas")

  return XLSX.write(wb, { bookType: "xlsx", type: "array" })
}
