export const ESTADO_ESTILO: Record<string, string> = {
  Completada: "bg-emerald-100 text-emerald-700",
  "En desarrollo": "bg-sky-100 text-sky-700",
  Pendiente: "bg-ink-100 text-ink-500",
  Bloqueada: "bg-red-100 text-red-700",
  Atrasada: "bg-amber-100 text-amber-700",
  Cumplido: "bg-emerald-100 text-emerald-700",
  "En curso": "bg-sky-100 text-sky-700",
}

export const RIESGO_ESTILO: Record<string, string> = {
  Bajo: "bg-emerald-100 text-emerald-700",
  Medio: "bg-amber-100 text-amber-700",
  Alto: "bg-orange-100 text-orange-700",
  Crítico: "bg-red-100 text-red-700",
}

export const PRIORIDAD_ESTILO: Record<string, string> = {
  Baja: "bg-emerald-100 text-emerald-700",
  Media: "bg-amber-100 text-amber-700",
  Alta: "bg-orange-100 text-orange-700",
  Crítica: "bg-red-100 text-red-700",
}

export const NIVEL_ALERTA_ESTILO: Record<string, string> = {
  CRÍTICO: "border-l-4 border-red-500 bg-red-50",
  ALTO: "border-l-4 border-orange-400 bg-orange-50",
  MEDIO: "border-l-4 border-amber-400 bg-amber-50",
  BAJO: "border-l-4 border-emerald-400 bg-emerald-50",
}
