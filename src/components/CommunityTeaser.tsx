import { Link } from "react-router-dom"

function CommunityTeaser() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 text-center">
      <span className="text-4xl" aria-hidden="true">
        🐶🐱
      </span>
      <h2 className="mt-4 text-3xl font-bold text-slate-900">
        Una comunidad para dueños de mascotas
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-slate-600">
        Conecta con otros dueños de perros y gatos en Curicó, comparte
        experiencias y haz nuevos amigos peludos.
      </p>
      <Link
        to="/comunidad"
        className="mt-6 inline-block rounded-full bg-sky-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
      >
        Visitar la comunidad
      </Link>
    </section>
  )
}

export default CommunityTeaser
