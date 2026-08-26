import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { supabase } from "../lib/supabase"
import type { Vet } from "../types/vet"

function VeterinariaDetalle() {
  const { id } = useParams()
  const [vet, setVet] = useState<Vet | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    supabase
      .from("vets")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setVet(data)
        setLoading(false)
      })
  }, [id])

  if (loading) return <p className="mx-auto max-w-3xl px-6 py-16 text-ink-500">Cargando…</p>

  if (!vet) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center px-6 py-24 text-center">
        <h1 className="font-heading text-2xl font-bold text-ink-900">No encontramos esta veterinaria</h1>
        <Link to="/veterinarias" className="mt-6 text-sm font-semibold text-brand-700 hover:underline">
          ← Volver al listado
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link to="/veterinarias" className="text-sm font-semibold text-brand-700 hover:underline">
        ← Volver al listado
      </Link>

      <h1 className="mt-4 font-heading text-3xl font-bold text-ink-900">{vet.name}</h1>

      {vet.photos.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {vet.photos.map((url) => (
            <img key={url} src={url} alt={vet.name} className="h-32 w-full rounded-xl object-cover" />
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-brand-100 bg-brand-50/50 p-6">
        {vet.address && (
          <p className="text-sm text-ink-700">
            <span className="font-semibold">Dirección:</span> {vet.address}
          </p>
        )}
        {vet.phone && (
          <p className="text-sm text-ink-700">
            <span className="font-semibold">Teléfono:</span> {vet.phone}
          </p>
        )}
        {vet.contact_email && (
          <p className="text-sm text-ink-700">
            <span className="font-semibold">Correo:</span> {vet.contact_email}
          </p>
        )}
        {vet.is_24h ? (
          <span className="inline-flex w-fit items-center rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white">
            Atención 24 horas
          </span>
        ) : (
          vet.schedule && (
            <p className="text-sm text-ink-700">
              <span className="font-semibold">Horario:</span> {vet.schedule}
            </p>
          )
        )}
      </div>

      {vet.services.length > 0 && (
        <div className="mt-6">
          <h2 className="font-heading text-lg font-bold text-ink-900">Servicios</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {vet.services.map((service) => (
              <span
                key={service}
                className="rounded-full bg-brand-100 px-3 py-1 text-sm font-medium text-brand-700"
              >
                {service}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default VeterinariaDetalle
