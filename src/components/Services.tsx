import { Link } from "react-router-dom"
import { services } from "../data/services"

function Services() {
  return (
    <section id="servicios" className="bg-sky-50/60 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center text-3xl font-bold text-slate-900">
          Qué puedes hacer en PettGo
        </h2>
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Link
              key={service.id}
              to={service.path}
              className="rounded-2xl border border-emerald-100 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
            >
              <span className="text-3xl" aria-hidden="true">
                {service.icon}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                {service.title}
              </h3>
              <p className="mt-2 text-sm text-slate-600">{service.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Services
