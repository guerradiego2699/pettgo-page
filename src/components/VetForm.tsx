import { useState, type ChangeEvent, type FormEvent } from "react"
import { supabase } from "../lib/supabase"
import { uploadImage, extensionFor } from "../lib/storage"
import { isValidEmail, isValidPhone } from "../lib/validation"
import type { ListingStatus, Vet } from "../types/vet"

interface VetFormProps {
  vet?: Vet
  onCancel: () => void
  onSaved: () => void
}

function VetForm({ vet, onCancel, onSaved }: VetFormProps) {
  const [name, setName] = useState(vet?.name ?? "")
  const [address, setAddress] = useState(vet?.address ?? "")
  const [phone, setPhone] = useState(vet?.phone ?? "")
  const [contactEmail, setContactEmail] = useState(vet?.contact_email ?? "")
  const [services, setServices] = useState(vet?.services.join(", ") ?? "")
  const [is24h, setIs24h] = useState(vet?.is_24h ?? false)
  const [schedule, setSchedule] = useState(vet?.schedule ?? "")
  const [lat, setLat] = useState(vet?.lat?.toString() ?? "")
  const [lng, setLng] = useState(vet?.lng?.toString() ?? "")
  const [status, setStatus] = useState<ListingStatus>(vet?.status ?? "pending")
  const [photos, setPhotos] = useState<string[]>(vet?.photos ?? [])
  const [newPhotoFiles, setNewPhotoFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handlePhotosChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    setNewPhotoFiles((prev) => [...prev, ...files])
  }

  function removeExistingPhoto(url: string) {
    setPhotos((prev) => prev.filter((p) => p !== url))
  }

  function removeNewPhoto(index: number) {
    setNewPhotoFiles((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (phone.trim() && !isValidPhone(phone)) {
      setError("El teléfono no parece válido.")
      return
    }
    if (contactEmail.trim() && !isValidEmail(contactEmail)) {
      setError("El correo de contacto no parece válido.")
      return
    }

    setSaving(true)
    try {
      const uploadedUrls = await Promise.all(
        newPhotoFiles.map((file) =>
          uploadImage("vets", `${vet?.id ?? crypto.randomUUID()}/${crypto.randomUUID()}.${extensionFor(file)}`, file)
        )
      )

      const payload = {
        name,
        address: address.trim() || null,
        phone: phone.trim() || null,
        contact_email: contactEmail.trim() || null,
        services: services
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        is_24h: is24h,
        schedule: is24h ? null : schedule.trim() || null,
        lat: lat.trim() ? Number(lat) : null,
        lng: lng.trim() ? Number(lng) : null,
        status,
        photos: [...photos, ...uploadedUrls],
      }

      if (vet) {
        const { error } = await supabase.from("vets").update(payload).eq("id", vet.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from("vets").insert(payload)
        if (error) throw error
      }

      onSaved()
    } catch {
      setError("No se pudo guardar la veterinaria. Intenta de nuevo.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border border-brand-100 bg-white p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
          Nombre *
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
          Dirección
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
          Teléfono
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+56 9 1234 5678"
            className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
          Correo de contacto
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
        Servicios (separados por coma)
        <input
          type="text"
          value={services}
          onChange={(e) => setServices(e.target.value)}
          placeholder="Consulta general, Vacunas, Cirugía"
          className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
      </label>

      <label className="flex items-center gap-2 text-sm font-medium text-ink-700">
        <input
          type="checkbox"
          checked={is24h}
          onChange={(e) => setIs24h(e.target.checked)}
          className="h-4 w-4 rounded border-ink-900/30 text-brand-600 focus:ring-brand-500"
        />
        Atención 24 horas
      </label>

      {!is24h && (
        <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
          Horario de atención
          <input
            type="text"
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
            placeholder="Lun a vie 9:00–19:00, sáb 9:00–14:00"
            className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </label>
      )}

      <div>
        <p className="text-sm font-medium text-ink-700">
          Ubicación en el mapa{" "}
          {address && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address + " Curicó, Chile")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-normal text-brand-700 hover:underline"
            >
              (buscar dirección en Google Maps ↗)
            </a>
          )}
        </p>
        <p className="mt-1 text-xs text-ink-400">
          Abre el enlace, haz clic derecho sobre el punto exacto en el mapa y copia las coordenadas.
        </p>
        <div className="mt-2 grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
            Latitud
            <input
              type="number"
              step="any"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="-34.9828"
              className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
            Longitud
            <input
              type="number"
              step="any"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="-71.2394"
              className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </label>
        </div>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
        Estado de publicación
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ListingStatus)}
          className="rounded-lg border border-ink-900/15 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="pending">Pendiente</option>
          <option value="approved">Aprobada (visible al público)</option>
          <option value="rejected">Rechazada</option>
        </select>
      </label>

      <div>
        <p className="text-sm font-medium text-ink-700">Fotos</p>
        <div className="mt-2 flex flex-wrap gap-3">
          {photos.map((url) => (
            <div key={url} className="relative h-20 w-20 overflow-hidden rounded-lg">
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeExistingPhoto(url)}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink-950/70 text-xs text-white"
                aria-label="Quitar foto"
              >
                ×
              </button>
            </div>
          ))}
          {newPhotoFiles.map((file, index) => (
            <div key={index} className="relative h-20 w-20 overflow-hidden rounded-lg">
              <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeNewPhoto(index)}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink-950/70 text-xs text-white"
                aria-label="Quitar foto"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handlePhotosChange}
          className="mt-2 block text-sm text-ink-500 file:mr-3 file:rounded-full file:border-0 file:bg-brand-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand-700"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-gradient-to-br from-brand-400 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:shadow-lg disabled:opacity-60"
        >
          {saving ? "Guardando…" : vet ? "Guardar cambios" : "Crear veterinaria"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-ink-900/15 px-5 py-2.5 text-sm font-medium text-ink-600 transition hover:bg-brand-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

export default VetForm
