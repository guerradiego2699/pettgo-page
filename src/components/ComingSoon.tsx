import { Link } from "react-router-dom"

interface ComingSoonProps {
  icon: string
  title: string
  description: string
}

function ComingSoon({ icon, title, description }: ComingSoonProps) {
  return (
    <section className="mx-auto flex max-w-2xl flex-col items-center px-6 py-24 text-center">
      <span className="text-5xl" aria-hidden="true">
        {icon}
      </span>
      <h1 className="mt-4 text-3xl font-bold text-slate-900">{title}</h1>
      <p className="mt-3 text-slate-600">{description}</p>
      <span className="mt-6 inline-flex items-center rounded-full bg-sky-100 px-4 py-1.5 text-sm font-semibold text-sky-700">
        En construcción
      </span>
      <Link
        to="/"
        className="mt-8 text-sm font-semibold text-emerald-700 transition hover:text-emerald-800"
      >
        ← Volver al inicio
      </Link>
    </section>
  )
}

export default ComingSoon
