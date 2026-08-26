import { useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../lib/supabase"

function RecuperarPassword() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/restablecer-password`,
    })

    setLoading(false)

    if (error) {
      setError("No se pudo enviar el correo. Intenta de nuevo.")
      return
    }

    setSent(true)
  }

  if (sent) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4 px-6 py-16 text-center">
        <h1 className="font-heading text-3xl font-bold text-ink-900">Revisa tu correo</h1>
        <p className="text-sm text-ink-500">
          Si <strong>{email}</strong> está registrado, te enviamos un enlace para restablecer tu contraseña.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-6 py-16">
      <div>
        <h1 className="font-heading text-3xl font-bold text-ink-900">Recupera tu contraseña</h1>
        <p className="mt-1 text-sm text-ink-500">Te enviaremos un enlace a tu correo para crear una nueva.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
          Correo
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-gradient-to-br from-brand-400 to-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:shadow-lg hover:shadow-brand-500/30 disabled:opacity-60"
        >
          {loading ? "Enviando…" : "Enviar enlace"}
        </button>
      </form>

      <Link to="/login" className="text-center text-sm text-ink-500 hover:text-brand-700">
        Volver a iniciar sesión
      </Link>
    </div>
  )
}

export default RecuperarPassword
