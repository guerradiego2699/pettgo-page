import { useCallback, useEffect, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { fetchAuthorNames } from "../lib/profiles"
import { useAuth } from "../context/AuthContext"
import type { ForumThread } from "../types/forum"

function Comunidad() {
  const { user } = useAuth()
  const [threads, setThreads] = useState<ForumThread[]>([])
  const [authorNames, setAuthorNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadThreads = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from("forum_threads")
      .select("*")
      .order("created_at", { ascending: false })

    setThreads(data ?? [])
    setAuthorNames(await fetchAuthorNames((data ?? []).map((t) => t.author_id)))
    setLoading(false)
  }, [])

  useEffect(() => {
    loadThreads()
  }, [loadThreads])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!user) return
    setError(null)
    setSaving(true)

    const { error } = await supabase.from("forum_threads").insert({
      title,
      body,
      author_id: user.id,
    })

    setSaving(false)
    if (error) {
      setError("No se pudo publicar el tema. Intenta de nuevo.")
      return
    }

    setTitle("")
    setBody("")
    setFormOpen(false)
    loadThreads()
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-ink-900">Comunidad</h1>
          <p className="mt-1 text-sm text-ink-500">Comparte experiencias con otros dueños de mascotas en Curicó.</p>
        </div>
        {!formOpen && (
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="rounded-full bg-gradient-to-br from-brand-400 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:shadow-lg"
          >
            + Nuevo tema
          </button>
        )}
      </div>

      {formOpen && (
        <form
          onSubmit={handleSubmit}
          className="mt-6 flex flex-col gap-4 rounded-2xl border border-brand-100 bg-white p-6"
        >
          <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
            Título
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
            Mensaje
            <textarea
              required
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
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
              {saving ? "Publicando…" : "Publicar tema"}
            </button>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded-full border border-ink-900/15 px-5 py-2.5 text-sm font-medium text-ink-600 transition hover:bg-brand-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="mt-10 text-ink-500">Cargando…</p>
      ) : threads.length === 0 && !formOpen ? (
        <p className="mt-10 text-ink-500">Aún no hay temas. ¡Sé el primero en publicar!</p>
      ) : (
        <div className="mt-8 flex flex-col gap-4">
          {threads.map((thread) => (
            <Link
              key={thread.id}
              to={`/comunidad/${thread.id}`}
              className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <h3 className="font-heading text-lg font-bold text-ink-900">{thread.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-ink-500">{thread.body}</p>
              <p className="mt-2 text-xs font-medium text-ink-400">
                {authorNames[thread.author_id] ?? "Alguien"} ·{" "}
                {new Date(thread.created_at).toLocaleDateString("es-CL")}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default Comunidad
