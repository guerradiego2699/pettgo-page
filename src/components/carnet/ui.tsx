import { useState, type ReactNode } from "react"
import type { EstadoDosis } from "../../lib/carnet"

export const INPUT = "rounded-lg border border-ink-900/15 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
export const BTN_PRIMARIO =
  "rounded-full bg-gradient-to-br from-brand-400 to-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:shadow-lg disabled:opacity-60"
export const BTN_SECUNDARIO = "rounded-full border border-ink-900/15 px-4 py-2 text-sm font-medium text-ink-600 transition hover:bg-brand-50"

const ESTILO_ESTADO: Record<EstadoDosis, string> = {
  vencida: "bg-red-100 text-red-700",
  hoy: "bg-amber-100 text-amber-700",
  pronto: "bg-amber-100 text-amber-700",
  al_dia: "bg-emerald-100 text-emerald-700",
  sin_fecha: "bg-ink-50 text-ink-500",
}

export function ChipEstado({ estado, texto }: { estado: EstadoDosis | "anterior"; texto: string }) {
  const clase = estado === "anterior" ? "bg-ink-50 text-ink-500" : ESTILO_ESTADO[estado]
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${clase}`}>{texto}</span>
}

export function Campo({ etiqueta, children, completo }: { etiqueta: string; children: ReactNode; completo?: boolean }) {
  return (
    <label className={`flex flex-col gap-1 text-sm font-medium text-ink-700 ${completo ? "sm:col-span-2" : ""}`}>
      {etiqueta}
      {children}
    </label>
  )
}

// Botón de dos pasos: el primer clic pide confirmar, el segundo ejecuta (evita borrar por error).
export function BotonEliminar({ onConfirmar }: { onConfirmar: () => void }) {
  const [pidiendo, setPidiendo] = useState(false)
  if (!pidiendo) {
    return (
      <button type="button" onClick={() => setPidiendo(true)} className="text-sm font-semibold text-red-600 hover:underline">
        Eliminar
      </button>
    )
  }
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <button type="button" onClick={onConfirmar} className="font-semibold text-red-600 hover:underline">
        Sí, eliminar
      </button>
      <button type="button" onClick={() => setPidiendo(false)} className="font-semibold text-ink-500 hover:underline">
        No
      </button>
    </span>
  )
}

export function Vacio({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-brand-200 bg-white px-5 py-8 text-center text-sm text-ink-500">{children}</div>
}

// Cabecera común de cada sección: título del botón de agregar + formulario desplegable.
export function CabeceraSeccion({ onAgregar, textoBoton, oculto }: { onAgregar: () => void; textoBoton: string; oculto: boolean }) {
  return (
    <div className="flex justify-end">
      {!oculto && (
        <button type="button" onClick={onAgregar} className={BTN_PRIMARIO}>
          {textoBoton}
        </button>
      )}
    </div>
  )
}

export function FormularioRegistro({
  onSubmit,
  onCancelar,
  guardando,
  error,
  textoGuardar,
  children,
}: {
  onSubmit: (datos: FormData) => void
  onCancelar: () => void
  guardando: boolean
  error: string | null
  textoGuardar: string
  children: ReactNode
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(new FormData(e.currentTarget))
      }}
      className="mt-3 grid grid-cols-1 gap-4 rounded-2xl border border-brand-100 bg-white p-5 shadow-sm sm:grid-cols-2"
    >
      {children}
      {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      <div className="flex gap-3 sm:col-span-2">
        <button type="submit" disabled={guardando} className={BTN_PRIMARIO}>
          {guardando ? "Guardando…" : textoGuardar}
        </button>
        <button type="button" onClick={onCancelar} className={BTN_SECUNDARIO}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

// Lee un campo de texto del formulario y lo devuelve limpio, o null si está vacío.
export function texto(datos: FormData, nombre: string): string | null {
  const v = String(datos.get(nombre) ?? "").trim()
  return v === "" ? null : v
}
