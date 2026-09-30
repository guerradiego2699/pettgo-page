import { useMemo, useState } from "react"
import type { ActividadCalculada, AnalisisProyecto } from "../../types/proyecto"

const COLOR_ESTADO: Record<string, string> = {
  Completada: "#2f9e44",
  Atrasada: "#e0703a",
  Bloqueada: "#c8372d",
  "En desarrollo": "#f2b233",
  Pendiente: "#8c5a4a",
}

function calcularImpacto(codigo: string, actividades: ActividadCalculada[]) {
  const porCodigo = new Map(actividades.map((a) => [a.codigo, a]))
  const act = porCodigo.get(codigo)
  const directos = act?.dependientes_directos ?? []
  const visitados = new Set(directos)
  const indirectos: string[] = []
  const cadenas: string[][] = directos.map((d) => [codigo, d])
  const cola = directos.map((d) => ({ codigo: d, cadena: [codigo, d] }))
  while (cola.length) {
    const { codigo: c, cadena } = cola.shift()!
    const hijos = porCodigo.get(c)?.dependientes_directos ?? []
    for (const h of hijos) {
      if (!visitados.has(h)) {
        visitados.add(h)
        indirectos.push(h)
        const nuevaCadena = [...cadena, h]
        cadenas.push(nuevaCadena)
        cola.push({ codigo: h, cadena: nuevaCadena })
      }
    }
  }
  return { aguasArriba: act?.dependencias ?? [], directos, indirectos, total: visitados.size, cadenas }
}

function ArbolDependientes({ codigo, actividades, visitados = new Set<string>() }: { codigo: string; actividades: ActividadCalculada[]; visitados?: Set<string> }) {
  const act = actividades.find((a) => a.codigo === codigo)
  const esCiclo = visitados.has(codigo)
  const nuevosVisitados = new Set(visitados).add(codigo)
  const hijos = esCiclo ? [] : act?.dependientes_directos ?? []
  return (
    <li className="ml-4 border-l border-dashed border-brand-200 pl-3">
      <span className="text-sm text-ink-700">
        {codigo} {act?.actividad}
        {esCiclo && " ⟲ (ciclo)"}
      </span>
      {hijos.length > 0 && (
        <ul>
          {hijos.map((h) => (
            <ArbolDependientes key={h} codigo={h} actividades={actividades} visitados={nuevosVisitados} />
          ))}
        </ul>
      )}
    </li>
  )
}

