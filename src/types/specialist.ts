import type { ListingStatus } from "./vet"

export interface Specialist {
  id: string
  owner_id: string | null
  name: string
  phone: string | null
  contact_email: string | null
  photos: string[]
  services: string[]
  schedule: string | null
  status: ListingStatus
  created_at: string
}
