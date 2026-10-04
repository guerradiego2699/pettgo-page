import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { proyectoApi, ErrorAprobacion } from "../../lib/proyectoApi"
import ErrorBoundary from "../../components/ErrorBoundary"
import AprobacionModal from "../../components/proyecto/AprobacionModal"
import ActividadesTab from "../../components/proyecto/ActividadesTab"
import DependenciasTab from "../../components/proyecto/DependenciasTab"
import RiesgosTab from "../../components/proyecto/RiesgosTab"
import AlertasTab from "../../components/proyecto/AlertasTab"
import ReporteTab from "../../components/proyecto/ReporteTab"
import ChatTab from "../../components/proyecto/ChatTab"
import PropuestasTab from "../../components/proyecto/PropuestasTab"
import AreasTab from "../../components/proyecto/AreasTab"
import AuditoriaTab from "../../components/proyecto/AuditoriaTab"
import HitoFormModal from "../../components/proyecto/HitoFormModal"
import { analisisLocalProyecto } from "../../lib/proyectoAnalisis"
import type { AnalisisProyecto, Hito } from "../../types/proyecto"

export interface AprobacionPendiente {
  accion: string
  camposSensibles?: string[]
  dependientesDirectos?: string[]
  reintentar: (nombre: string) => Promise<void>
}

const TABS = [
  ["dashboard", "Dashboard"],
  ["actividades", "Actividades"],
  ["dependencias", "Dependencias"],
  ["riesgos", "Riesgos y prioridades"],
  ["alertas", "Alertas"],
  ["reporte", "Reporte"],
  ["chat", "Chat con el agente"],
  ["propuestas", "Propuestas"],
  ["areas", "Áreas"],
  ["auditoria", "Auditoría"],
] as const
type TabId = (typeof TABS)[number][0]

const ESTADO_GENERAL_ESTILO: Record<string, string> = {
  ROJO: "bg-red-100 text-red-700",
  AMARILLO: "bg-amber-100 text-amber-700",
  VERDE: "bg-emerald-100 text-emerald-700",
}

function KpiCard({ label, value, sub, flag }: { label: string; value: string; sub?: string; flag?: "critical" | "warning" | "good" }) {
  const borde = flag === "critical" ? "border-l-4 border-red-500" : flag === "warning" ? "border-l-4 border-amber-400" : flag === "good" ? "border-l-4 border-emerald-400" : ""
  return (
    <div className={`rounded-2xl border border-brand-100 bg-white p-4 ${borde}`}>
      <div className="text-xs font-semibold text-ink-500">{label}</div>
      <div className="mt-1 font-heading text-xl font-bold text-ink-900">{value}</div>
      {sub && <div className="mt-1 text-xs text-ink-400">{sub}</div>}
    </div>
  )
}

