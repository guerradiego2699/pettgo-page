export function esUrlHttpsValida(valor: unknown): valor is string {
  if (typeof valor !== "string") return false
  try {
    return new URL(valor).protocol === "https:"
  } catch {
    return false
  }
}

export function esEmailValido(valor: unknown): valor is string {
  return typeof valor === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)
}

export function textoValido(valor: unknown, opciones: { maxLength: number; requerido?: boolean }): boolean {
  if (valor === undefined || valor === null || valor === "") {
    return !opciones.requerido
  }
  if (typeof valor !== "string") return false
  return valor.trim().length > 0 && valor.trim().length <= opciones.maxLength
}

export function precioValido(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isFinite(valor) && Number.isInteger(valor) && valor >= 0
}
