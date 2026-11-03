import { useState, type ChangeEvent, type FormEvent } from "react"
import { supabase } from "../lib/supabase"
import { uploadImage, extensionFor } from "../lib/storage"
import { useAuth } from "../context/AuthContext"
import { edadEnAnios } from "../lib/carnet"
import type { Pet, PetSex, PetSpecies } from "../types/pet"

interface PetFormProps {
  pet?: Pet
  onCancel: () => void
  onSaved: () => void
}

function PetForm({ pet, onCancel, onSaved }: PetFormProps) {
  const { user } = useAuth()
  const [name, setName] = useState(pet?.name ?? "")
  const [species, setSpecies] = useState<PetSpecies>(pet?.species ?? "perro")
  const [breed, setBreed] = useState(pet?.breed ?? "")
  const [ageYears, setAgeYears] = useState(pet?.age_years?.toString() ?? "")
  const [highlight, setHighlight] = useState(pet?.highlight ?? "")
  // Datos de la ficha para el carnet de salud (todos opcionales).
  const [sex, setSex] = useState<PetSex | "">(pet?.sex ?? "")
  const [birthDate, setBirthDate] = useState(pet?.birth_date ?? "")
  const [neutered, setNeutered] = useState(pet?.neutered === true ? "si" : pet?.neutered === false ? "no" : "")
  const [microchip, setMicrochip] = useState(pet?.microchip ?? "")
  const [usualVet, setUsualVet] = useState(pet?.usual_vet ?? "")
  const [allergies, setAllergies] = useState(pet?.allergies ?? "")
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(pet?.photo_url ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!user) return

    const chip = microchip.replace(/\s/g, "")
    if (chip && !/^\d{15}$/.test(chip)) {
      setError("El número de microchip debe tener exactamente 15 dígitos.")
      return
    }

    setSaving(true)
    setError(null)

    try {
      let photoUrl = pet?.photo_url ?? null
      if (photoFile) {
        const path = `${user.id}/${crypto.randomUUID()}.${extensionFor(photoFile)}`
        photoUrl = await uploadImage("pets", path, photoFile)
      }

      const payload = {
        name,
        species,
        breed: breed.trim() || null,
        // Con fecha de nacimiento la edad se calcula sola (y se mantiene para las estadísticas del sitio).
        age_years: birthDate ? edadEnAnios(birthDate) : ageYears ? Number(ageYears) : null,
        highlight: highlight.trim() || null,
        photo_url: photoUrl,
        sex: sex || null,
        birth_date: birthDate || null,
        neutered: neutered === "si" ? true : neutered === "no" ? false : null,
        microchip: chip || null,
        usual_vet: usualVet.trim() || null,
        allergies: allergies.trim() || null,
      }

      if (pet) {
        const { error } = await supabase.from("pets").update(payload).eq("id", pet.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from("pets").insert({ ...payload, owner_id: user.id })
        if (error) throw error
      }

      onSaved()
    } catch {
      setError("No se pudo guardar la mascota. Intenta de nuevo.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-brand-100 bg-white p-6 shadow-sm"
    >
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-brand-100">
          {preview ? (
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-2xl" aria-hidden="true">
              {species === "perro" ? "🐶" : "🐱"}
            </span>
          )}
        </div>
        <label className="text-sm font-medium text-ink-700">
          Foto
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="mt-1 block text-sm text-ink-500 file:mr-3 file:rounded-full file:border-0 file:bg-brand-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand-700"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
          Nombre
          <input
            type="text"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
          Especie
          <select
            value={species}
            onChange={(event) => setSpecies(event.target.value as PetSpecies)}
            className="rounded-lg border border-ink-900/15 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          >
            <option value="perro">Perro</option>
            <option value="gato">Gato</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
          Raza
          <input
            type="text"
            value={breed}
            onChange={(event) => setBreed(event.target.value)}
            className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
          Edad (años)
          <input
            type="number"
            min={0}
            step="0.5"
            value={birthDate ? "" : ageYears}
            disabled={Boolean(birthDate)}
            placeholder={birthDate ? "Se calcula con la fecha de nacimiento" : ""}
            onChange={(event) => setAgeYears(event.target.value)}
            className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none disabled:bg-ink-50 disabled:text-ink-300"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
          Fecha de nacimiento
          <input
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
            className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
          Sexo
          <select
            value={sex}
            onChange={(event) => setSex(event.target.value as PetSex | "")}
            className="rounded-lg border border-ink-900/15 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          >
            <option value="">Sin indicar</option>
            <option value="macho">Macho</option>
            <option value="hembra">Hembra</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
          Esterilizado
          <select
            value={neutered}
            onChange={(event) => setNeutered(event.target.value)}
            className="rounded-lg border border-ink-900/15 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          >
            <option value="">Sin indicar</option>
            <option value="si">Sí</option>
            <option value="no">No</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
          N° de microchip (15 dígitos)
          <input
            type="text"
            inputMode="numeric"
            maxLength={15}
            value={microchip}
            onChange={(event) => setMicrochip(event.target.value.replace(/\D/g, ""))}
            className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
          Veterinaria habitual
          <input
            type="text"
            maxLength={120}
            value={usualVet}
            onChange={(event) => setUsualVet(event.target.value)}
            className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
        Alergias o alertas de salud
        <input
          type="text"
          maxLength={500}
          value={allergies}
          onChange={(event) => setAllergies(event.target.value)}
          placeholder="Ej: alergia a la picadura de pulga"
          className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
        Algo destacable de tu mascota
        <textarea
          value={highlight}
          onChange={(event) => setHighlight(event.target.value)}
          rows={2}
          placeholder="Una anécdota, una característica, lo que quieras contar de ella"
          className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-gradient-to-br from-brand-400 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:shadow-lg disabled:opacity-60"
        >
          {saving ? "Guardando…" : pet ? "Guardar cambios" : "Agregar mascota"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-ink-900/15 px-5 py-2.5 text-sm font-medium text-ink-600 transition hover:bg-brand-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

export default PetForm
