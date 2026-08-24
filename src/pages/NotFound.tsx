import { Link } from "react-router-dom"

function NotFound() {
  return (
    <section className="mx-auto flex max-w-2xl flex-col items-center px-6 py-24 text-center">
      <span className="text-5xl" aria-hidden="true">
        🐕‍🦺
      </span>
      <h1 className="mt-4 text-3xl font-bold text-slate-900">
        Página no encontrada
      </h1>
      <p className="mt-3 text-slate-600">
        La página que buscas no existe o fue movida.
      </p>
      <Link
        to="/"
        className="mt-8 text-sm font-semibold text-emerald-700 transition hover:text-emerald-800"
      >
        ← Volver al inicio
      </Link>
    </section>
  )
}

export default NotFound
