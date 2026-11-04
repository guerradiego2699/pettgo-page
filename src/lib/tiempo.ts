// "hace 3 días", "ayer", "hace 2 semanas"… para mostrar cuándo ocurrió algo.
export function haceCuanto(iso: string | null | undefined, ahora: Date = new Date()): string {
  if (!iso) return "—"
  const minutos = Math.floor((ahora.getTime() - new Date(iso).getTime()) / 60000)
  if (minutos < 1) return "justo ahora"
  if (minutos < 60) return `hace ${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `hace ${horas} ${horas === 1 ? "hora" : "horas"}`
  const dias = Math.floor(horas / 24)
  if (dias === 1) return "ayer"
  if (dias < 14) return `hace ${dias} días`
  if (dias < 60) return `hace ${Math.floor(dias / 7)} semanas`
  const meses = Math.floor(dias / 30)
  return `hace ${meses} ${meses === 1 ? "mes" : "meses"}`
}

// "el 8 de noviembre" (para decir cuándo se puede volver a preguntar).
export function fechaLarga(iso: string): string {
  return new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "long" }).format(new Date(iso))
}
