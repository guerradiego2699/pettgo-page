import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import VetForm from "../../components/VetForm"
import type { Vet } from "../../types/vet"

const statusLabels: Record<Vet["status"], string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
}

const statusClasses: Record<Vet["status"], string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
}

function AdminVeterinarias() {
  const [vets, setVets] = useState<Vet[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingVet, setEditingVet] = useState<Vet | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const loadVets = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from("vets").select("*").order("created_at", { ascending: false })
    setVets(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadVets()
  }, [loadVets])

  function openCreate() {
    setEditingVet(null)
    setFormOpen(true)
  }

  function openEdit(vet: Vet) {
    setEditingVet(vet)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingVet(null)
  }

  function handleSaved() {
    closeForm()
    loadVets()
  }

  async function handleDelete(id: string) {
    await supabase.from("vets").delete().eq("id", id)
    setConfirmingId(null)
    loadVets()
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <Link to="/admin" className="text-sm font-semibold text-brand-700 hover:underline">
        ← Panel de administrador
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-3xl font-bold text-ink-900">Veterinarias</h1>
        {!formOpen && (
          <button
            type="button"
            onClick={openCreate}
            className="rounded-full bg-gradient-to-br from-brand-400 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:shadow-lg"
          >
            + Nueva veterinaria
          </button>
        )}
      </div>

      {formOpen && (
        <div className="mt-6">
          <VetForm vet={editingVet ?? undefined} onCancel={closeForm} onSaved={handleSaved} />
        </div>
      )}

      {loading ? (
        <p className="mt-10 text-ink-500">Cargando…</p>
      ) : vets.length === 0 && !formOpen ? (
        <p className="mt-10 text-ink-500">No hay veterinarias creadas todavía.</p>
      ) : (
        <div className="mt-8 flex flex-col gap-4">
          {vets.map((vet) => (
            <div key={vet.id} className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-heading text-lg font-bold text-ink-900">{vet.name}</h3>
                  <p className="text-sm text-ink-500">{vet.address}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[vet.status]}`}
                >
                  {statusLabels[vet.status]}
                </span>
              </div>

              {confirmingId === vet.id ? (
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-medium text-ink-700">¿Eliminar {vet.name}?</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(vet.id)}
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
                  <button type="button" onClick={() => openEdit(vet)} className="text-brand-700 hover:underline">
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingId(vet.id)}
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

export default AdminVeterinarias
