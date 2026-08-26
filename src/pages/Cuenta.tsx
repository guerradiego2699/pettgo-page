import { useState, type ChangeEvent, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { useAuth, type UserRole } from "../context/AuthContext"
import { supabase } from "../lib/supabase"
import { uploadImage, extensionFor } from "../lib/storage"

const roleLabels: Record<UserRole, string> = {
  persona: "Persona",
  admin: "Administrador",
  especialista: "Especialista",
  veterinaria: "Veterinaria",
}

function Cuenta() {
  const { profile, signOut, refreshProfile } = useAuth()
  const [name, setName] = useState(profile?.name ?? "")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(profile?.avatar_url ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  if (!profile) return null

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!profile) return

    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      let avatarUrl = profile.avatar_url
      if (avatarFile) {
        const path = `${profile.id}/avatar.${extensionFor(avatarFile)}`
        avatarUrl = await uploadImage("avatars", path, avatarFile)
      }

      const { error } = await supabase
        .from("profiles")
        .update({ name, avatar_url: avatarUrl })
        .eq("id", profile.id)

      if (error) throw error

      await refreshProfile()
      setAvatarFile(null)
      setSaved(true)
    } catch {
      setError("No se pudo guardar tu perfil. Intenta de nuevo.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-6 py-16">
      <h1 className="font-heading text-3xl font-bold text-ink-900">Mi cuenta</h1>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-2xl border border-brand-100 bg-brand-50/50 p-6"
      >
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-brand-100">
            {preview ? (
              <img src={preview} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full items-center justify-center text-2xl" aria-hidden="true">
                🐾
              </span>
            )}
          </div>
          <label className="text-sm font-medium text-ink-700">
            Foto de perfil
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="mt-1 block text-sm text-ink-500 file:mr-3 file:rounded-full file:border-0 file:bg-brand-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand-700"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
          Nombre
          <input
            type="text"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-lg border border-ink-900/15 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </label>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-300">Correo</p>
          <p className="font-medium text-ink-900">{profile.email}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-300">Rol</p>
          <p className="font-medium text-ink-900">{roleLabels[profile.role]}</p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-brand-700">Perfil actualizado.</p>}

        <button
          type="submit"
          disabled={saving}
          className="self-start rounded-full bg-gradient-to-br from-brand-400 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:shadow-lg disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </form>

      <Link
        to="/mascotas"
        className="flex items-center justify-between rounded-2xl border border-brand-100 bg-white px-6 py-4 text-sm font-semibold text-ink-900 transition hover:border-brand-300"
      >
        🐾 Mis mascotas
        <span aria-hidden="true">→</span>
      </Link>

      <button
        type="button"
        onClick={() => signOut()}
        className="self-start rounded-full border border-ink-900/15 px-4 py-2 text-sm font-medium text-ink-500 transition hover:border-brand-300 hover:bg-brand-50"
      >
        Cerrar sesión
      </button>
    </div>
  )
}

export default Cuenta
