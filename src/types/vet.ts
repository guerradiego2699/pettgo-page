export type ListingStatus = "pending" | "approved" | "rejected"

export interface Vet {
  id: string
  owner_id: string | null
  name: string
  address: string | null
  phone: string | null
  contact_email: string | null
  photos: string[]
  services: string[]
  is_24h: boolean
  schedule: string | null
  lat: number | null
  lng: number | null
  status: ListingStatus
  created_at: string
}
