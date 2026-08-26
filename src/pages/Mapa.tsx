import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet"
import { supabase } from "../lib/supabase"
import type { Vet } from "../types/vet"

const CURICO_CENTER: [number, number] = [-34.9828, -71.2394]

const pawIcon = L.divIcon({
  className: "",
  html:
    '<div style="background:#c96f2c;width:32px;height:32px;border-radius:50% 50% 50% 0;' +
    "transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;" +
    'box-shadow:0 2px 6px rgba(0,0,0,0.35);border:2px solid white;">' +
    '<span style="transform:rotate(45deg);font-size:16px;">🐾</span></div>',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -30],
})

function Mapa() {
  const [vets, setVets] = useState<Vet[]>([])
  const [loading, setLoading] = useState(true)
  const [serviceFilter, setServiceFilter] = useState("")
  const [only24h, setOnly24h] = useState(false)

  useEffect(() => {
    supabase
      .from("vets")
      .select("*")
      .then(({ data }) => {
        setVets(data ?? [])
        setLoading(false)
      })
  }, [])

  const allServices = useMemo(() => {
    const set = new Set<string>()
    vets.forEach((vet) => vet.services.forEach((service) => set.add(service)))
    return Array.from(set).sort()
  }, [vets])

  const located = vets.filter((vet) => vet.lat !== null && vet.lng !== null)

  const filtered = located.filter((vet) => {
    if (only24h && !vet.is_24h) return false
    if (serviceFilter && !vet.services.includes(serviceFilter)) return false
    return true
  })

  const withoutLocation = vets.length - located.length

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="font-heading text-3xl font-bold text-ink-900">Mapa de veterinarias</h1>
      <p className="mt-2 text-ink-500">Encuentra la veterinaria más cercana en Curicó.</p>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm font-medium text-ink-700">
          Servicio
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="rounded-lg border border-ink-900/15 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          >
            <option value="">Todos</option>
            {allServices.map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm font-medium text-ink-700">
          <input
            type="checkbox"
            checked={only24h}
            onChange={(e) => setOnly24h(e.target.checked)}
            className="h-4 w-4 rounded border-ink-900/30 text-brand-600 focus:ring-brand-500"
          />
          Solo atención 24 horas
        </label>
      </div>

      {loading ? (
        <p className="mt-10 text-ink-500">Cargando…</p>
      ) : (
        <>
          <div className="mt-6 h-[70vh] w-full overflow-hidden rounded-2xl border border-brand-100 shadow-sm">
            <MapContainer center={CURICO_CENTER} zoom={14} className="h-full w-full">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {filtered.map((vet) => (
                <Marker key={vet.id} position={[vet.lat as number, vet.lng as number]} icon={pawIcon}>
                  <Popup>
                    <div className="flex flex-col gap-1">
                      <p className="font-heading font-bold text-ink-900">{vet.name}</p>
                      {vet.address && <p className="text-sm text-ink-600">{vet.address}</p>}
                      {vet.phone && <p className="text-sm text-ink-600">{vet.phone}</p>}
                      {vet.is_24h ? (
                        <span className="mt-1 inline-flex w-fit items-center rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
                          Atención 24 horas
                        </span>
                      ) : (
                        vet.schedule && <p className="text-xs text-ink-500">{vet.schedule}</p>
                      )}
                      <Link
                        to={`/veterinarias/${vet.id}`}
                        className="mt-1 text-sm font-semibold text-brand-700 hover:underline"
                      >
                        Ver ficha →
                      </Link>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {withoutLocation > 0 && (
            <p className="mt-4 text-sm text-ink-400">
              {withoutLocation === 1
                ? "Hay 1 veterinaria aprobada sin ubicación asignada todavía."
                : `Hay ${withoutLocation} veterinarias aprobadas sin ubicación asignada todavía.`}
            </p>
          )}
        </>
      )}
    </div>
  )
}

export default Mapa
