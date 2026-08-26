import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../lib/supabase"
import type { Vet } from "../types/vet"

function Veterinarias() {
  const [vets, setVets] = useState<Vet[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from("vets")
      .select("*")
      .order("name")
      .then(({ data }) => {
        setVets(data ?? [])
        setLoading(false)
      })
  }, [])

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="font-heading text-3xl font-bold text-ink-900">Veterinarias en Curicó</h1>
      <p className="mt-2 text-ink-500">Encuentra la veterinaria que mejor se ajuste a tu mascota.</p>

      {loading ? (
        <p className="mt-10 text-ink-500">Cargando…</p>
      ) : vets.length === 0 ? (
        <p className="mt-10 text-ink-500">Aún no hay veterinarias publicadas.</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {vets.map((vet) => (
            <Link
              key={vet.id}
              to={`/veterinarias/${vet.id}`}
              className="flex flex-col overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="h-36 w-full bg-brand-100">
                {vet.photos[0] && (
                  <img src={vet.photos[0]} alt={vet.name} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-5">
                <h3 className="font-heading text-lg font-bold text-ink-900">{vet.name}</h3>
                {vet.address && <p className="text-sm text-ink-500">{vet.address}</p>}
                {vet.is_24h ? (
                  <span className="inline-flex w-fit items-center rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
                    Atención 24 horas
                  </span>
                ) : (
                  vet.schedule && <p className="text-xs text-ink-400">{vet.schedule}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default Veterinarias
