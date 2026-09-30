import * as XLSX from "xlsx"
import type { ResumenTendencias, PlataformaTendencias } from "../types/tendencias"

function sheet(rows: unknown[][], widths: number[]) {
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws["!cols"] = widths.map((w) => ({ wch: w }))
  return ws
}

export function construirInformeExcel(r: ResumenTendencias, p: PlataformaTendencias): ArrayBuffer {
  const wb = XLSX.utils.book_new()

  const resumen: unknown[][] = [
    ["PettGo — Informe de Tendencias"],
    [],
    ["Período", r.rangoTexto],
    ["Generado", new Date().toLocaleString("es-CL")],
    [],
    ["Indicador", "Valor"],
    ["Clics en productos", r.totales.clics],
    ["Clics a la tienda", r.totales.tienda],
    ["Paso a la tienda", +r.pasoTienda.toFixed(4)],
    ["Productos en alza", r.productos.filter((x) => x.estadoTendencia === "up").length],
    ["Pyme líder", r.pymes[0]?.nombre ?? "—"],
    [],
    ["Usuarios registrados", p.usuarios.total],
    ["Mascotas registradas", p.mascotas.total],
    ["Veterinarias publicadas", p.veterinarias.aprobadas],
    ["Especialistas publicados", p.especialistas.aprobados],
    ["Propuestas enviadas a pymes", p.propuestas.enviadas],
    ["Productos publicados", p.propuestas.publicadas],
    [],
    ["Top en tendencia", "Pyme", "Tendencia"],
    ...r.trending.map((x) => [x.nombre, x.pymeNombre, +x.tendencia.toFixed(4)]),
  ]
  const wsR = sheet(resumen, [30, 26, 20])
  XLSX.utils.book_append_sheet(wb, wsR, "Resumen")

  const prods: unknown[][] = [
    [
      "Producto",
      "Pyme",
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
        x.categoria ?? "",
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
  XLSX.utils.book_append_sheet(wb, wsP, "Productos")

  const pym: unknown[][] = [
    ["Pyme", "Correo", "Productos", "Clics en producto", "Clics a tienda", "Participación", "Producto estrella", "Clics del estrella"],
    ...r.pymes.map((x) => [
      x.nombre,
      x.email,
      x.nProductos,
      x.clics,
      x.tienda,
      +x.share.toFixed(4),
      x.productoEstrella?.nombre ?? "—",
      x.productoEstrella?.tienda ?? 0,
    ]),
  ]
  const wsY = sheet(pym, [22, 26, 10, 17, 14, 13, 24, 16])
  XLSX.utils.book_append_sheet(wb, wsY, "Pymes")

  const serie: unknown[][] = [["Período", "Vistas (clics en producto)", "Clics a la tienda"], ...r.serieDiaria.map((s) => [s.dia, s.vistas, s.clics])]
  const wsS = sheet(serie, [16, 22, 16])
  XLSX.utils.book_append_sheet(wb, wsS, "Serie de tiempo")

  const origen: unknown[][] = [["Origen", "Vistas", "Clics a tienda"], ...p.origenVisitas.map((o) => [o.origen, o.vistas, o.clics])]
  const wsO = sheet(origen, [18, 12, 14])
  XLSX.utils.book_append_sheet(wb, wsO, "Origen de visitas")

  return XLSX.write(wb, { bookType: "xlsx", type: "array" })
}
