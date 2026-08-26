import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import { fetchAuthorNames } from "../../lib/profiles"
import type { ForumPost, ForumThread } from "../../types/forum"

interface Report {
  id: string
  reporter_id: string
  thread_id: string | null
  post_id: string | null
  reason: string | null
  resolved: boolean
  created_at: string
}

function AdminReportes() {
  const [reports, setReports] = useState<Report[]>([])
  const [threads, setThreads] = useState<Record<string, ForumThread>>({})
  const [posts, setPosts] = useState<Record<string, ForumPost>>({})
  const [authorNames, setAuthorNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  const loadReports = useCallback(async () => {
    setLoading(true)
    const { data: reportsData } = await supabase
      .from("reports")
      .select("*")
      .order("resolved", { ascending: true })
      .order("created_at", { ascending: false })

    const list = reportsData ?? []
    setReports(list)

    const threadIds = list.filter((r) => r.thread_id).map((r) => r.thread_id as string)
    const postIds = list.filter((r) => r.post_id).map((r) => r.post_id as string)

    const [{ data: threadsData }, { data: postsData }] = await Promise.all([
      threadIds.length
        ? supabase.from("forum_threads").select("*").in("id", threadIds)
        : Promise.resolve({ data: [] as ForumThread[] }),
      postIds.length
        ? supabase.from("forum_posts").select("*").in("id", postIds)
        : Promise.resolve({ data: [] as ForumPost[] }),
    ])

    const threadMap: Record<string, ForumThread> = {}
    threadsData?.forEach((t) => (threadMap[t.id] = t))
    setThreads(threadMap)

    const postMap: Record<string, ForumPost> = {}
    postsData?.forEach((p) => (postMap[p.id] = p))
    setPosts(postMap)

    const ids = [
      ...list.map((r) => r.reporter_id),
      ...(threadsData ?? []).map((t) => t.author_id),
      ...(postsData ?? []).map((p) => p.author_id),
    ]
    setAuthorNames(await fetchAuthorNames(ids))
    setLoading(false)
  }, [])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  async function handleResolve(reportId: string) {
    await supabase.from("reports").update({ resolved: true }).eq("id", reportId)
    loadReports()
  }

  async function handleDeleteContent(report: Report) {
    if (report.post_id) {
      await supabase.from("forum_posts").delete().eq("id", report.post_id)
    } else if (report.thread_id) {
      await supabase.from("forum_threads").delete().eq("id", report.thread_id)
    }
    await supabase.from("reports").update({ resolved: true }).eq("id", report.id)
    loadReports()
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link to="/admin" className="text-sm font-semibold text-brand-700 hover:underline">
        ← Panel de administrador
      </Link>

      <h1 className="mt-4 font-heading text-3xl font-bold text-ink-900">Moderación del foro</h1>
      <p className="mt-2 text-sm text-ink-500">Reportes de temas y respuestas de la comunidad.</p>

      {loading ? (
        <p className="mt-10 text-ink-500">Cargando…</p>
      ) : reports.length === 0 ? (
        <p className="mt-10 text-ink-500">No hay reportes.</p>
      ) : (
        <div className="mt-8 flex flex-col gap-4">
          {reports.map((report) => {
            const content = report.post_id ? posts[report.post_id] : report.thread_id ? threads[report.thread_id] : null
            const contentAuthor = content ? authorNames[content.author_id] ?? "Alguien" : null
            const threadLink = report.post_id ? posts[report.post_id]?.thread_id : report.thread_id

            return (
              <div
                key={report.id}
                className={`rounded-2xl border p-5 ${
                  report.resolved ? "border-ink-900/10 bg-cream-50 opacity-70" : "border-brand-100 bg-white"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                    {report.post_id ? "Respuesta reportada" : "Tema reportado"}
                  </span>
                  {report.resolved && (
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                      Resuelto
                    </span>
                  )}
                </div>

                {content ? (
                  <>
                    <p className="mt-2 text-xs text-ink-400">Autor: {contentAuthor}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-ink-700">
                      {"title" in content ? content.title + " — " + content.body : content.body}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm italic text-ink-400">El contenido ya fue eliminado.</p>
                )}

                <p className="mt-3 text-xs text-ink-400">
                  Reportado por {authorNames[report.reporter_id] ?? "Alguien"}
                  {report.reason && <> · Motivo: {report.reason}</>}
                </p>

                <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold">
                  {threadLink && (
                    <Link to={`/comunidad/${threadLink}`} className="text-brand-700 hover:underline">
                      Ver en el foro
                    </Link>
                  )}
                  {!report.resolved && (
                    <>
                      {content && (
                        <button
                          type="button"
                          onClick={() => handleDeleteContent(report)}
                          className="text-red-600 hover:underline"
                        >
                          Eliminar contenido
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleResolve(report.id)}
                        className="text-ink-500 hover:underline"
                      >
                        Descartar reporte
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default AdminReportes
