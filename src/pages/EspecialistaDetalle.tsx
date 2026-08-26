import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { supabase } from "../lib/supabase"
import type { Specialist } from "../types/specialist"

function EspecialistaDetalle() {
  const { id } = useParams()
  const [specialist, setSpecialist] = useState<Specialist | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    supabase
      .from("specialists")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setSpecialist(data)
        setLoading(false)
      })
  }, [id])

  if (loading) return <p className="mx-auto max-w-3xl px-6 py-16 text-ink-500">Cargando…</p>

  if (!specialist) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center px-6 py-24 text-center">
        <h1 className="font-heading text-2xl font-bold text-ink-900">No encontramos a este especialista</h1>
        <Link to="/especialistas" className="mt-6 text-sm font-semibold text-brand-700 hover:underline">
          ← Volver al listado
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link to="/especialistas" className="text-sm font-semibold text-brand-700 hover:underline">
        ← Volver al listado
      </Link>

      <h1 className="mt-4 font-heading text-3xl font-bold text-ink-900">{specialist.name}</h1>

      {specialist.photos.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {specialist.photos.map((url) => (
            <img key={url} src={url} alt={specialist.name} className="h-32 w-full rounded-xl object-cover" />
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-brand-100 bg-brand-50/50 p-6">
        {specialist.phone && (
          <p className="text-sm text-ink-700">
            <span className="font-semibold">Teléfono:</span> {specialist.phone}
          </p>
        )}
        {specialist.contact_email && (
          <p className="text-sm text-ink-700">
            <span className="font-semibold">Correo:</span> {specialist.contact_email}
          </p>
        )}
        {specialist.schedule && (
          <p className="text-sm text-ink-700">
            <span className="font-semibold">Horario:</span> {specialist.schedule}
          </p>
        )}
      </div>

      {specialist.services.length > 0 && (
        <div className="mt-6">
          <h2 className="font-heading text-lg font-bold text-ink-900">Servicios</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {specialist.services.map((service) => (
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

export default EspecialistaDetalle
