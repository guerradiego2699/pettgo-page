import { useState, type FormEvent } from "react"

interface AprobacionModalProps {
  accion: string
  camposSensibles?: string[]
  dependientesDirectos?: string[]
  onCancelar: () => void
  onConfirmar: (nombre: string) => void
  enviando?: boolean
  boton?: string
}

function AprobacionModal({ accion, camposSensibles, dependientesDirectos, onCancelar, onConfirmar, enviando, boton }: AprobacionModalProps) {
  const [nombre, setNombre] = useState("")

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (nombre.trim()) onConfirmar(nombre.trim())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/45 p-6">
      <div className="mt-16 w-full max-w-md rounded-2xl border border-brand-100 bg-white p-6 shadow-xl">
        <h2 className="font-heading text-lg font-bold text-ink-900">Requiere aprobación del responsable de Gestión de Proyectos</h2>
        <p className="mt-2 text-sm text-ink-600">
          Acción: <span className="font-semibold">{accion}</span>
        </p>
        {camposSensibles && camposSensibles.length > 0 && (
          <p className="mt-1 text-sm text-ink-500">Campos sensibles: {camposSensibles.join(", ")}</p>
        )}
        {dependientesDirectos && dependientesDirectos.length > 0 && (
          <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            Estas actividades dependen de ella: {dependientesDirectos.join(", ")}. Sus referencias quedarán apuntando a una
            actividad inexistente hasta que las corrijas.
          </div>
        )}
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-ink-700">
            Nombre de quien aprueba
            <input
              required
              autoFocus
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="rounded-lg border border-ink-900/15 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
          </label>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={enviando}
              className="rounded-full bg-gradient-to-br from-brand-400 to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:shadow-lg disabled:opacity-60"
            >
              {enviando ? "Guardando…" : boton ?? "Confirmo y apruebo el cambio"}
            </button>
            <button
              type="button"
              onClick={onCancelar}
              className="rounded-full border border-ink-900/15 px-5 py-2.5 text-sm font-medium text-ink-600 hover:bg-brand-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AprobacionModal
