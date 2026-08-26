import { useCallback, useEffect, useState, type FormEvent } from "react"
import { Link, useParams } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { fetchAuthorNames } from "../lib/profiles"
import { useAuth } from "../context/AuthContext"
import ReportButton from "../components/ReportButton"
import type { ForumPost, ForumThread } from "../types/forum"

function ForoTema() {
  const { id } = useParams()
  const { user } = useAuth()
  const [thread, setThread] = useState<ForumThread | null>(null)
  const [posts, setPosts] = useState<ForumPost[]>([])
  const [authorNames, setAuthorNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadThread = useCallback(async () => {
    if (!id) return
    setLoading(true)

    const [{ data: threadData }, { data: postsData }] = await Promise.all([
      supabase.from("forum_threads").select("*").eq("id", id).single(),
      supabase.from("forum_posts").select("*").eq("thread_id", id).order("created_at", { ascending: true }),
    ])

    setThread(threadData)
    setPosts(postsData ?? [])

    const ids = [...(threadData ? [threadData.author_id] : []), ...(postsData ?? []).map((p) => p.author_id)]
    setAuthorNames(await fetchAuthorNames(ids))
    setLoading(false)
  }, [id])

  useEffect(() => {
    loadThread()
  }, [loadThread])

  async function handleReply(event: FormEvent) {
    event.preventDefault()
    if (!user || !id) return
    setError(null)
    setSending(true)

    const { error } = await supabase.from("forum_posts").insert({
      thread_id: id,
      author_id: user.id,
      body: reply,
    })

    setSending(false)
    if (error) {
      setError("No se pudo enviar tu respuesta. Intenta de nuevo.")
      return
    }

    setReply("")
    loadThread()
  }

  if (loading) return <p className="mx-auto max-w-3xl px-6 py-16 text-ink-500">Cargando…</p>

  if (!thread) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center px-6 py-24 text-center">
        <h1 className="font-heading text-2xl font-bold text-ink-900">No encontramos este tema</h1>
        <Link to="/comunidad" className="mt-6 text-sm font-semibold text-brand-700 hover:underline">
          ← Volver a la comunidad
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link to="/comunidad" className="text-sm font-semibold text-brand-700 hover:underline">
        ← Volver a la comunidad
      </Link>

      <div className="mt-4 rounded-2xl border border-brand-100 bg-white p-6">
        <h1 className="font-heading text-2xl font-bold text-ink-900">{thread.title}</h1>
        <p className="mt-1 text-xs font-medium text-ink-400">
          {authorNames[thread.author_id] ?? "Alguien"} · {new Date(thread.created_at).toLocaleDateString("es-CL")}
        </p>
        <p className="mt-4 whitespace-pre-wrap text-sm text-ink-700">{thread.body}</p>
        <div className="mt-4">
          <ReportButton threadId={thread.id} />
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-4">
        {posts.map((post) => (
          <div key={post.id} className="rounded-2xl border border-brand-100 bg-brand-50/40 p-5">
            <p className="text-xs font-medium text-ink-400">
              {authorNames[post.author_id] ?? "Alguien"} · {new Date(post.created_at).toLocaleDateString("es-CL")}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-ink-700">{post.body}</p>
            <div className="mt-3">
              <ReportButton postId={post.id} />
            </div>
          </div>
        ))}
      </div>

      {user ? (
        <form onSubmit={handleReply} className="mt-8 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
            Responder
            <textarea
              required
              rows={3}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={sending}
            className="self-start rounded-full bg-gradient-to-br from-brand-400 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:shadow-lg disabled:opacity-60"
          >
            {sending ? "Enviando…" : "Responder"}
          </button>
        </form>
      ) : (
        <p className="mt-8 text-sm text-ink-500">
          <Link to="/login" className="font-semibold text-brand-700 hover:underline">
            Inicia sesión
          </Link>{" "}
          para responder.
        </p>
      )}
    </div>
  )
}

export default ForoTema
