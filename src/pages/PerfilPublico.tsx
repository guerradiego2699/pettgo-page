import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { supabase } from "../lib/supabase"
import type { Pet } from "../types/pet"

interface PerfilPublicoData {
  id: string
  name: string
  avatar_url: string | null
}

const speciesLabel: Record<Pet["species"], string> = {
  perro: "Perro",
  gato: "Gato",
}

function PerfilPublico() {
  const { id } = useParams()
  const [perfil, setPerfil] = useState<PerfilPublicoData | null>(null)
  const [pets, setPets] = useState<Pet[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    setLoading(true)

    Promise.all([
      supabase.from("public_profiles").select("id, name, avatar_url").eq("id", id).single(),
      supabase.from("public_pets").select("*").eq("owner_id", id).order("created_at", { ascending: false }),
    ]).then(([{ data: perfilData }, { data: petsData }]) => {
      setPerfil(perfilData)
      setPets(petsData ?? [])
      setLoading(false)
    })
  }, [id])

  if (loading) return <p className="mx-auto max-w-3xl px-6 py-16 text-center text-ink-500">Cargando…</p>

  if (!perfil) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center px-6 py-24 text-center">
        <h1 className="font-heading text-2xl font-bold text-ink-900">No encontramos este perfil</h1>
        <Link to="/comunidad" className="mt-6 text-sm font-semibold text-brand-700 hover:underline">
          ← Volver a la comunidad
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-brand-100">
          {perfil.avatar_url ? (
            <img src={perfil.avatar_url} alt={perfil.name} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-2xl" aria-hidden="true">
              🐾
            </span>
          )}
        </div>
        <h1 className="font-heading text-2xl font-bold text-ink-900">{perfil.name}</h1>
      </div>

      <h2 className="mt-10 font-heading text-lg font-bold text-ink-900">Mascotas</h2>

      {pets.length === 0 ? (
        <p className="mt-4 text-sm text-ink-500">{perfil.name} todavía no agregó mascotas a su perfil.</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
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
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default PerfilPublico