function DependenciasTab({ analisis }: { analisis: AnalisisProyecto }) {
  const [seleccion, setSeleccion] = useState(analisis.actividades[0]?.codigo ?? "")
  const impacto = useMemo(() => (seleccion ? calcularImpacto(seleccion, analisis.actividades) : null), [seleccion, analisis.actividades])

  const nodosConEdge = analisis.grafo.nodos.filter((n) => analisis.grafo.aristas.some((e) => e.desde === n.codigo || e.hacia === n.codigo))
  const columnas = new Map<number, typeof nodosConEdge>()
  nodosConEdge.forEach((n) => {
    if (!columnas.has(n.nivel)) columnas.set(n.nivel, [])
    columnas.get(n.nivel)!.push(n)
  })
  const ANCHO = 150,
    ALTO = 34,
    GX = 60,
    GY = 12
  const posiciones = new Map<string, { x: number; y: number }>()
  let maxFilas = 0
  ;[...columnas.entries()].forEach(([col, nodos]) => {
    nodos.forEach((n, fila) => posiciones.set(n.codigo, { x: 10 + col * (ANCHO + GX), y: 10 + fila * (ALTO + GY) }))
    maxFilas = Math.max(maxFilas, nodos.length)
  })
  const anchoSvg = 20 + columnas.size * (ANCHO + GX)
  const altoSvg = 20 + maxFilas * (ALTO + GY)
  const rutaCriticaSet = new Set(analisis.ruta_critica.ruta)
  const enRutaCritica = (a: string, b: string) => {
    const ia = analisis.ruta_critica.ruta.indexOf(a)
    const ib = analisis.ruta_critica.ruta.indexOf(b)
    return ia >= 0 && ib === ia + 1
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={seleccion}
          onChange={(e) => setSeleccion(e.target.value)}
          className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          {analisis.actividades.map((a) => (
            <option key={a.codigo} value={a.codigo}>
              {a.codigo} · {a.actividad.slice(0, 50)}
            </option>
          ))}
        </select>
        {analisis.ciclos.length > 0 ? (
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
            Dependencias circulares: {analisis.ciclos.map((c) => c.join(" → ")).join(" | ")}
          </span>
        ) : (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Sin dependencias circulares</span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-brand-100 bg-white p-5">
          <h2 className="font-heading text-lg font-bold text-ink-900">Actividades afectadas</h2>
          {impacto ? (
            <dl className="mt-3 grid grid-cols-[170px_1fr] gap-x-3 gap-y-2 text-sm">
              <dt className="font-semibold text-ink-500">Depende de (aguas arriba)</dt>
              <dd>{impacto.aguasArriba.join(", ") || "ninguna"}</dd>
              <dt className="font-semibold text-ink-500">Dependencia directa</dt>
              <dd>{impacto.directos.join(", ") || "ninguna"}</dd>
              <dt className="font-semibold text-ink-500">Dependencia indirecta</dt>
              <dd>{impacto.indirectos.join(", ") || "ninguna"}</dd>
              <dt className="font-semibold text-ink-500">Potencialmente afectadas</dt>
              <dd className="font-bold text-ink-900">{impacto.total}</dd>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-ink-400">Selecciona una actividad.</p>
          )}
          {impacto && impacto.cadenas.length > 0 && (
            <div className="mt-3 text-xs text-ink-600">
              <strong>Cadenas:</strong>
              {impacto.cadenas.map((c, i) => (
                <div key={i}>{c.join(" → ")}</div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-brand-100 bg-white p-5">
          <h2 className="font-heading text-lg font-bold text-ink-900">Árbol de dependientes</h2>
          {seleccion ? (
            <ul className="mt-3">
              <ArbolDependientes codigo={seleccion} actividades={analisis.actividades} />
            </ul>
          ) : (
            <p className="mt-3 text-sm text-ink-400">Selecciona una actividad.</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-brand-100 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-heading text-lg font-bold text-ink-900">Grafo de dependencias</h2>
          <span className="text-xs text-ink-500">Columnas = nivel de dependencia · borde grueso = ruta crítica</span>
        </div>
        {nodosConEdge.length === 0 ? (
          <p className="mt-3 text-sm text-ink-400">Agrega dependencias entre actividades para ver el grafo.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <svg width={anchoSvg} height={altoSvg} role="img" aria-label="Grafo de dependencias">
              {analisis.grafo.aristas
                .filter((e) => posiciones.has(e.desde) && posiciones.has(e.hacia))
                .map((e, i) => {
                  const a = posiciones.get(e.desde)!,
                    b = posiciones.get(e.hacia)!
                  const x1 = a.x + ANCHO,
                    y1 = a.y + ALTO / 2,
                    x2 = b.x,
                    y2 = b.y + ALTO / 2,
                    mx = (x1 + x2) / 2
                  const critica = enRutaCritica(e.desde, e.hacia)
                  return (
                    <path
                      key={i}
                      d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2 - 4},${y2}`}
                      stroke={critica ? "#c96f2c" : "#cfae94"}
                      strokeWidth={critica ? 2.4 : 1.3}
                      fill="none"
                      markerEnd="url(#arrow)"
                    />
                  )
                })}
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                  <path d="M0,0 L10,5 L0,10 z" fill="#8c5a4a" />
                </marker>
              </defs>
              {nodosConEdge.map((n) => {
                const p = posiciones.get(n.codigo)!
                const enCritica = rutaCriticaSet.has(n.codigo)
                return (
                  <g key={n.codigo}>
                    <rect x={p.x} y={p.y} width={ANCHO} height={ALTO} rx={6} fill="#fff" stroke={enCritica ? "#3c1416" : "#f0e3d3"} strokeWidth={enCritica ? 2 : 1} />
                    <rect x={p.x} y={p.y} width={5} height={ALTO} rx={2} fill={COLOR_ESTADO[n.estado] ?? "#8c5a4a"} />
                    <text x={p.x + 11} y={p.y + 14} fontSize={11} fontWeight={600} fill="#3c1416">
                      {n.codigo} · {n.estado}
                    </text>
                    <text x={p.x + 11} y={p.y + 27} fontSize={11} fill="#3c1416">
                      {n.actividad.slice(0, 22)}
                      {n.actividad.length > 22 ? "…" : ""}
                    </text>
                  </g>
                )
              })}
            </svg>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-ink-500">
              {Object.entries(COLOR_ESTADO).map(([k, v]) => (
                <span key={k} className="flex items-center gap-1">
                  <span className="inline-block h-2.5 w-2.5 rounded" style={{ background: v }} /> {k}
                </span>
              ))}
              <span>Ruta crítica: {analisis.ruta_critica.ruta.join(" → ") || "—"}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DependenciasTab
