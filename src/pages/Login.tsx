import { useState, type FormEvent } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"

function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/"

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (error) {
      if (error.message === "Invalid login credentials") {
        setError("Correo o contraseña incorrectos.")
      } else if (error.message === "Email not confirmed") {
        setError("Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.")
      } else {
        setError("No se pudo iniciar sesión. Intenta de nuevo.")
      }
      return
    }

    navigate(from, { replace: true })
  }

  async function handleGoogle() {
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    })
    if (error) setError("No se pudo iniciar sesión con Google.")
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-6 py-16">
      <div>
        <h1 className="font-heading text-3xl font-bold text-ink-900">Inicia sesión</h1>
        <p className="mt-1 text-sm text-ink-500">Vuelve a conectar con tu mascota y la comunidad PettGo.</p>
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        className="flex items-center justify-center gap-2 rounded-full border border-ink-900/15 bg-white px-4 py-2.5 text-sm font-medium text-ink-700 transition hover:border-brand-300 hover:bg-brand-50"
      >
        Continuar con Google
      </button>

      <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-ink-300">
        <span className="h-px flex-1 bg-brand-100" />
        o con tu correo
        <span className="h-px flex-1 bg-brand-100" />
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
        <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
          Contraseña
          <input
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-gradient-to-br from-brand-400 to-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:shadow-lg hover:shadow-brand-500/30 disabled:opacity-60"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>

      <div className="flex justify-between text-sm text-ink-500">
        <Link to="/recuperar-password" className="hover:text-brand-700">
          ¿Olvidaste tu contraseña?
        </Link>
        <Link to="/registro" className="hover:text-brand-700">
          Crear cuenta
        </Link>
      </div>
    </div>
  )
}

export default Login
