import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import { useAuth, type Profile, type UserRole } from "../../context/AuthContext"

const roleLabels: Record<UserRole, string> = {
  persona: "Persona",
  admin: "Administrador",
  especialista: "Especialista",
  veterinaria: "Veterinaria",
}

function AdminUsuarios() {
  const { user } = useAuth()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)

  const loadProfiles = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from("profiles").select("*").order("name")
    setProfiles(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadProfiles()
  }, [loadProfiles])

  async function handleRoleChange(profileId: string, role: UserRole) {
    setSavingId(profileId)
    setSavedId(null)
    const { error } = await supabase.from("profiles").update({ role }).eq("id", profileId)
    setSavingId(null)
    if (!error) {
      setProfiles((prev) => prev.map((p) => (p.id === profileId ? { ...p, role } : p)))
      setSavedId(profileId)
      setTimeout(() => setSavedId(null), 2000)
    }
  }

  const filtered = profiles.filter((p) => {
    const query = search.toLowerCase()
    return p.name.toLowerCase().includes(query) || p.email.toLowerCase().includes(query)
  })

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link to="/admin" className="text-sm font-semibold text-brand-700 hover:underline">
        ← Panel de administrador
      </Link>

      <h1 className="mt-4 font-heading text-3xl font-bold text-ink-900">Usuarios y roles</h1>
      <p className="mt-2 text-sm text-ink-500">
        Asigna el rol de veterinaria o especialista a una cuenta para que pueda gestionar su propia ficha.
      </p>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nombre o correo…"
        className="mt-6 w-full rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
      />

      {loading ? (
        <p className="mt-10 text-ink-500">Cargando…</p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {filtered.map((profile) => (
            <div
              key={profile.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-100 bg-white p-4"
            >
              <div>
                <p className="font-semibold text-ink-900">{profile.name}</p>
                <p className="text-sm text-ink-500">{profile.email}</p>
              </div>

              <div className="flex items-center gap-2">
                {savedId === profile.id && <span className="text-sm text-brand-700">Guardado</span>}
                <select
                  value={profile.role}
                  disabled={profile.id === user?.id || savingId === profile.id}
                  onChange={(e) => handleRoleChange(profile.id, e.target.value as UserRole)}
                  className="rounded-lg border border-ink-900/15 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none disabled:opacity-50"
                  title={profile.id === user?.id ? "No puedes cambiar tu propio rol" : undefined}
                >
                  {Object.entries(roleLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AdminUsuarios
