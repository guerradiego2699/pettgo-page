export type PetSpecies = "perro" | "gato"
export type PetSex = "macho" | "hembra"

export interface Pet {
  id: string
  owner_id: string
  name: string
  species: PetSpecies
  breed: string | null
  age_years: number | null
  photo_url: string | null
  highlight: string | null
  created_at: string
  // Datos de la ficha para el carnet de salud (migración 0016). Solo los ve el dueño.
  // Opcionales: la vista pública (public_pets) y las bases sin la migración no los traen.
  sex?: PetSex | null
  birth_date?: string | null
  neutered?: boolean | null
  microchip?: string | null
  usual_vet?: string | null
  allergies?: string | null
}

export interface PetVaccine {
  id: string
  pet_id: string
  name: string
  applied_on: string
  next_due_on: string | null
  vet_name: string | null
  batch: string | null
}

export type DewormingKind = "interna" | "externa"

export interface PetDeworming {
  id: string
  pet_id: string
  kind: DewormingKind
  product: string
  applied_on: string
  next_due_on: string | null
}

export type HealthEventKind = "consulta" | "diagnostico" | "tratamiento" | "examen" | "cirugia"

export interface PetHealthEvent {
  id: string
  pet_id: string
  occurred_on: string
  kind: HealthEventKind
  title: string
  detail: string | null
  vet_name: string | null
}

export interface PetWeight {
  id: string
  pet_id: string
  measured_on: string
  kg: number
}
