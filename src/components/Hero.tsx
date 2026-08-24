import { Link } from "react-router-dom"

function Hero() {
  return (
    <section className="bg-gradient-to-b from-emerald-50 to-white px-6 py-20 text-center">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
          Curicó, Chile
        </p>
        <h1 className="mt-3 text-4xl font-bold text-slate-900 sm:text-5xl">
          Todo para tu mascota,
          <br className="hidden sm:block" /> en un solo lugar
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">
          PettGo centraliza productos y servicios para el cuidado de perros y
          gatos en Curicó: tienda, especialistas, veterinarias, mapa y
          comunidad, todo en una sola plataforma.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="#servicios"
            className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Explorar servicios
          </a>
          <Link
            to="/comunidad"
            className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
          >
            Conocer la comunidad
          </Link>
        </div>
      </div>
    </section>
  )
}

export default Hero
