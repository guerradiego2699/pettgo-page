import { jsPDF } from "jspdf"
import type { ResumenTendencias, PlataformaTendencias } from "../types/tendencias"
import { nf, pctS, pct1, formatoClpCorto, PERIODO_PREV } from "./tendenciasTexto"
import { etiquetaIdCategoria } from "./categoriasProducto"

const C = {
  navy: [11, 42, 91] as [number, number, number],
  blue: [31, 78, 158] as [number, number, number],
  mid: [91, 141, 239] as [number, number, number],
  pale: [157, 184, 230] as [number, number, number],
  light: [232, 240, 251] as [number, number, number],
  line: [214, 224, 240] as [number, number, number],
  ink: [30, 41, 59] as [number, number, number],
  soft: [100, 116, 139] as [number, number, number],
  up: [31, 138, 76] as [number, number, number],
  down: [211, 47, 47] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
}

const PERIODO_LABEL: Record<string, string> = { diario: "diario", semanal: "semanal", mensual: "mensual" }

export function construirInformePdf(r: ResumenTendencias, p: PlataformaTendencias, resumenTexto: string): jsPDF {
  const W = 210,
    M = 14,
    CW = W - 2 * M,
    BOTTOM = 280
  const doc = new jsPDF({ unit: "mm", format: "a4" })
  const fill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2])
  const ink = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2])
  const stroke = (c: [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2])
  const font = (size: number, style?: "bold" | "normal") => {
    doc.setFont("helvetica", style || "normal")
    doc.setFontSize(size)
  }
  doc.setProperties({ title: "Informe de Tendencias — PettGo", author: "PettGo" })

  fill(C.navy)
  doc.rect(0, 0, W, 40, "F")
  fill(C.mid)
  doc.rect(0, 40, W, 1.6, "F")
  font(10, "bold")
  ink(C.pale)
  doc.text("PettGo  ·  Tendencias", M, 13)
  font(23, "bold")
  ink(C.white)
  doc.text("Informe de Tendencias", M, 26)
  font(9, "normal")
  ink(C.pale)
  doc.text("Productos en tendencia, clics en productos, clics a la tienda y visitas por pyme", M, 33.5)
  font(12, "bold")
  ink(C.white)
  doc.text("Reporte " + PERIODO_LABEL[r.periodo], W - M, 13, { align: "right" })
  font(9, "normal")
  ink(C.pale)
  doc.text("Período: " + r.rangoTexto, W - M, 19.5, { align: "right" })
  doc.text("Generado: " + new Date().toLocaleString("es-CL"), W - M, 25, { align: "right" })

  let y = 49
  const secTitle = (t: string, x: number, top: number) => {
    fill(C.blue)
    doc.rect(x, top, 1.1, 4.6, "F")
    font(10.5, "bold")
    ink(C.navy)
    doc.text(t, x + 3, top + 3.6)
    return top + 8
  }
  const panel = (x: number, yy: number, w: number, h: number) => {
    fill(C.white)
    stroke(C.line)
    doc.setLineWidth(0.3)
    doc.roundedRect(x, yy, w, h, 2.5, 2.5, "FD")
  }
  const ensure = (h: number) => {
    if (y + h > BOTTOM) {
      doc.addPage()
      y = 14
    }
  }

  // KPIs
  const kw = (CW - 8) / 3,
    kh = 22
  const topTendencia = r.trending[0]
  const deltaClics = r.totales.clicsPrev ? r.totales.clics / r.totales.clicsPrev - 1 : 0
  const deltaTienda = r.totales.tiendaPrev ? r.totales.tienda / r.totales.tiendaPrev - 1 : 0
  const deltaPasoTienda = r.pasoTiendaPrev ? r.pasoTienda - r.pasoTiendaPrev : 0
  const prev = PERIODO_PREV[r.periodo]
  const kpis: [string, string, string, [number, number, number]][] = [
    ["Clics en productos", nf.format(r.totales.clics), pctS(deltaClics) + " vs. " + prev, deltaClics >= 0 ? C.up : C.down],
    ["Clics a la tienda", nf.format(r.totales.tienda), pctS(deltaTienda) + " vs. " + prev, deltaTienda >= 0 ? C.up : C.down],
    [
      "Paso a la tienda",
      pct1(r.pasoTienda),
      (deltaPasoTienda >= 0 ? "+" : "") + (deltaPasoTienda * 100).toFixed(1).replace(".", ",") + " pp vs. " + prev,
      deltaPasoTienda >= 0 ? C.up : C.down,
    ],
    [
      "Productos en alza",
      r.productos.filter((x) => x.estadoTendencia === "up").length + " de " + r.productos.length,
      "crecen más de 12%",
      C.soft,
    ],
    ["Tienda líder", r.pymes[0]?.nombre ?? "—", r.pymes[0] ? pct1(r.pymes[0].share) + " de los clics a tienda" : "", C.soft],
    [
      "N° 1 en tendencia",
      topTendencia?.nombre ?? "—",
      topTendencia ? pctS(topTendencia.tendencia) + " de tendencia" : "sin productos en alza",
      topTendencia ? C.up : C.soft,
    ],
  ]
  kpis.forEach((k, i) => {
    const cx = M + (i % 3) * (kw + 4)
    const cy = y + Math.floor(i / 3) * (kh + 3)
    fill(C.light)
    doc.roundedRect(cx, cy, kw, kh, 2.5, 2.5, "F")
    fill(C.blue)
    doc.rect(cx, cy + 3, 1.2, kh - 6, "F")
    font(7.5, "normal")
    ink(C.soft)
    doc.text(k[0], cx + 5, cy + 6)
    font(k[1].length > 14 ? 11.5 : 15, "bold")
    ink(C.navy)
    doc.text(k[1], cx + 5, cy + 13.5)
    font(7.5, "bold")
    ink(k[3])
    doc.text(k[2], cx + 5, cy + 19)
  })
  y += kh * 2 + 3 + 7

  // Embudo interés -> tienda
  {
    const fh = 32
    ensure(fh + 10)
    y = secTitle("Del interés a la tienda", M, y)
    panel(M, y, CW, fh)
    const filas: [string, number, [number, number, number]][] = [
      ["Clic en el producto", r.totales.clics, C.pale],
      ["Clic a la tienda", r.totales.tienda, C.blue],
    ]
    const bx = M + 48,
      bw = CW - 48 - 26
    filas.forEach(([l, v, col], i) => {
      const ry = y + 7 + i * 8.5
      font(8.5, "normal")
      ink(C.ink)
      doc.text(l, M + 5, ry + 2.2)
      fill(C.light)
      doc.roundedRect(bx, ry, bw, 3.2, 1.6, 1.6, "F")
      fill(col)
      doc.roundedRect(bx, ry, Math.max(2, (bw * v) / Math.max(r.totales.clics, 1)), 3.2, 1.6, 1.6, "F")
      font(9, "bold")
      ink(C.navy)
      doc.text(nf.format(v), M + CW - 5, ry + 2.6, { align: "right" })
    })
    font(8, "normal")
    ink(C.soft)
    doc.text(`Paso a la tienda: ${pct1(r.pasoTienda)} de quienes hacen clic en un producto van a la tienda`, M + 5, y + fh - 4)
    y += fh + 7
  }

  // Clics en el tiempo (barras agrupadas: clics en producto y clics a la tienda)
  if (r.serieDiaria.length) {
    ensure(62)
    y = secTitle("Clics en el tiempo · " + r.serieSub.toLowerCase(), M, y)
    const ch = 54
    panel(M, y, CW, ch)
    fill(C.pale)
    doc.rect(M + 5, y + 4, 2.6, 2.6, "F")
    font(7.5, "normal")
    ink(C.soft)
    doc.text("Clics en producto", M + 9, y + 6.2)
    fill(C.blue)
    doc.rect(M + 40, y + 4, 2.6, 2.6, "F")
    doc.text("Clics a la tienda", M + 44, y + 6.2)
    const maxSerie = Math.max(...r.serieDiaria.map((x) => x.vistas), ...r.serieDiaria.map((x) => x.clics), 1)
    const exp = Math.pow(10, Math.floor(Math.log10(maxSerie)))
    const frac = maxSerie / exp
    const mxC = (frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 2.5 ? 2.5 : frac <= 5 ? 5 : 10) * exp
    const px = M + 15,
      pw = CW - 15 - 14,
      py = y + 11,
      ph = ch - 11 - 9
    stroke(C.line)
    doc.setLineWidth(0.15)
    font(6.5, "normal")
    for (let g = 0; g <= 4; g++) {
      const gy = py + ph - (ph * g) / 4
      doc.line(px, gy, px + pw, gy)
      ink(C.soft)
      doc.text(formatoClpCorto((mxC * g) / 4), px - 2, gy + 0.8, { align: "right" })
    }
    const n = r.serieDiaria.length,
      gw = pw / n,
      bw = gw * 0.32,
      step = Math.ceil(n / 8)
    r.serieDiaria.forEach((pt, i) => {
      const gx = px + gw * i,
        hc = (ph * pt.vistas) / mxC,
        ht = (ph * pt.clics) / mxC
      fill(C.pale)
      doc.rect(gx + gw * 0.16, py + ph - hc, bw, hc, "F")
      fill(C.blue)
      doc.rect(gx + gw * 0.16 + bw + 0.5, py + ph - ht, bw, ht, "F")
      if (i % step === 0 || i === n - 1) {
        ink(C.soft)
        doc.text(pt.dia, gx + gw / 2, py + ph + 4.5, { align: "center" })
      }
    })
    y += ch + 7
  }

  // Barras horizontales: en tendencia / clics a la tienda por pyme
  const half = (CW - 4) / 2,
    shades = [C.navy, C.blue, C.mid, C.pale]
  const hbars = (x0: number, y0: number, w: number, filas: { label: string; right: string; rc?: [number, number, number]; frac: number; color: [number, number, number] }[]) =>
    filas.forEach((row, i) => {
      const ry = y0 + i * 10
      font(8.2, "normal")
      ink(C.ink)
      doc.text(row.label, x0, ry + 3.3)
      font(8.2, "bold")
      ink(row.rc || C.navy)
      doc.text(row.right, x0 + w, ry + 3.3, { align: "right" })
      fill(C.light)
      doc.roundedRect(x0, ry + 5, w, 2.4, 1.2, 1.2, "F")
      fill(row.color)
      doc.roundedRect(x0, ry + 5, Math.max(2, w * row.frac), 2.4, 1.2, 1.2, "F")
    })
  const twoCols = (
    tL: string,
    tR: string,
    filasL: { label: string; right: string; rc?: [number, number, number]; frac: number; color: [number, number, number] }[],
    filasR: { label: string; right: string; rc?: [number, number, number]; frac: number; color: [number, number, number] }[]
  ) => {
    const nRows = Math.max(filasL.length, filasR.length, 1),
      ph2 = nRows * 10 + 6
    ensure(ph2 + 10)
    secTitle(tL, M, y)
    secTitle(tR, M + half + 4, y)
    const py2 = y + 8
    panel(M, py2, half, ph2)
    panel(M + half + 4, py2, half, ph2)
    hbars(M + 5, py2 + 4, half - 10, filasL)
    hbars(M + half + 9, py2 + 4, half - 10, filasR)
    y = py2 + ph2 + 7
  }
  const maxTendencia = Math.max(...r.trending.map((p) => p.tendencia), 0.01)
  const trendRows = r.trending.map((p, i) => ({
    label: i + 1 + ". " + p.nombre,
    right: pctS(p.tendencia),
    rc: C.up,
    frac: p.tendencia / maxTendencia,
    color: C.up,
  }))
  const pymeMax = Math.max(...r.pymes.map((p) => p.tienda), 1)
  twoCols(
    "En tendencia",
    "Participación de cada tienda",
    trendRows.length ? trendRows : [{ label: "Sin productos en alza con volumen suficiente", right: "", frac: 0, color: C.light }],
    r.pymes.map((p, i) => ({
      label: p.nombre,
      right: pct1(p.share),
      frac: p.tienda / pymeMax,
      color: shades[i % 4],
    }))
  )

  const topC = [...r.productos].sort((a, b) => b.clics - a.clics).slice(0, 6)
  const topT = r.pymes.slice(0, 6)
  if (topC.length || topT.length) {
    twoCols(
      "Productos con más clics",
      "Tiendas con más clics",
      topC.map((p, i) => ({ label: p.nombre, right: nf.format(p.clics), frac: p.clics / Math.max(topC[0]?.clics ?? 1, 1), color: shades[i % 4] })),
      topT.map((p, i) => ({ label: p.nombre, right: nf.format(p.tienda), frac: p.tienda / Math.max(topT[0]?.tienda ?? 1, 1), color: shades[i % 4] }))
    )
  }

  // Categorías: dónde se concentra el interés
  const catClics = [...r.categorias].sort((a, b) => b.clics - a.clics).filter((c) => c.clics > 0)
  const catTienda = [...r.categorias].sort((a, b) => b.tienda - a.tienda).filter((c) => c.tienda > 0)
  if (catClics.length || catTienda.length) {
    twoCols(
      "Categorías con más clics",
      "Categorías con más clics a la tienda",
      catClics.map((c, i) => ({
        label: etiquetaIdCategoria(c.id),
        right: nf.format(c.clics),
        frac: c.clics / Math.max(catClics[0]?.clics ?? 1, 1),
        color: shades[i % 4],
      })),
      catTienda.map((c, i) => ({
        label: etiquetaIdCategoria(c.id),
        right: nf.format(c.tienda) + "  ·  " + pct1(c.share),
        frac: c.tienda / Math.max(catTienda[0]?.tienda ?? 1, 1),
        color: shades[i % 4],
      }))
    )
  }

  // Producto estrella por pyme
  if (r.pymes.length) {
    const cols = [
      { t: "Tienda", x: M + 4 },
      { t: "Producto estrella", x: M + 50 },
      { t: "Clics a tienda", x: M + 122, r: true },
      { t: "% de la tienda", x: M + 146, r: true },
      { t: "Tendencia", x: M + CW - 4, r: true },
    ]
    const rh = 7,
      th = 8 + rh * r.pymes.length + 3
    ensure(th + 10)
    y = secTitle("Producto estrella de cada tienda", M, y)
    panel(M, y, CW, th)
    fill(C.light)
    doc.rect(M + 0.3, y + 0.3, CW - 0.6, 7, "F")
    font(7.5, "bold")
    ink(C.soft)
    cols.forEach((c) => doc.text(c.t, c.x, y + 5, c.r ? { align: "right" } : undefined))
    r.pymes.forEach((pm, i) => {
      const ry = y + 8 + i * rh + 4.6
      font(8.2, "bold")
      ink(C.navy)
      doc.text(pm.nombre, cols[0].x, ry)
      font(8.2, "normal")
      ink(C.ink)
      doc.text(pm.productoEstrella?.nombre ?? "—", cols[1].x, ry)
      doc.text(nf.format(pm.productoEstrella?.tienda ?? 0), cols[2].x, ry, { align: "right" })
      doc.text(pct1(pm.starShare), cols[3].x, ry, { align: "right" })
      if (pm.productoEstrella) {
        const est = pm.productoEstrella.estadoTendencia
        font(8.2, "bold")
        ink(est === "up" ? C.up : est === "down" ? C.down : C.soft)
        doc.text((est === "up" ? "En alza" : est === "down" ? "A la baja" : "Estable") + " " + pctS(pm.productoEstrella.tendencia), cols[4].x, ry, { align: "right" })
      }
      if (i < r.pymes.length - 1) {
        stroke(C.line)
        doc.setLineWidth(0.15)
        doc.line(M + 4, ry + 2.4, M + CW - 4, ry + 2.4)
      }
    })
    y += th + 7
  }

  // Plataforma (resumen)
  {
    const filas = [
      ["Usuarios registrados", nf.format(p.usuarios.total)],
      ["Mascotas registradas", nf.format(p.mascotas.total)],
      ["Clínicas veterinarias publicadas", String(p.veterinarias.aprobadas)],
      ["Profesionales publicados", String(p.especialistas.aprobados)],
      ["Propuestas enviadas a pymes", String(p.propuestas.enviadas)],
      ["Productos de pymes publicados", String(p.propuestas.publicadas)],
    ]
    const rh = 7,
      th = 8 + rh * filas.length + 3
    ensure(th + 10)
    y = secTitle("Indicadores de plataforma", M, y)
    panel(M, y, CW, th)
    filas.forEach(([l, v], i) => {
      const ry = y + 6 + i * rh
      font(8.5, "normal")
      ink(C.ink)
      doc.text(l, M + 5, ry)
      font(8.5, "bold")
      ink(C.navy)
      doc.text(v, M + CW - 5, ry, { align: "right" })
    })
    y += th + 7
  }

  // Resumen del período (texto)
  if (resumenTexto) {
    font(9, "normal")
    const lines = doc.splitTextToSize(resumenTexto, CW - 12)
    const rh2 = 9 + lines.length * 3.8
    ensure(rh2 + 8)
    y = secTitle("Análisis del agente", M, y)
    fill(C.light)
    doc.roundedRect(M, y, CW, rh2, 2.5, 2.5, "F")
    fill(C.blue)
    doc.rect(M, y + 3, 1.2, rh2 - 6, "F")
    font(9, "normal")
    ink(C.ink)
    doc.text(lines, M + 6, y + 7)
    y += rh2 + 7
  }

  const total = doc.getNumberOfPages()
  for (let pg = 1; pg <= total; pg++) {
    doc.setPage(pg)
    if (pg > 1) {
      fill(C.navy)
      doc.rect(0, 0, W, 5, "F")
    }
    stroke(C.line)
    doc.setLineWidth(0.3)
    doc.line(M, 286, W - M, 286)
    font(7.5, "normal")
    ink(C.soft)
    doc.text("PettGo  ·  Tendencias — Reporte " + PERIODO_LABEL[r.periodo], M, 291)
    doc.text("Página " + pg + " de " + total, W - M, 291, { align: "right" })
  }

  return doc
}
