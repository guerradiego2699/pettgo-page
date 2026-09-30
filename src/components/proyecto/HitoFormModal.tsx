import { useState, type FormEvent } from "react"
import type { Session } from "@supabase/supabase-js"
import { proyectoApi } from "../../lib/proyectoApi"
import type { Hito } from "../../types/proyecto"

interface Props {
  session: Session
  hito: Hito | null
  actividadesCodigos: string[]
  onCerrar: () => void
  onGuardado: () => Promise<void>
  ejecutarConAprobacion: (fn: (aprobadoPor?: string) => Promise<void>) => Promise<void>
}

function HitoFormModal({ session, hito, actividadesCodigos, onCerrar, onGuardado, ejecutarConAprobacion }: Props) {
  const [form, setForm] = useState({
    codigo: hito?.codigo ?? "",
    nombre: hito?.nombre ?? "",
    fecha: hito?.fecha ?? "",
    estado_declarado: hito?.estado_declarado ?? "Pendiente",
    actividades_requeridas: hito?.actividades_requeridas.join(", ") ?? "",
    descripcion: hito?.descripcion ?? "",
  })
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setEnviando(true)
    const actividadesRequeridas = form.actividades_requeridas
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)

    try {
      if (hito) {
        await ejecutarConAprobacion(async (aprobadoPor) => {
          const datos: Record<string, unknown> = {
            nombre: form.nombre,
            fecha: form.fecha,
            estado_declarado: form.estado_declarado,
            actividades_requeridas: actividadesRequeridas,
            descripcion: form.descripcion || null,
          }
          if (aprobadoPor) {
            datos.confirmar_cambio_sensible = true
            datos.aprobado_por = aprobadoPor
          }
          const res = await proyectoApi.editarHito(session.access_token, hito.codigo, datos)
          if (res.actividades_inexistentes.length) {
            setAviso(`Atención: no existen las actividades ${res.actividades_inexistentes.join(", ")}.`)
          }
        })
      } else {
        const res = await proyectoApi.crearHito(session.access_token, {
          ...form,
          actividades_requeridas: actividadesRequeridas,
          descripcion: form.descripcion || null,
        })
        if (res.actividades_inexistentes.length) {
          setAviso(`Atención: no existen las actividades ${res.actividades_inexistentes.join(", ")}.`)
        }
      }
      await onGuardado()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el hito.")
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-ink-900/45 p-6">
      <form onSubmit={handleSubmit} className="mt-10 w-full max-w-lg rounded-2xl border border-brand-100 bg-white p-6 shadow-xl">
        <h2 className="font-heading text-lg font-bold text-ink-900">{hito ? `Editar ${hito.codigo}` : "Nuevo hito"}</h2>

        <label className="mt-4 flex flex-col gap-1 text-sm font-medium text-ink-700">
          ID *
          <input
            required
            disabled={!!hito}
            value={form.codigo}
            onChange={(e) => setForm({ ...form, codigo: e.target.value })}
            placeholder="HITO-06"
            pattern="[A-Za-z]+-\d+"
            className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none disabled:bg-ink-50"
          />
        </label>

        <label className="mt-4 flex flex-col gap-1 text-sm font-medium text-ink-700">
          Nombre *
          <input required minLength={3} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
        </label>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
            Fecha *
            <input required type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
            Estado declarado
            <select
              value={form.estado_declarado}
              onChange={(e) => setForm({ ...form, estado_declarado: e.target.value as typeof form.estado_declarado })}
              className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option>Pendiente</option>
              <option>En curso</option>
              <option>Cumplido</option>
            </select>
          </label>
        </div>

        <label className="mt-4 flex flex-col gap-1 text-sm font-medium text-ink-700">
          Actividades requeridas (IDs separados por coma)
          <input value={form.actividades_requeridas} onChange={(e) => setForm({ ...form, actividades_requeridas: e.target.value })} placeholder="PET-03, PET-05" className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
        </label>
        <p className="mt-1 text-xs text-ink-400">IDs disponibles: {actividadesCodigos.join(", ") || "ninguno todavía"}</p>

        <label className="mt-4 flex flex-col gap-1 text-sm font-medium text-ink-700">
          Descripción
          <input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
        </label>

        {aviso && <p className="mt-3 text-sm text-amber-700">{aviso}</p>}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex gap-3">
          <button type="submit" disabled={enviando} className="rounded-full bg-gradient-to-br from-brand-400 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:shadow-lg disabled:opacity-60">
            {enviando ? "Guardando…" : "Guardar hito"}
          </button>
          <button type="button" onClick={onCerrar} className="rounded-full border border-ink-900/15 px-5 py-2.5 text-sm font-medium text-ink-600 hover:bg-brand-50">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}

export default HitoFormModal
