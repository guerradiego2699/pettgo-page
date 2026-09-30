import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useAuth } from "../../context/AuthContext"
import { nf, pctS, pct1 } from "../../lib/tendenciasTexto"
import { analisisLocal } from "../../lib/tendenciasAnalisis"
import { construirInformePdf } from "../../lib/informePdf"
import { construirInformeExcel } from "../../lib/informeExcel"
import type { PeriodoTendencias, ProductoTendencia, TendenciasResponse } from "../../types/tendencias"

const PALETA = ["#c96f2c", "#292524", "#0ea5e9", "#f0aa66", "#5c2a22", "#2f6f5e"]
const PERIODOS: { id: PeriodoTendencias; label: string }[] = [
  { id: "diario", label: "Diario" },
  { id: "semanal", label: "Semanal" },
  { id: "mensual", label: "Mensual" },
]
const ESPECIE_LABEL: Record<string, string> = { perro: "Perro", gato: "Gato", ambos: "Perro y gato" }
const TAG_ESTILO: Record<string, string> = {
  up: "bg-emerald-100 text-emerald-700",
  down: "bg-red-100 text-red-700",
  flat: "bg-ink-100 text-ink-500",
}
const TAG_LABEL: Record<string, string> = { up: "En alza", down: "A la baja", flat: "Estable" }

