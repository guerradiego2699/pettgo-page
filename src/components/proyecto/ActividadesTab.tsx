import { useMemo, useState, type FormEvent } from "react"
import type { Session } from "@supabase/supabase-js"
import { proyectoApi } from "../../lib/proyectoApi"
import { ESTADO_ESTILO, RIESGO_ESTILO, PRIORIDAD_ESTILO } from "../../lib/proyectoEstilos"
import { AREAS_PROYECTO } from "../../types/proyecto"
import type { ActividadCalculada, AnalisisProyecto } from "../../types/proyecto"

const ESTADOS = ["Pendiente", "En desarrollo", "Completada", "Bloqueada", "Atrasada"] as const
const PRIORIDADES = ["Baja", "Media", "Alta", "Crítica"] as const
const RIESGOS = ["Bajo", "Medio", "Alto", "Crítico"] as const

const CAMPOS_INICIALES = {
  codigo: "",
  area: AREAS_PROYECTO[0] as string,
  actividad: "",
  responsable: "",
  estado: "Pendiente" as string,
  fecha_inicio: "",
  fecha_limite: "",
  avance_esperado: "0",
  avance_real: "0",
  prioridad: "Media" as string,
  riesgo: "Bajo" as string,
  dependencias: "",
  observaciones: "",
}

interface Props {
  session: Session
  analisis: AnalisisProyecto
  onCambio: () => Promise<void>
  ejecutarConAprobacion: (fn: (aprobadoPor?: string) => Promise<void>) => Promise<void>
}

