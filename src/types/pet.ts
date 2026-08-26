export type PetSpecies = "perro" | "gato"

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
}
