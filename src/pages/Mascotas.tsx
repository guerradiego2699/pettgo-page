import { useCallback, useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { useAuth } from "../context/AuthContext"
import PetForm from "../components/PetForm"
import type { Pet } from "../types/pet"

const speciesLabel: Record<Pet["species"], string> = {
  perro: "Perro",
  gato: "Gato",
}

function Mascotas() {
  const { user } = useAuth()
  const [pets, setPets] = useState<Pet[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingPet, setEditingPet] = useState<Pet | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadPets = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from("pets")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
    setPets(data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    loadPets()
  }, [loadPets])

  async function handleDelete(id: string) {
    setDeleting(true)
    await supabase.from("pets").delete().eq("id", id)
    setConfirmingId(null)
    setDeleting(false)
    loadPets()
  }

  function openCreate() {
    setEditingPet(null)
    setFormOpen(true)
  }

  function openEdit(pet: Pet) {
    setEditingPet(pet)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingPet(null)
  }

  function handleSaved() {
    closeForm()
    loadPets()
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-ink-900">Mis mascotas</h1>
          <p className="mt-1 text-sm text-ink-500">Los perros y gatos asociados a tu cuenta.</p>
        </div>
        {!formOpen && (
          <button
            type="button"
            onClick={openCreate}
            className="rounded-full bg-gradient-to-br from-brand-400 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:shadow-lg"
          >
            + Agregar mascota
          </button>
        )}
      </div>

      {formOpen && (
        <div className="mt-6">
          <PetForm pet={editingPet ?? undefined} onCancel={closeForm} onSaved={handleSaved} />
        </div>
      )}

      {loading ? (
        <p className="mt-10 text-ink-500">Cargando…</p>
      ) : pets.length === 0 && !formOpen ? (
        <p className="mt-10 text-ink-500">Aún no agregas ninguna mascota.</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {pets.map((pet) => (
            <div key={pet.id} className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-brand-100">
                  {pet.photo_url ? (
                    <img src={pet.photo_url} alt={pet.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-2xl" aria-hidden="true">
                      {pet.species === "perro" ? "🐶" : "🐱"}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold text-ink-900">{pet.name}</h3>
                  <p className="text-sm text-ink-500">
                    {speciesLabel[pet.species]}
                    {pet.breed ? ` · ${pet.breed}` : ""}
                    {pet.age_years ? ` · ${pet.age_years} años` : ""}
                  </p>
                </div>
              </div>

              {pet.highlight && <p className="mt-3 text-sm italic text-ink-500">"{pet.highlight}"</p>}

              {confirmingId === pet.id ? (
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-medium text-ink-700">¿Eliminar a {pet.name}?</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(pet.id)}
                    disabled={deleting}
                    className="font-semibold text-red-600 hover:underline disabled:opacity-60"
                  >
                    {deleting ? "Eliminando…" : "Sí, eliminar"}
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
                  <button type="button" onClick={() => openEdit(pet)} className="text-brand-700 hover:underline">
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingId(pet.id)}
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

export default Mascotas
