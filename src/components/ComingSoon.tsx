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
      <h1 className="mt-4 font-heading text-3xl font-bold text-ink-900">{title}</h1>
      <p className="mt-3 text-ink-500">{description}</p>
      <span className="mt-6 inline-flex items-center rounded-full bg-brand-100 px-4 py-1.5 text-sm font-semibold text-brand-700">
        En construcción
      </span>
      <Link
        to="/"
        className="mt-8 text-sm font-semibold text-brand-700 transition hover:text-brand-800"
      >
        ← Volver al inicio
      </Link>
    </section>
  )
}

export default ComingSoon
