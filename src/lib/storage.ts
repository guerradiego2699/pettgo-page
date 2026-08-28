import { supabase } from "./supabase"

export async function uploadImage(bucket: string, path: string, file: File) {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: false,
    cacheControl: "3600",
  })
  if (error) throw error

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

export function extensionFor(file: File) {
  const parts = file.name.split(".")
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "jpg"
}