function SelectorPeriodo({ periodo, onChange }: { periodo: PeriodoTendencias; onChange: (p: PeriodoTendencias) => void }) {
  return (
    <div className="flex gap-2">
      {PERIODOS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onChange(p.id)}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
            periodo === p.id ? "bg-brand-500 text-white" : "bg-brand-100 text-brand-700 hover:bg-brand-200"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}

function KpiCard({ label, value, delta, valueClass }: { label: string; value: string; delta?: string; valueClass?: string }) {
  return (
    <div className="rounded-2xl border border-brand-100 bg-white p-4">
      <div className="text-xs text-ink-500">{label}</div>
      <div className={`mt-1 font-heading text-xl font-bold text-ink-900 ${valueClass ?? ""}`}>{value}</div>
      {delta && <div className="mt-1 text-xs font-semibold text-ink-500">{delta}</div>}
    </div>
  )
}

function Funnel({ filas }: { filas: { label: string; sub?: string; valor: number; color: string }[] }) {
  const max = Math.max(...filas.map((f) => f.valor), 1)
  return (
    <div className="flex flex-col gap-3">
      {filas.map((f) => (
        <div key={f.label} className="grid grid-cols-[minmax(110px,160px)_1fr_auto] items-center gap-3">
          <div className="text-sm font-semibold text-ink-700">
            {f.label}
            {f.sub && <span className="block text-xs font-normal text-ink-400">{f.sub}</span>}
          </div>
          <div className="h-3.5 overflow-hidden rounded-full bg-brand-100">
            <div className="h-full rounded-full" style={{ width: `${Math.max(1.5, (100 * f.valor) / max)}%`, background: f.color }} />
          </div>
          <div className="min-w-[56px] text-right font-heading text-base font-semibold text-ink-900">{nf.format(f.valor)}</div>
        </div>
      ))}
    </div>
  )
}

function PayList({ filas }: { filas: { nombre: string; valor: number; pct?: string; color?: string }[] }) {
  return (
    <div className="mt-2 flex flex-col gap-2">
      {filas.map((f) => (
        <div key={f.nombre} className="flex items-center gap-2 text-sm">
          {f.color && <span className="h-2.5 w-2.5 shrink-0 rounded" style={{ background: f.color }} />}
          <span className="flex-1 truncate text-ink-700">{f.nombre}</span>
          <span className="font-semibold text-ink-900">{nf.format(f.valor)}</span>
          {f.pct && <span className="w-14 text-right text-xs text-ink-400">{f.pct}</span>}
        </div>
      ))}
    </div>
  )
}

function AdminTendencias() {
  const { session } = useAuth()
  const [tab, setTab] = useState<"resumen" | "productos" | "plataforma" | "informes">("resumen")
  const [periodo, setPeriodo] = useState<PeriodoTendencias>("diario")
  const [data, setData] = useState<TendenciasResponse | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filtroPyme, setFiltroPyme] = useState("")
  const [filtroEspecie, setFiltroEspecie] = useState("")
  const [orden, setOrden] = useState<"tendencia" | "clics" | "tienda" | "pasoTienda">("tendencia")

  const [reporteTexto, setReporteTexto] = useState<string | null>(null)
  const [generando, setGenerando] = useState(false)
  const [destinatario, setDestinatario] = useState("")
  const [enviandoInforme, setEnviandoInforme] = useState(false)
  const [notaInforme, setNotaInforme] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    if (!session) return
    setCargando(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/tendencias?periodo=${periodo}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || "No se pudieron cargar las tendencias.")
      setData(body)
      setReporteTexto(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las tendencias.")
    } finally {
      setCargando(false)
    }
  }, [session, periodo])

  useEffect(() => {
    cargar()
  }, [cargar])

  const pymesUnicas = useMemo(() => {
    if (!data) return []
    return data.resumen.pymes.map((p) => ({ nombre: p.nombre, email: p.email }))
  }, [data])

  const productosFiltrados = useMemo(() => {
    if (!data) return []
    let lista = data.resumen.productos
    if (filtroPyme) lista = lista.filter((p) => p.pymeEmail === filtroPyme)
    if (filtroEspecie) lista = lista.filter((p) => p.especie === filtroEspecie)
    const key: Record<string, (p: ProductoTendencia) => number> = {
      tendencia: (p) => p.tendencia,
      clics: (p) => p.clics,
      tienda: (p) => p.tienda,
      pasoTienda: (p) => p.pasoTienda,
    }
    return [...lista].sort((a, b) => key[orden](b) - key[orden](a))
  }, [data, filtroPyme, filtroEspecie, orden])

  function generarResumen() {
    if (!data) return
    setGenerando(true)
    setReporteTexto(analisisLocal(data.resumen))
    setGenerando(false)
  }

  function pdfActual() {
    if (!data) return null
    const texto = reporteTexto ?? analisisLocal(data.resumen)
    return construirInformePdf(data.resumen, data.plataforma, texto)
  }

  function descargarPdf() {
    const doc = pdfActual()
    if (!doc || !data) return
    doc.save(`informe-tendencias-pettgo-${data.resumen.periodo}.pdf`)
    setNotaInforme("Informe descargado.")
  }

  function descargarExcel() {
    if (!data) return
    const buffer = construirInformeExcel(data.resumen, data.plataforma)
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `datos-tendencias-pettgo-${data.resumen.periodo}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
    setNotaInforme("Excel descargado.")
  }

  async function enviarPorCorreo() {
    if (!session || !data) return
    const doc = pdfActual()
    if (!doc) return
    setEnviandoInforme(true)
    setNotaInforme(null)
    try {
      const pdfBase64 = doc.output("datauristring").split(",")[1]
      const res = await fetch("/api/admin/tendencias/informe", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          destinatario,
          periodoLabel: data.resumen.periodo,
          rangoTexto: data.resumen.rangoTexto,
          pdfBase64,
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || "No se pudo enviar el informe.")
      setNotaInforme(`Informe enviado a ${destinatario}.`)
    } catch (err) {
      setNotaInforme(err instanceof Error ? err.message : "No se pudo enviar el informe.")
    } finally {
      setEnviandoInforme(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <Link to="/admin" className="text-sm font-semibold text-brand-700 hover:underline">
        ← Panel de administrador
      </Link>

      <h1 className="mt-4 font-heading text-3xl font-bold text-ink-900">Tendencias</h1>
      <p className="mt-1 text-sm text-ink-500">Desempeño del catálogo de pymes e indicadores generales de PettGo.</p>

      <nav className="mt-6 flex flex-wrap gap-2">
        {(
          [
            ["resumen", "Resumen ejecutivo"],
            ["productos", "Desempeño de productos"],
            ["plataforma", "Indicadores de plataforma"],
            ["informes", "Informes y descargas"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === id ? "bg-ink-900 text-white" : "border border-brand-100 bg-white text-ink-600 hover:bg-brand-50"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      {cargando ? (
        <p className="mt-10 text-ink-500">Cargando tendencias…</p>
      ) : !data ? null : (
        <div className="mt-6">
          {tab === "resumen" && (
            <ResumenTab data={data} periodo={periodo} setPeriodo={setPeriodo} />
          )}
          {tab === "productos" && (
            <ProductosTab
              periodo={periodo}
              setPeriodo={setPeriodo}
              pymes={pymesUnicas}
              filtroPyme={filtroPyme}
              setFiltroPyme={setFiltroPyme}
              filtroEspecie={filtroEspecie}
              setFiltroEspecie={setFiltroEspecie}
              orden={orden}
              setOrden={setOrden}
              productos={productosFiltrados}
            />
          )}
          {tab === "plataforma" && <PlataformaTab data={data} periodo={periodo} setPeriodo={setPeriodo} />}
          {tab === "informes" && (
            <InformesTab
              periodo={periodo}
              setPeriodo={setPeriodo}
              reporteTexto={reporteTexto}
              generando={generando}
              onGenerar={generarResumen}
              onPdf={descargarPdf}
              onExcel={descargarExcel}
              destinatario={destinatario}
              setDestinatario={setDestinatario}
              enviando={enviandoInforme}
              onEnviar={enviarPorCorreo}
              nota={notaInforme}
            />
          )}
        </div>
      )}
    </div>
  )
}

function ResumenTab({
  data,
  periodo,
  setPeriodo,
}: {
  data: TendenciasResponse
  periodo: PeriodoTendencias
  setPeriodo: (p: PeriodoTendencias) => void
}) {
  const r = data.resumen
  const deltaClics = r.totales.clicsPrev ? r.totales.clics / r.totales.clicsPrev - 1 : 0
  const deltaTienda = r.totales.tiendaPrev ? r.totales.tienda / r.totales.tiendaPrev - 1 : 0
  const enAlza = r.productos.filter((p) => p.estadoTendencia === "up").length

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SelectorPeriodo periodo={periodo} onChange={setPeriodo} />
        <p className="text-sm font-medium text-ink-500">{r.rangoTexto}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard label="Clics en productos" value={nf.format(r.totales.clics)} delta={`${pctS(deltaClics)} vs. período anterior`} />
        <KpiCard label="Clics a la tienda" value={nf.format(r.totales.tienda)} delta={`${pctS(deltaTienda)} vs. período anterior`} />
        <KpiCard label="Paso a la tienda" value={pct1(r.pasoTienda)} />
        <KpiCard label="Productos en alza" value={`${enAlza} de ${r.productos.length}`} delta="crecen más de 12%" />
        <KpiCard
          label="Pyme líder"
          value={r.pymes[0]?.nombre ?? "—"}
          delta={r.pymes[0] ? `${pct1(r.pymes[0].share)} de los clics a tienda` : undefined}
        />
      </div>

      <div className="rounded-2xl border border-brand-100 bg-white p-5">
        <h2 className="font-heading text-lg font-bold text-ink-900">Del interés a la tienda</h2>
        <p className="text-xs text-ink-500">Clic en el producto (interés) → clic en "Ver en la tienda"</p>
        <div className="mt-4">
          <Funnel
            filas={[
              { label: "Clic en el producto", sub: "mostró interés", valor: r.totales.clics, color: "#f0aa66" },
              { label: "Clic a la tienda", sub: "fue a la tienda", valor: r.totales.tienda, color: "#292524" },
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-brand-100 bg-white p-5">
          <h2 className="font-heading text-lg font-bold text-ink-900">En tendencia</h2>
          <p className="text-xs text-ink-500">Mayor crecimiento de clics frente al período anterior</p>
          {r.trending.length === 0 ? (
            <p className="mt-4 text-sm text-ink-400">Ningún producto con volumen suficiente crece en este período.</p>
          ) : (
            <div className="mt-3 flex flex-col divide-y divide-brand-50">
              {r.trending.map((p, i) => (
                <div key={p.id} className="grid grid-cols-[24px_1fr_auto] items-center gap-3 py-2.5">
                  <div className="text-center font-heading text-lg font-bold text-ink-400">{i + 1}</div>
                  <div>
                    <div className="text-sm font-bold text-ink-900">{p.nombre}</div>
                    <div className="text-xs text-ink-500">
                      {p.pymeNombre} · {nf.format(p.clics)} clics · {nf.format(p.tienda)} a tienda
                    </div>
                  </div>
                  <div className="text-right font-heading text-base font-bold text-emerald-600">{pctS(p.tendencia)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-brand-100 bg-white p-5">
          <h2 className="font-heading text-lg font-bold text-ink-900">Clics en el tiempo</h2>
          <p className="text-xs text-ink-500">{r.serieSub}</p>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={r.serieDiaria}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ded0" />
                <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="vistas" name="Clics en producto" stroke="#c96f2c" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="clics" name="Clics a tienda" stroke="#292524" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-brand-100 bg-white p-5">
          <h2 className="font-heading text-lg font-bold text-ink-900">Más clics en productos</h2>
          <p className="text-xs text-ink-500">Clics en la ficha del producto (interés)</p>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...r.productos].sort((a, b) => b.clics - a.clics).slice(0, 8)} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ded0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11 }} width={110} />
                <Tooltip />
                <Bar dataKey="clics" fill="#c96f2c" radius={4} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border border-brand-100 bg-white p-5">
          <h2 className="font-heading text-lg font-bold text-ink-900">Más clics a la tienda</h2>
          <p className="text-xs text-ink-500">Clics en "Ver en la tienda"</p>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...r.productos].sort((a, b) => b.tienda - a.tienda).slice(0, 8)} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ded0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11 }} width={110} />
                <Tooltip />
                <Bar dataKey="tienda" fill="#292524" radius={4} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-brand-100 bg-white p-5">
        <h2 className="font-heading text-lg font-bold text-ink-900">Clics a la tienda por pyme</h2>
        <p className="text-xs text-ink-500">Visitas que PettGo le envía a cada pyme</p>
        <div className="mt-3 grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={r.pymes} dataKey="tienda" nameKey="nombre" innerRadius="55%" outerRadius="85%" paddingAngle={2}>
                  {r.pymes.map((_, i) => (
                    <Cell key={i} fill={PALETA[i % PALETA.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <PayList
            filas={r.pymes.map((p, i) => ({ nombre: p.nombre, valor: p.tienda, pct: pct1(p.share), color: PALETA[i % PALETA.length] }))}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-brand-100 bg-white p-5">
        <h2 className="font-heading text-lg font-bold text-ink-900">Producto estrella de cada pyme</h2>
        <p className="text-xs text-ink-500">El producto con más clics a la tienda de cada pyme en el período</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-brand-100 text-xs font-semibold uppercase text-ink-400">
              <tr>
                <th className="px-3 py-2">Pyme</th>
                <th className="px-3 py-2">Producto estrella</th>
                <th className="px-3 py-2 text-right">Clics a tienda</th>
                <th className="px-3 py-2 text-right">% de la pyme</th>
                <th className="px-3 py-2 text-right">Tendencia</th>
              </tr>
            </thead>
            <tbody>
              {r.pymes.map((p) => (
                <tr key={p.email} className="border-b border-brand-50 last:border-0">
                  <td className="px-3 py-2 font-semibold text-ink-900">
                    {p.nombre}
                    <div className="text-xs font-normal text-ink-400">
                      {p.nProductos} productos · {nf.format(p.tienda)} clics a tienda
                    </div>
                  </td>
                  <td className="px-3 py-2 text-ink-700">{p.productoEstrella?.nombre ?? "—"}</td>
                  <td className="px-3 py-2 text-right text-ink-700">{nf.format(p.productoEstrella?.tienda ?? 0)}</td>
                  <td className="px-3 py-2 text-right text-ink-700">{pct1(p.starShare)}</td>
                  <td className="px-3 py-2 text-right">
                    {p.productoEstrella && (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TAG_ESTILO[p.productoEstrella.estadoTendencia]}`}>
                        {TAG_LABEL[p.productoEstrella.estadoTendencia]} {pctS(p.productoEstrella.tendencia)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {r.pymes.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-ink-400">
                    Todavía no hay productos publicados con datos en este período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ProductosTab({
  periodo,
  setPeriodo,
  pymes,
  filtroPyme,
  setFiltroPyme,
  filtroEspecie,
  setFiltroEspecie,
  orden,
  setOrden,
  productos,
}: {
  periodo: PeriodoTendencias
  setPeriodo: (p: PeriodoTendencias) => void
  pymes: { nombre: string; email: string }[]
  filtroPyme: string
  setFiltroPyme: (v: string) => void
  filtroEspecie: string
  setFiltroEspecie: (v: string) => void
  orden: "tendencia" | "clics" | "tienda" | "pasoTienda"
  setOrden: (v: "tendencia" | "clics" | "tienda" | "pasoTienda") => void
  productos: ProductoTendencia[]
}) {
  return (
    <div className="flex flex-col gap-6">
      <SelectorPeriodo periodo={periodo} onChange={setPeriodo} />
      <div className="rounded-2xl border border-brand-100 bg-white p-5">
        <h2 className="font-heading text-lg font-bold text-ink-900">Catálogo completo</h2>
        <p className="text-xs text-ink-500">Filtra por pyme o mascota y ordena por el indicador que te interese.</p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs font-semibold text-ink-500">
            Pyme
            <select
              value={filtroPyme}
              onChange={(e) => setFiltroPyme(e.target.value)}
              className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="">Todas</option>
              {pymes.map((p) => (
                <option key={p.email} value={p.email}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-ink-500">
            Mascota
            <select
              value={filtroEspecie}
              onChange={(e) => setFiltroEspecie(e.target.value)}
              className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="">Todas</option>
              <option value="perro">Perro</option>
              <option value="gato">Gato</option>
              <option value="ambos">Perro y gato</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-ink-500">
            Ordenar por
            <select
              value={orden}
              onChange={(e) => setOrden(e.target.value as typeof orden)}
              className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="tendencia">Tendencia</option>
              <option value="clics">Clics en el producto</option>
              <option value="tienda">Clics a la tienda</option>
              <option value="pasoTienda">Paso a la tienda</option>
            </select>
          </label>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-brand-100 text-xs font-semibold uppercase text-ink-400">
              <tr>
                <th className="px-3 py-2">Producto</th>
                <th className="px-3 py-2">Pyme</th>
                <th className="px-3 py-2 text-right">Clics</th>
                <th className="px-3 py-2 text-right">A tienda</th>
                <th className="px-3 py-2 text-right">Paso a tienda</th>
                <th className="px-3 py-2 text-right">Tendencia</th>
              </tr>
            </thead>
            <tbody>
              {productos.map((p) => (
                <tr key={p.id} className="border-b border-brand-50 last:border-0">
                  <td className="px-3 py-2 font-semibold text-ink-900">
                    {p.nombre}
                    <div className="text-xs font-normal text-ink-400">{ESPECIE_LABEL[p.especie]}</div>
                  </td>
                  <td className="px-3 py-2 text-ink-600">{p.pymeNombre}</td>
                  <td className="px-3 py-2 text-right text-ink-700">{nf.format(p.clics)}</td>
                  <td className="px-3 py-2 text-right text-ink-700">{nf.format(p.tienda)}</td>
                  <td className="px-3 py-2 text-right text-ink-700">{pct1(p.pasoTienda)}</td>
                  <td className="px-3 py-2 text-right">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TAG_ESTILO[p.estadoTendencia]}`}>
                      {TAG_LABEL[p.estadoTendencia]} {pctS(p.tendencia)}
                    </span>
                  </td>
                </tr>
              ))}
              {productos.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-ink-400">
                    No hay productos publicados con esos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ink-400">
          Paso a la tienda: de los que hicieron clic en el producto, cuántos fueron a la tienda. Tendencia: variación combinada de
          clics en el producto y clics a la tienda frente al período anterior de igual duración.
        </p>
      </div>
    </div>
  )
}

function PlataformaTab({
  data,
  periodo,
  setPeriodo,
}: {
  data: TendenciasResponse
  periodo: PeriodoTendencias
  setPeriodo: (p: PeriodoTendencias) => void
}) {
  const p = data.plataforma
  const deltaUsuarios = p.usuarios.nuevos - p.usuarios.nuevosPrev >= 0
  const deltaMascotas = p.mascotas.nuevas - p.mascotas.nuevasPrev >= 0
  const edades = [
    { nombre: "Cachorro (menos de 1 año)", valor: p.mascotas.cachorros },
    { nombre: "Adulto (1 a 7 años)", valor: p.mascotas.adultos },
    { nombre: "Senior (8 años o más)", valor: p.mascotas.seniors },
  ]

  return (
    <div className="flex flex-col gap-8">
      <SelectorPeriodo periodo={periodo} onChange={setPeriodo} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Usuarios registrados" value={nf.format(p.usuarios.total)} delta={`+${nf.format(p.usuarios.nuevos)} nuevos`} />
        <KpiCard
          label="Mascotas registradas"
          value={nf.format(p.mascotas.total)}
          delta={`+${nf.format(p.mascotas.nuevas)} nuevas`}
          valueClass="text-brand-700"
        />
        <KpiCard label="Usuarios con mascota" value={pct1(p.activacion)} delta="registró al menos una" />
        <KpiCard label="Veterinarias publicadas" value={String(p.veterinarias.aprobadas)} delta={`${p.veterinarias.pendientes} esperan revisión`} valueClass="text-emerald-600" />
        <KpiCard label="Especialistas publicados" value={String(p.especialistas.aprobados)} delta={`${p.especialistas.pendientes} esperan revisión`} valueClass="text-emerald-600" />
        <KpiCard label="Productos publicados" value={String(p.propuestas.publicadas)} delta={`de ${p.propuestas.enviadas} propuestas`} />
      </div>

      <div className="rounded-2xl border border-brand-100 bg-white p-5">
        <h2 className="font-heading text-lg font-bold text-ink-900">Crecimiento de usuarios</h2>
        <p className="text-xs text-ink-500">Registros nuevos y total acumulado</p>
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={p.crecimientoUsuarios}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0ded0" />
              <XAxis dataKey="etiqueta" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="nuevos" name="Nuevos registros" fill="#c96f2c" radius={4} barSize={16} />
              <Line type="monotone" dataKey="acumulado" name="Total acumulado" stroke="#292524" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className={`mt-2 text-xs font-semibold ${deltaUsuarios ? "text-emerald-600" : "text-red-600"}`}>
          {deltaMascotas ? "Las mascotas nuevas" : "Las mascotas"} van {deltaMascotas ? "al alza" : "más lento"} este período.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-brand-100 bg-white p-5">
          <h2 className="font-heading text-lg font-bold text-ink-900">Mascotas de los usuarios</h2>
          <p className="text-xs text-ink-500">Qué tienen los usuarios registrados</p>
          <div className="mt-3 grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { nombre: "Perros", valor: p.mascotas.perros },
                      { nombre: "Gatos", valor: p.mascotas.gatos },
                    ]}
                    dataKey="valor"
                    nameKey="nombre"
                    innerRadius="55%"
                    outerRadius="85%"
                  >
                    <Cell fill="#c96f2c" />
                    <Cell fill="#2f6f5e" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <PayList
              filas={[
                { nombre: "Perros", valor: p.mascotas.perros, color: "#c96f2c" },
                { nombre: "Gatos", valor: p.mascotas.gatos, color: "#2f6f5e" },
              ]}
            />
          </div>
          <div className="mt-3 border-t border-brand-50 pt-3">
            <PayList filas={edades} />
          </div>
        </div>

        <div className="rounded-2xl border border-brand-100 bg-white p-5">
          <h2 className="font-heading text-lg font-bold text-ink-900">Propuestas a pymes</h2>
          <p className="text-xs text-ink-500">Desde que se invita a una pyme hasta que su producto aparece publicado</p>
          <div className="mt-4">
            <Funnel
              filas={[
                { label: "Propuestas enviadas", valor: p.propuestas.enviadas, color: "#f0aa66" },
                { label: "Publicadas", valor: p.propuestas.publicadas, color: "#292524" },
              ]}
            />
          </div>
          <p className="mt-3 text-xs text-ink-500">
            <b className="text-ink-900">{p.propuestas.pendientes}</b> pendientes, <b className="text-ink-900">{p.propuestas.rechazadas}</b>{" "}
            rechazadas y <b className="text-ink-900">{p.propuestas.vencidas}</b> vencidas sin respuesta (el enlace dura 14 días).
            {p.propuestas.diasRespuestaProm != null && (
              <> Las pymes tardan en promedio <b className="text-ink-900">{p.propuestas.diasRespuestaProm.toFixed(1).replace(".", ",")} días</b> en responder.</>
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-brand-100 bg-white p-5">
          <h2 className="font-heading text-lg font-bold text-ink-900">Veterinarias y especialistas</h2>
          <p className="text-xs text-ink-500">Estado de revisión del directorio y el mapa</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="border-b border-brand-100 text-xs font-semibold uppercase text-ink-400">
                <tr>
                  <th className="px-2 py-2">Tipo</th>
                  <th className="px-2 py-2 text-right">Publicadas</th>
                  <th className="px-2 py-2 text-right">En revisión</th>
                  <th className="px-2 py-2 text-right">Rechazadas</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-brand-50">
                  <td className="px-2 py-2 font-semibold text-ink-900">
                    Veterinarias
                    <div className="text-xs font-normal text-ink-400">{p.veterinarias.h24} atienden 24 horas</div>
                  </td>
                  <td className="px-2 py-2 text-right">{p.veterinarias.aprobadas}</td>
                  <td className="px-2 py-2 text-right">{p.veterinarias.pendientes}</td>
                  <td className="px-2 py-2 text-right">{p.veterinarias.rechazadas}</td>
                </tr>
                <tr>
                  <td className="px-2 py-2 font-semibold text-ink-900">
                    Especialistas
                    <div className="text-xs font-normal text-ink-400">peluquería, adiestramiento, etc.</div>
                  </td>
                  <td className="px-2 py-2 text-right">{p.especialistas.aprobados}</td>
                  <td className="px-2 py-2 text-right">{p.especialistas.pendientes}</td>
                  <td className="px-2 py-2 text-right">{p.especialistas.rechazados}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <h3 className="mt-4 text-sm font-semibold text-ink-700">Servicios más ofrecidos</h3>
          {p.servicios.length === 0 ? (
            <p className="mt-2 text-sm text-ink-400">Todavía no hay servicios cargados.</p>
          ) : (
            <PayList filas={p.servicios.map((s) => ({ nombre: s.nombre, valor: s.cantidad }))} />
          )}
        </div>

        <div className="rounded-2xl border border-brand-100 bg-white p-5">
          <h2 className="font-heading text-lg font-bold text-ink-900">Origen de las visitas</h2>
          <p className="text-xs text-ink-500">Desde dónde llegan quienes ven productos y van a la tienda</p>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={p.origenVisitas} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ded0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="origen" tick={{ fontSize: 11 }} width={90} />
                <Tooltip />
                <Bar dataKey="vistas" name="Vistas de productos" fill="#c96f2c" radius={4} barSize={10} />
                <Bar dataKey="clics" name="Clics a la tienda" fill="#292524" radius={4} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-brand-100 bg-white p-5">
        <h2 className="font-heading text-lg font-bold text-ink-900">Comunidad</h2>
        <p className="text-xs text-ink-500">Actividad del foro en el período</p>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <div className="text-xs text-ink-500">Temas nuevos</div>
            <div className="font-heading text-xl font-bold text-ink-900">{nf.format(data.plataforma.comunidad.temasNuevos)}</div>
          </div>
          <div>
            <div className="text-xs text-ink-500">Respuestas</div>
            <div className="font-heading text-xl font-bold text-ink-900">{nf.format(data.plataforma.comunidad.respuestas)}</div>
          </div>
          <div>
            <div className="text-xs text-ink-500">Temas sin respuesta</div>
            <div className="font-heading text-xl font-bold text-ink-900">{nf.format(data.plataforma.comunidad.temasSinRespuesta)}</div>
          </div>
          <div>
            <div className="text-xs text-ink-500">Reportes por revisar</div>
            <div className="font-heading text-xl font-bold text-ink-900">{nf.format(data.plataforma.comunidad.reportesPendientes)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InformesTab({
  periodo,
  setPeriodo,
  reporteTexto,
  generando,
  onGenerar,
  onPdf,
  onExcel,
  destinatario,
  setDestinatario,
  enviando,
  onEnviar,
  nota,
}: {
  periodo: PeriodoTendencias
  setPeriodo: (p: PeriodoTendencias) => void
  reporteTexto: string | null
  generando: boolean
  onGenerar: () => void
  onPdf: () => void
  onExcel: () => void
  destinatario: string
  setDestinatario: (v: string) => void
  enviando: boolean
  onEnviar: () => void
  nota: string | null
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-brand-100 bg-white p-5">
        <h2 className="font-heading text-lg font-bold text-ink-900">Período del reporte</h2>
        <p className="text-xs text-ink-500">Diario, semanal o mensual.</p>
        <div className="mt-3">
          <SelectorPeriodo periodo={periodo} onChange={setPeriodo} />
        </div>
      </div>

      <div className="rounded-2xl border border-brand-100 bg-white p-5">
        <h2 className="font-heading text-lg font-bold text-ink-900">Resumen del período</h2>
        <p className="text-xs text-ink-500">Un resumen calculado con los números reales del período (sin IA).</p>
        <button
          type="button"
          onClick={onGenerar}
          disabled={generando}
          className="mt-3 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:shadow-lg disabled:opacity-60"
        >
          {generando ? "Calculando…" : "Generar resumen del período"}
        </button>
        {reporteTexto && <p className="mt-4 rounded-xl bg-brand-50 p-4 text-sm leading-relaxed text-ink-700">{reporteTexto}</p>}
      </div>

      <div className="rounded-2xl border border-brand-100 bg-white p-5">
        <h2 className="font-heading text-lg font-bold text-ink-900">Informe</h2>
        <p className="text-xs text-ink-500">
          El PDF incluye indicadores, el paso de interés a tienda, rankings, pymes y el resumen del período. El Excel trae los datos
          para trabajarlos.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onPdf}
            className="rounded-full bg-gradient-to-br from-brand-400 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:shadow-lg"
          >
            Descargar informe PDF
          </button>
          <button
            type="button"
            onClick={onExcel}
            className="rounded-full border border-ink-900/15 px-5 py-2.5 text-sm font-medium text-ink-600 hover:bg-brand-50"
          >
            Descargar datos (Excel)
          </button>
        </div>

        <div className="mt-6 border-t border-brand-50 pt-5">
          <h3 className="text-sm font-semibold text-ink-700">Enviar por correo</h3>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <input
              type="email"
              required
              placeholder="correo@ejemplo.com"
              value={destinatario}
              onChange={(e) => setDestinatario(e.target.value)}
              className="w-64 rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={onEnviar}
              disabled={enviando || !destinatario}
              className="rounded-full border border-ink-900/15 px-5 py-2.5 text-sm font-medium text-ink-600 hover:bg-brand-50 disabled:opacity-50"
            >
              {enviando ? "Enviando…" : "Enviar el PDF por correo"}
            </button>
          </div>
        </div>

        {nota && <p className="mt-3 text-sm text-ink-600">{nota}</p>}
      </div>
    </div>
  )
}

export default AdminTendencias
