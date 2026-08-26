import { supabase } from "./supabase"

export async function fetchAuthorNames(authorIds: string[]): Promise<Record<string, string>> {
  const uniqueIds = Array.from(new Set(authorIds))
  if (uniqueIds.length === 0) return {}

  const { data } = await supabase.from("public_profiles").select("id, name").in("id", uniqueIds)

  const map: Record<string, string> = {}
  data?.forEach((row) => {
    map[row.id] = row.name
  })
  return map
}
