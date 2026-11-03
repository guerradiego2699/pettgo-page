import { useCallback, useEffect, useState } from "react"
import { eliminarRegistro, guardarRegistro, type TablaCarnet } from "../../lib/carnet"

// Estado común de las secciones del carnet: formulario abierto/cerrado, registro que se edita,
// valores iniciales (por ejemplo, al "registrar dosis" desde un recordatorio) y guardado.
export function useFormCarnet<T extends { id: string }>(
  tabla: TablaCarnet,
  onCambio: () => void,
  prefill: Record<string, string> | null,
  onPrefillUsado: () => void
) {
  const [abierto, setAbierto] = useState(false)
  const [editando, setEditando] = useState<T | null>(null)
  const [valores, setValores] = useState<Record<string, string>>({})
  // Cambia cada vez que se abre, para que el formulario arranque con los valores nuevos.
  const [clave, setClave] = useState(0)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorLista, setErrorLista] = useState<string | null>(null)

  const abrir = useCallback((item: T | null, iniciales: Record<string, string> = {}) => {
    setEditando(item)
    setValores(iniciales)
    setError(null)
    setClave((c) => c + 1)
    setAbierto(true)
  }, [])

  const cerrar = useCallback(() => {
    setAbierto(false)
    setEditando(null)
    setError(null)
  }, [])

  useEffect(() => {
    if (!prefill) return
    abrir(null, prefill)
    onPrefillUsado()
  }, [prefill, abrir, onPrefillUsado])

  async function guardar(payload: Record<string, unknown>) {
    setGuardando(true)
    setError(null)
    const mensaje = await guardarRegistro(tabla, payload, editando?.id)
    setGuardando(false)
    if (mensaje) {
      setError(mensaje)
      return
    }
    cerrar()
    onCambio()
  }

  async function eliminar(id: string) {
    setErrorLista(null)
    const mensaje = await eliminarRegistro(tabla, id)
    if (mensaje) return setErrorLista(mensaje)
    onCambio()
  }

  return { abierto, editando, valores, clave, guardando, error, errorLista, setError, abrir, cerrar, guardar, eliminar }
}