function ActividadesTab({ session, analisis, onCambio, ejecutarConAprobacion }: Props) {
  const [busqueda, setBusqueda] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("")
  const [filtroArea, setFiltroArea] = useState("")
  const [formAbierto, setFormAbierto] = useState(false)
  const [editando, setEditando] = useState<ActividadCalculada | null>(null)
  const [detalle, setDetalle] = useState<ActividadCalculada | null>(null)
  const [confirmandoEliminar, setConfirmandoEliminar] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const filas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return analisis.actividades.filter(
      (a) =>
        (!filtroEstado || a.estado_calculado === filtroEstado) &&
        (!filtroArea || a.area === filtroArea) &&
        (!q || `${a.codigo} ${a.actividad} ${a.responsable ?? ""}`.toLowerCase().includes(q))
    )
  }, [analisis.actividades, busqueda, filtroEstado, filtroArea])

  function abrirNueva() {
    setEditando(null)
    setFormAbierto(true)
  }
  function abrirEditar(a: ActividadCalculada) {
    setEditando(a)
    setFormAbierto(true)
  }

  async function handleEliminar(codigo: string) {
    setError(null)
    await ejecutarConAprobacion(async (aprobadoPor) => {
      await proyectoApi.eliminarActividad(session.access_token, codigo, aprobadoPor)
      setConfirmandoEliminar(null)
      await onCambio()
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={abrirNueva}
          className="rounded-full bg-gradient-to-br from-brand-400 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:shadow-lg"
        >
          + Nueva actividad
        </button>
        <input
          type="search"
          placeholder="Buscar ID o texto…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => (
            <option key={e}>{e}</option>
          ))}
        </select>
        <select
          value={filtroArea}
          onChange={(e) => setFiltroArea(e.target.value)}
          className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">Todas las áreas</option>
          {AREAS_PROYECTO.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-2xl border border-brand-100 bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-brand-100 text-xs font-semibold uppercase text-ink-400">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Actividad</th>
              <th className="px-3 py-2">Área</th>
              <th className="px-3 py-2">Responsable</th>
              <th className="px-3 py-2">Fecha límite</th>
              <th className="px-3 py-2 text-right">Avance</th>
              <th className="px-3 py-2 text-right">Desv.</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Riesgo</th>
              <th className="px-3 py-2">Prioridad</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filas.map((a) => (
              <tr key={a.codigo} className="border-b border-brand-50 last:border-0">
                <td className="px-3 py-2">
                  <button type="button" onClick={() => setDetalle(a)} className="font-semibold text-brand-700 hover:underline">
                    {a.codigo}
                  </button>
                  {a.en_ruta_critica && <div className="text-[10px] text-ink-400">ruta crítica</div>}
                </td>
                <td className="px-3 py-2 text-ink-700">{a.actividad}</td>
                <td className="px-3 py-2 text-xs text-ink-500">{a.area.replace(/^Gestión (de |del )?/, "")}</td>
                <td className="px-3 py-2 text-xs text-ink-500">{a.responsable || <span className="text-red-500">sin asignar</span>}</td>
                <td className="px-3 py-2 text-xs text-ink-500">{a.fecha_limite || "—"}</td>
                <td className="px-3 py-2 text-right text-ink-700">{a.avance_real}%</td>
                <td className={`px-3 py-2 text-right ${a.desviacion < 0 ? "text-red-600" : a.desviacion > 0 ? "text-emerald-600" : "text-ink-500"}`}>
                  {a.desviacion > 0 ? "+" : ""}
                  {a.desviacion} pp
                </td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ESTADO_ESTILO[a.estado_calculado]}`}>{a.estado_calculado}</span>
                </td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${RIESGO_ESTILO[a.riesgo_calculado]}`}>{a.riesgo_calculado}</span>
                </td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORIDAD_ESTILO[a.prioridad_sugerida]}`}>{a.prioridad_sugerida}</span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-col gap-1 text-xs font-semibold">
                    <button type="button" onClick={() => abrirEditar(a)} className="text-ink-600 hover:underline">
                      Editar
                    </button>
                    {confirmandoEliminar === a.codigo ? (
                      <span className="flex gap-2">
                        <button type="button" onClick={() => handleEliminar(a.codigo)} className="text-red-600 hover:underline">
                          Sí
                        </button>
                        <button type="button" onClick={() => setConfirmandoEliminar(null)} className="text-ink-500 hover:underline">
                          No
                        </button>
                      </span>
                    ) : (
                      <button type="button" onClick={() => setConfirmandoEliminar(a.codigo)} className="text-red-600 hover:underline">
                        Eliminar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={11} className="px-3 py-6 text-center text-ink-400">
                  No hay actividades con esos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-400">
        Estado, desviación, riesgo y prioridad sugerida se recalculan solos a partir de las fechas y el avance que cargues.
      </p>

      {formAbierto && (
        <ActividadFormModal
          session={session}
          actividad={editando}
          codigosExistentes={analisis.actividades.map((a) => a.codigo)}
          onCerrar={() => setFormAbierto(false)}
          onGuardado={async () => {
            setFormAbierto(false)
            await onCambio()
          }}
          ejecutarConAprobacion={ejecutarConAprobacion}
        />
      )}

      {detalle && <DetalleActividadModal actividad={detalle} onCerrar={() => setDetalle(null)} />}
    </div>
  )
}

function ActividadFormModal({
  session,
  actividad,
  codigosExistentes,
  onCerrar,
  onGuardado,
  ejecutarConAprobacion,
}: {
  session: Session
  actividad: ActividadCalculada | null
  codigosExistentes: string[]
  onCerrar: () => void
  onGuardado: () => Promise<void>
  ejecutarConAprobacion: (fn: (aprobadoPor?: string) => Promise<void>) => Promise<void>
}) {
  const [form, setForm] = useState(() =>
    actividad
      ? {
          codigo: actividad.codigo,
          area: actividad.area,
          actividad: actividad.actividad,
          responsable: actividad.responsable ?? "",
          estado: actividad.estado,
          fecha_inicio: actividad.fecha_inicio ?? "",
          fecha_limite: actividad.fecha_limite ?? "",
          avance_esperado: String(actividad.avance_esperado),
          avance_real: String(actividad.avance_real),
          prioridad: actividad.prioridad,
          riesgo: actividad.riesgo,
          dependencias: actividad.dependencias.join(", "),
          observaciones: actividad.observaciones ?? "",
        }
      : CAMPOS_INICIALES
  )
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setEnviando(true)

    const dependencias = form.dependencias
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)

    try {
      if (actividad) {
        await ejecutarConAprobacion(async (aprobadoPor) => {
          const datos: Record<string, unknown> = {
            area: form.area,
            actividad: form.actividad,
            responsable: form.responsable || null,
            estado: form.estado,
            fecha_inicio: form.fecha_inicio || null,
            fecha_limite: form.fecha_limite || null,
            avance_esperado: Number(form.avance_esperado),
            avance_real: Number(form.avance_real),
            prioridad: form.prioridad,
            riesgo: form.riesgo,
            dependencias,
            observaciones: form.observaciones || null,
          }
          if (aprobadoPor) {
            datos.confirmar_cambio_sensible = true
            datos.aprobado_por = aprobadoPor
          }
          await proyectoApi.editarActividad(session.access_token, actividad.codigo, datos)
        })
      } else {
        if (codigosExistentes.includes(form.codigo)) {
          setError(`Ya existe una actividad con el código ${form.codigo}.`)
          setEnviando(false)
          return
        }
        await proyectoApi.crearActividad(session.access_token, {
          ...form,
          avance_esperado: Number(form.avance_esperado),
          avance_real: Number(form.avance_real),
          dependencias,
          responsable: form.responsable || null,
          fecha_inicio: form.fecha_inicio || null,
          fecha_limite: form.fecha_limite || null,
          observaciones: form.observaciones || null,
        })
      }
      await onGuardado()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la actividad.")
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-ink-900/45 p-6">
      <form onSubmit={handleSubmit} className="mt-10 w-full max-w-2xl rounded-2xl border border-brand-100 bg-white p-6 shadow-xl">
        <h2 className="font-heading text-lg font-bold text-ink-900">{actividad ? `Editar ${actividad.codigo}` : "Nueva actividad"}</h2>
        {actividad && <p className="mt-1 text-xs text-ink-500">Cambiar fechas, responsable, prioridad, dependencias o el texto de la actividad requiere aprobación.</p>}

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
            ID *
            <input
              required
              disabled={!!actividad}
              value={form.codigo}
              onChange={(e) => setForm({ ...form, codigo: e.target.value })}
              placeholder="PET-27"
              pattern="[A-Za-z]+-\d+"
              className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none disabled:bg-ink-50"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
            Área
            <select value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none">
              {AREAS_PROYECTO.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-4 flex flex-col gap-1 text-sm font-medium text-ink-700">
          Actividad *
          <input
            required
            minLength={3}
            value={form.actividad}
            onChange={(e) => setForm({ ...form, actividad: e.target.value })}
            className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </label>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
            Responsable
            <input value={form.responsable} onChange={(e) => setForm({ ...form, responsable: e.target.value })} className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
            Estado
            <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none">
              {ESTADOS.map((e) => (
                <option key={e}>{e}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
            Fecha inicio
            <input type="date" value={form.fecha_inicio} onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })} className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
            Fecha límite
            <input type="date" value={form.fecha_limite} onChange={(e) => setForm({ ...form, fecha_limite: e.target.value })} className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
          </label>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
            Avance esperado %
            <input type="number" min={0} max={100} value={form.avance_esperado} onChange={(e) => setForm({ ...form, avance_esperado: e.target.value })} className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
            Avance real %
            <input type="number" min={0} max={100} value={form.avance_real} onChange={(e) => setForm({ ...form, avance_real: e.target.value })} className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
          </label>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
            Prioridad oficial
            <select value={form.prioridad} onChange={(e) => setForm({ ...form, prioridad: e.target.value })} className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none">
              {PRIORIDADES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
            Riesgo declarado
            <select value={form.riesgo} onChange={(e) => setForm({ ...form, riesgo: e.target.value })} className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none">
              {RIESGOS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-4 flex flex-col gap-1 text-sm font-medium text-ink-700">
          Dependencias (IDs separados por coma)
          <input value={form.dependencias} onChange={(e) => setForm({ ...form, dependencias: e.target.value })} placeholder="PET-03, PET-05" className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
        </label>

        <label className="mt-4 flex flex-col gap-1 text-sm font-medium text-ink-700">
          Observaciones
          <textarea value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} rows={2} className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
        </label>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex gap-3">
          <button type="submit" disabled={enviando} className="rounded-full bg-gradient-to-br from-brand-400 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:shadow-lg disabled:opacity-60">
            {enviando ? "Guardando…" : "Guardar"}
          </button>
          <button type="button" onClick={onCerrar} className="rounded-full border border-ink-900/15 px-5 py-2.5 text-sm font-medium text-ink-600 hover:bg-brand-50">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}

function DetalleActividadModal({ actividad, onCerrar }: { actividad: ActividadCalculada; onCerrar: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-ink-900/45 p-6">
      <div className="mt-10 w-full max-w-xl rounded-2xl border border-brand-100 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-heading text-lg font-bold text-ink-900">
            {actividad.codigo} · {actividad.actividad}
          </h2>
          <button type="button" onClick={onCerrar} className="text-ink-400 hover:text-ink-700">
            ✕
          </button>
        </div>
        <dl className="mt-4 grid grid-cols-[160px_1fr] gap-x-3 gap-y-2 text-sm">
          <dt className="font-semibold text-ink-500">Área</dt>
          <dd>{actividad.area}</dd>
          <dt className="font-semibold text-ink-500">Responsable</dt>
          <dd>{actividad.responsable || <span className="text-red-500">sin asignar</span>}</dd>
          <dt className="font-semibold text-ink-500">Fechas</dt>
          <dd>
            {actividad.fecha_inicio || "?"} → {actividad.fecha_limite || "?"}
          </dd>
          <dt className="font-semibold text-ink-500">Estado</dt>
          <dd>
            {actividad.estado} declarado / {actividad.estado_calculado} calculado
          </dd>
          <dt className="font-semibold text-ink-500">Avance</dt>
          <dd>
            {actividad.avance_real}% real, {actividad.avance_esperado}% esperado ({actividad.desviacion > 0 ? "+" : ""}
            {actividad.desviacion} pp)
          </dd>
          <dt className="font-semibold text-ink-500">Días de atraso</dt>
          <dd>{actividad.dias_atraso}</dd>
          <dt className="font-semibold text-ink-500">Depende de</dt>
          <dd>{actividad.dependencias.join(", ") || "ninguna"}</dd>
          <dt className="font-semibold text-ink-500">Dependen de ella</dt>
          <dd>{actividad.dependientes_directos.join(", ") || "ninguna"}</dd>
          <dt className="font-semibold text-ink-500">Riesgo</dt>
          <dd>
            {actividad.riesgo_calculado} calculado ({actividad.puntaje_riesgo} pts) · declarado {actividad.riesgo}
          </dd>
          <dt className="font-semibold text-ink-500">Prioridad</dt>
          <dd>
            oficial {actividad.prioridad} · sugerida {actividad.prioridad_sugerida}
          </dd>
          <dt className="font-semibold text-ink-500">Observaciones</dt>
          <dd>{actividad.observaciones || "—"}</dd>
        </dl>

        {actividad.factores_riesgo.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-bold text-ink-900">Factores de riesgo</h3>
            <ul className="mt-1 list-disc pl-5 text-sm text-ink-600">
              {actividad.factores_riesgo.map((f, i) => (
                <li key={i}>
                  {f.regla}: {f.detalle} (+{f.puntos})
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default ActividadesTab
