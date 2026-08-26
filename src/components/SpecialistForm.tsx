import { useState, type ChangeEvent, type FormEvent } from "react"
import { supabase } from "../lib/supabase"
import { uploadImage, extensionFor } from "../lib/storage"
import { isValidEmail, isValidPhone } from "../lib/validation"
import type { ListingStatus } from "../types/vet"
import type { Specialist } from "../types/specialist"

interface SpecialistFormProps {
  specialist?: Specialist
  onCancel: () => void
  onSaved: () => void
}

function SpecialistForm({ specialist, onCancel, onSaved }: SpecialistFormProps) {
  const [name, setName] = useState(specialist?.name ?? "")
  const [phone, setPhone] = useState(specialist?.phone ?? "")
  const [contactEmail, setContactEmail] = useState(specialist?.contact_email ?? "")
  const [services, setServices] = useState(specialist?.services.join(", ") ?? "")
  const [schedule, setSchedule] = useState(specialist?.schedule ?? "")
  const [status, setStatus] = useState<ListingStatus>(specialist?.status ?? "pending")
  const [photos, setPhotos] = useState<string[]>(specialist?.photos ?? [])
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
          uploadImage(
            "specialists",
            `${specialist?.id ?? crypto.randomUUID()}/${crypto.randomUUID()}.${extensionFor(file)}`,
            file
          )
        )
      )

      const payload = {
        name,
        phone: phone.trim() || null,
        contact_email: contactEmail.trim() || null,
        services: services
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        schedule: schedule.trim() || null,
        status,
        photos: [...photos, ...uploadedUrls],
      }

      if (specialist) {
        const { error } = await supabase.from("specialists").update(payload).eq("id", specialist.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from("specialists").insert(payload)
        if (error) throw error
      }

      onSaved()
    } catch {
      setError("No se pudo guardar el especialista. Intenta de nuevo.")
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
        <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
          Horario de atención
          <input
            type="text"
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
            placeholder="Lun a vie 9:00–19:00"
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
          placeholder="Baño y corte, Adiestramiento"
          className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
        Estado de publicación
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ListingStatus)}
          className="rounded-lg border border-ink-900/15 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="pending">Pendiente</option>
          <option value="approved">Aprobado (visible al público)</option>
          <option value="rejected">Rechazado</option>
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
          {saving ? "Guardando…" : specialist ? "Guardar cambios" : "Crear especialista"}
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

export default SpecialistForm
