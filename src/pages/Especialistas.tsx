import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../lib/supabase"
import type { Specialist } from "../types/specialist"

function Especialistas() {
  const [specialists, setSpecialists] = useState<Specialist[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from("specialists")
      .select("*")
      .order("name")
      .then(({ data }) => {
        setSpecialists(data ?? [])
        setLoading(false)
      })
  }, [])

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="font-heading text-3xl font-bold text-ink-900">Especialistas</h1>
      <p className="mt-2 text-ink-500">Peluqueros, adiestradores y otros profesionales para tu mascota.</p>

      {loading ? (
        <p className="mt-10 text-ink-500">Cargando…</p>
      ) : specialists.length === 0 ? (
        <p className="mt-10 text-ink-500">Aún no hay especialistas publicados.</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {specialists.map((specialist) => (
            <Link
              key={specialist.id}
              to={`/especialistas/${specialist.id}`}
              className="flex flex-col overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="h-36 w-full bg-brand-100">
                {specialist.photos[0] && (
                  <img src={specialist.photos[0]} alt={specialist.name} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-5">
                <h3 className="font-heading text-lg font-bold text-ink-900">{specialist.name}</h3>
                {specialist.schedule && <p className="text-xs text-ink-400">{specialist.schedule}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default Especialistas