function AdminProyecto() {
  const { session } = useAuth()
  const [tab, setTab] = useState<TabId>("dashboard")
  const [analisis, setAnalisis] = useState<AnalisisProyecto | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aprobacion, setAprobacion] = useState<AprobacionPendiente | null>(null)
  const [aprobacionEnviando, setAprobacionEnviando] = useState(false)
  const [hitoFormAbierto, setHitoFormAbierto] = useState(false)
  const [hitoEditando, setHitoEditando] = useState<Hito | null>(null)

  const cargar = useCallback(
    async (registrar?: "analisis" | "reporte") => {
      if (!session) return
      setCargando(true)
      setError(null)
      try {
        const data = await proyectoApi.analisis(session.access_token, registrar)
        setAnalisis(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudieron cargar los datos del proyecto.")
      } finally {
        setCargando(false)
      }
    },
    [session]
  )

  useEffect(() => {
    cargar()
  }, [cargar])

  async function ejecutarConAprobacion(fn: (aprobadoPor?: string) => Promise<void>) {
    try {
      await fn()
    } catch (err) {
      if (err instanceof ErrorAprobacion) {
        setAprobacion({ accion: err.accion, camposSensibles: err.camposSensibles, dependientesDirectos: err.dependientesDirectos, reintentar: (nombre) => fn(nombre) })
      } else {
        setError(err instanceof Error ? err.message : "Ocurrió un error.")
      }
    }
  }

  async function confirmarAprobacion(nombre: string) {
    if (!aprobacion) return
    setAprobacionEnviando(true)
    try {
      await aprobacion.reintentar(nombre)
      setAprobacion(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error.")
      setAprobacion(null)
    } finally {
      setAprobacionEnviando(false)
    }
  }

  function abrirNuevoHito() {
    setHitoEditando(null)
    setHitoFormAbierto(true)
  }
  function abrirEditarHito(hito: Hito) {
    setHitoEditando(hito)
    setHitoFormAbierto(true)
  }

  if (!session) return null

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <Link to="/admin" className="text-sm font-semibold text-brand-700 hover:underline">
        ← Panel de administrador
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold text-ink-900">Gestión de Proyecto</h1>
          <p className="mt-1 text-sm text-ink-500">Actividades, dependencias, riesgos y auditoría del equipo de PettGo.</p>
        </div>
        {analisis && (
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${ESTADO_GENERAL_ESTILO[analisis.resumen.estado_general]}`}>
            Estado general: {analisis.resumen.estado_general}
          </span>
        )}
      </div>

      <nav className="mt-6 flex flex-wrap gap-2">
        {TABS.map(([id, label]) => (
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
        <p className="mt-10 text-ink-500">Cargando datos del proyecto…</p>
      ) : !analisis ? null : (
        <ErrorBoundary key={tab} mensaje="No se pudo mostrar esta pestaña.">
        <div className="mt-6">
          {tab === "dashboard" && (
            <DashboardTab analisis={analisis} onRecargar={() => cargar("analisis")} onNuevoHito={abrirNuevoHito} onEditarHito={abrirEditarHito} setTab={setTab} />
          )}
          {tab === "actividades" && (
            <ActividadesTab session={session} analisis={analisis} onCambio={cargar} ejecutarConAprobacion={ejecutarConAprobacion} />
          )}
          {tab === "dependencias" && <DependenciasTab analisis={analisis} />}
          {tab === "riesgos" && <RiesgosTab analisis={analisis} />}
          {tab === "alertas" && <AlertasTab analisis={analisis} />}
          {tab === "reporte" && <ReporteTab session={session} analisis={analisis} onGenerado={() => cargar("reporte")} />}
          {tab === "chat" && <ChatTab analisis={analisis} />}
          {tab === "propuestas" && <PropuestasTab session={session} analisis={analisis} />}
          {tab === "areas" && <AreasTab session={session} />}
          {tab === "auditoria" && <AuditoriaTab session={session} />}
        </div>
        </ErrorBoundary>
      )}

      {hitoFormAbierto && (
        <HitoFormModal
          session={session}
          hito={hitoEditando}
          actividadesCodigos={analisis?.actividades.map((a) => a.codigo) ?? []}
          onCerrar={() => setHitoFormAbierto(false)}
          onGuardado={async () => {
            setHitoFormAbierto(false)
            await cargar()
          }}
          ejecutarConAprobacion={ejecutarConAprobacion}
        />
      )}

      {aprobacion && (
        <AprobacionModal
          accion={aprobacion.accion}
          camposSensibles={aprobacion.camposSensibles}
          dependientesDirectos={aprobacion.dependientesDirectos}
          enviando={aprobacionEnviando}
          onCancelar={() => setAprobacion(null)}
          onConfirmar={confirmarAprobacion}
        />
      )}
    </div>
  )
}

function DashboardTab({
  analisis,
  onRecargar,
  onNuevoHito,
  onEditarHito,
  setTab,
}: {
  analisis: AnalisisProyecto
  onRecargar: () => void
  onNuevoHito: () => void
  onEditarHito: (hito: Hito) => void
  setTab: (t: TabId) => void
}) {
  const r = analisis.resumen
  const [analizando, setAnalizando] = useState(false)
  const [resumenTexto, setResumenTexto] = useState<string | null>(null)

  function analizar() {
    setAnalizando(true)
    onRecargar()
    setResumenTexto(analisisLocalProyecto(analisis))
    setAnalizando(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={analizar}
          disabled={analizando}
          className="rounded-full bg-gradient-to-br from-brand-400 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:shadow-lg disabled:opacity-60"
        >
          {analizando ? "Analizando…" : "Analizar proyecto"}
        </button>
        <button
          type="button"
          onClick={() => setTab("reporte")}
          className="rounded-full border border-ink-900/15 px-5 py-2.5 text-sm font-medium text-ink-600 hover:bg-brand-50"
        >
          Generar reporte
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard label="Estado general" value={r.estado_general} flag={r.estado_general === "ROJO" ? "critical" : r.estado_general === "AMARILLO" ? "warning" : "good"} />
        <KpiCard label="Avance general" value={`${r.avance_general}%`} sub={`esperado ${r.avance_esperado_general}%`} />
        <KpiCard label="Actividades" value={String(r.total_actividades)} />
        <KpiCard label="Completadas" value={String(r.completadas)} flag="good" />
        <KpiCard label="En desarrollo" value={String(r.en_desarrollo)} />
        <KpiCard label="Pendientes" value={String(r.pendientes)} />
        <KpiCard label="Atrasadas" value={String(r.atrasadas)} flag={r.atrasadas ? "warning" : "good"} />
        <KpiCard label="Bloqueadas" value={String(r.bloqueadas)} flag={r.bloqueadas ? "critical" : "good"} />
        <KpiCard label="Riesgos críticos" value={String(r.riesgos_criticos)} sub={`${r.riesgos_altos} altos`} flag={r.riesgos_criticos ? "critical" : "good"} />
        <KpiCard label="Hitos en riesgo" value={`${r.hitos_en_riesgo}/${r.hitos_total}`} flag={r.hitos_en_riesgo ? "warning" : "good"} />
      </div>

      <div className="rounded-2xl border border-brand-100 bg-white p-5">
        <div className="flex items-center justify-between">
          <strong className="text-ink-900">Avance general</strong>
          <span className="text-xs text-ink-500">
            {r.avance_general}% real · {r.avance_esperado_general}% esperado ·{" "}
            <span className={r.desviacion_general >= 0 ? "text-emerald-600" : "text-red-600"}>
              {r.desviacion_general >= 0 ? "+" : ""}
              {r.desviacion_general} pp
            </span>
          </span>
        </div>
        <div className="relative mt-3 h-3.5 rounded-full bg-brand-100">
          <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600" style={{ width: `${r.avance_general}%` }} />
          <div className="absolute -top-0.5 h-4.5 w-0.5 bg-ink-900" style={{ left: `calc(${r.avance_esperado_general}% - 1px)` }} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-brand-100 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold text-ink-900">Hitos</h2>
            <button type="button" onClick={onNuevoHito} className="text-sm font-semibold text-brand-700 hover:underline">
              + Nuevo hito
            </button>
          </div>
          {analisis.hitos.length === 0 ? (
            <p className="mt-3 text-sm text-ink-400">Sin hitos registrados.</p>
          ) : (
            <div className="mt-3 flex flex-col divide-y divide-brand-50">
              {analisis.hitos.map((h) => (
                <div key={h.codigo} className="py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-ink-900">
                      {h.codigo} · {h.nombre}
                    </span>
                    <button type="button" onClick={() => onEditarHito(h)} className="text-xs font-semibold text-brand-700 hover:underline">
                      Editar
                    </button>
                  </div>
                  <div className="text-xs text-ink-500">
                    {h.fecha} · {h.estado_calculado === "Cumplido" ? "cumplido" : h.dias_restantes >= 0 ? `faltan ${h.dias_restantes} días` : "fecha vencida"} ·
                    avance promedio {h.avance_promedio}%
                  </div>
                  {h.motivos.length > 0 && <div className="text-xs text-amber-700">{h.motivos.join("; ")}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-brand-100 bg-white p-5">
          <h2 className="font-heading text-lg font-bold text-ink-900">Actividades críticas</h2>
          {analisis.actividades_criticas.length === 0 ? (
            <p className="mt-3 text-sm text-ink-400">Sin actividades críticas por ahora.</p>
          ) : (
            <div className="mt-3 flex flex-col divide-y divide-brand-50">
              {analisis.actividades_criticas.map((c) => (
                <div key={c.codigo} className="py-2.5">
                  <div className="text-sm font-semibold text-ink-900">
                    {c.codigo} · {c.actividad}
                  </div>
                  <div className="text-xs text-ink-500">
                    {c.area} · afecta a {c.afectadas} actividad(es)
                  </div>
                  <div className="text-xs text-ink-600">{c.motivos.join(" · ")}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-brand-100 bg-white p-5">
          <h2 className="font-heading text-lg font-bold text-ink-900">Alertas principales</h2>
          {analisis.alertas.length === 0 ? (
            <p className="mt-3 text-sm text-ink-400">Sin alertas por ahora.</p>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              {analisis.alertas.slice(0, 4).map((a, i) => (
                <div key={i} className="rounded-lg bg-brand-50 p-3 text-xs text-ink-700">
                  <span className="font-bold">
                    [{a.nivel}] {a.tipo}
                  </span>{" "}
                  — {a.actividad}: {a.problema}
                </div>
              ))}
              <button type="button" onClick={() => setTab("alertas")} className="text-left text-sm font-semibold text-brand-700 hover:underline">
                Ver todas las alertas ({analisis.alertas.length}) →
              </button>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-brand-100 bg-white p-5">
          <h2 className="font-heading text-lg font-bold text-ink-900">Análisis</h2>
          {resumenTexto ? (
            <p className="mt-3 text-sm leading-relaxed text-ink-700">{resumenTexto}</p>
          ) : (
            <p className="mt-3 text-sm text-ink-400">Presiona «Analizar proyecto» para ver un resumen calculado con los datos actuales.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminProyecto
