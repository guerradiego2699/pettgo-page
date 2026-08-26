import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import SpecialistForm from "../../components/SpecialistForm"
import type { Specialist } from "../../types/specialist"

const statusLabels: Record<Specialist["status"], string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
}

const statusClasses: Record<Specialist["status"], string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
}

function AdminEspecialistas() {
  const [specialists, setSpecialists] = useState<Specialist[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingSpecialist, setEditingSpecialist] = useState<Specialist | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const loadSpecialists = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from("specialists").select("*").order("created_at", { ascending: false })
    setSpecialists(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadSpecialists()
  }, [loadSpecialists])

  function openCreate() {
    setEditingSpecialist(null)
    setFormOpen(true)
  }

  function openEdit(specialist: Specialist) {
    setEditingSpecialist(specialist)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingSpecialist(null)
  }

  function handleSaved() {
    closeForm()
    loadSpecialists()
  }

  async function handleDelete(id: string) {
    await supabase.from("specialists").delete().eq("id", id)
    setConfirmingId(null)
    loadSpecialists()
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <Link to="/admin" className="text-sm font-semibold text-brand-700 hover:underline">
        ← Panel de administrador
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-3xl font-bold text-ink-900">Especialistas</h1>
        {!formOpen && (
          <button
            type="button"
            onClick={openCreate}
            className="rounded-full bg-gradient-to-br from-brand-400 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:shadow-lg"
          >
            + Nuevo especialista
          </button>
        )}
      </div>

      {formOpen && (
        <div className="mt-6">
          <SpecialistForm specialist={editingSpecialist ?? undefined} onCancel={closeForm} onSaved={handleSaved} />
        </div>
      )}

      {loading ? (
        <p className="mt-10 text-ink-500">Cargando…</p>
      ) : specialists.length === 0 && !formOpen ? (
        <p className="mt-10 text-ink-500">No hay especialistas creados todavía.</p>
      ) : (
        <div className="mt-8 flex flex-col gap-4">
          {specialists.map((specialist) => (
            <div key={specialist.id} className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-heading text-lg font-bold text-ink-900">{specialist.name}</h3>
                  <p className="text-sm text-ink-500">{specialist.schedule}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[specialist.status]}`}
                >
                  {statusLabels[specialist.status]}
                </span>
              </div>

              {confirmingId === specialist.id ? (
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-medium text-ink-700">¿Eliminar a {specialist.name}?</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(specialist.id)}
                    className="font-semibold text-red-600 hover:underline"
                  >
                    Sí, eliminar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingId(null)}
                    className="font-semibold text-ink-500 hover:underline"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className="mt-4 flex gap-4 text-sm font-semibold">
                  <button
                    type="button"
                    onClick={() => openEdit(specialist)}
                    className="text-brand-700 hover:underline"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingId(specialist.id)}
                    className="text-red-600 hover:underline"
                  >
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AdminEspecialistas
