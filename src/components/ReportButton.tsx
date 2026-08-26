import { useState } from "react"
import { supabase } from "../lib/supabase"
import { useAuth } from "../context/AuthContext"

interface ReportButtonProps {
  threadId?: string
  postId?: string
}

function ReportButton({ threadId, postId }: ReportButtonProps) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit() {
    if (!user) return
    setSending(true)
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      thread_id: threadId ?? null,
      post_id: postId ?? null,
      reason: reason.trim() || null,
    })
    setSending(false)
    if (!error) {
      setSent(true)
      setOpen(false)
    }
  }

  if (sent) {
    return <span className="text-xs font-medium text-ink-400">Reportado, gracias</span>
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-semibold text-ink-400 hover:text-red-600 hover:underline"
      >
        Reportar
      </button>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motivo (opcional)"
        className="rounded-lg border border-ink-900/15 px-2 py-1 text-xs focus:border-brand-500 focus:outline-none"
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={sending}
        className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-60"
      >
        {sending ? "Enviando…" : "Enviar reporte"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs font-semibold text-ink-400 hover:underline"
      >
        Cancelar
      </button>
    </div>
  )
}

export default ReportButton
