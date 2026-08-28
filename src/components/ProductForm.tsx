import { useState, type ChangeEvent, type FormEvent } from "react"
import { supabase } from "../lib/supabase"
import { uploadImage, extensionFor } from "../lib/storage"
import type { Product } from "../types/product"

interface ProductFormProps {
  product?: Product
  onCancel: () => void
  onSaved: () => void
}

function ProductForm({ product, onCancel, onSaved }: ProductFormProps) {
  const [name, setName] = useState(product?.name ?? "")
  const [description, setDescription] = useState(product?.description ?? "")
  const [externalLink, setExternalLink] = useState(product?.external_link ?? "")
  const [externalContact, setExternalContact] = useState(product?.external_contact ?? "")
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(product?.photo_url ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (!externalLink.trim() && !externalContact.trim()) {
      setError("Agrega un link externo o un contacto para comprar el producto.")
      return
    }

    setSaving(true)
    try {
      let photoUrl = product?.photo_url ?? null
      if (photoFile) {
        const path = `${crypto.randomUUID()}.${extensionFor(photoFile)}`
        photoUrl = await uploadImage("products", path, photoFile)
      }

      const payload = {
        name,
        description: description.trim() || null,
        external_link: externalLink.trim() || null,
        external_contact: externalContact.trim() || null,
        photo_url: photoUrl,
      }

      if (product) {
        const { error } = await supabase.from("products").update(payload).eq("id", product.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from("products").insert(payload)
        if (error) throw error
      }

      onSaved()
    } catch {
      setError("No se pudo guardar el producto. Intenta de nuevo.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border border-brand-100 bg-white p-6">
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-brand-100">
          {preview ? (
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-2xl" aria-hidden="true">
              🛍️
            </span>
          )}
        </div>
        <label className="text-sm font-medium text-ink-700">
          Foto
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="mt-1 block text-sm text-ink-500 file:mr-3 file:rounded-full file:border-0 file:bg-brand-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand-700"
          />
        </label>
      </div>

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
        Descripción
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
          Link externo de compra
          <input
            type="url"
            value={externalLink}
            onChange={(e) => setExternalLink(e.target.value)}
            placeholder="https://..."
            className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
          Contacto (teléfono, tienda, etc.)
          <input
            type="text"
            value={externalContact}
            onChange={(e) => setExternalContact(e.target.value)}
            className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-gradient-to-br from-brand-400 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:shadow-lg disabled:opacity-60"
        >
          {saving ? "Guardando…" : product ? "Guardar cambios" : "Crear producto"}
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

export default ProductForm
