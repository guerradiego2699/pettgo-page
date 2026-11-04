// Reglas de la consulta de stock a las pymes (las usan varios endpoints).

const MS_DIA = 24 * 60 * 60 * 1000

// Tras enviar una consulta, el botón "Preguntar stock" queda bloqueado hasta que la pyme
// responda o pasen 4 días, lo que ocurra primero (evita llenar de correos a la pyme).
export const BLOQUEO_CONSULTA_STOCK_MS = 4 * MS_DIA

// El enlace del correo sigue siendo válido más tiempo que el bloqueo, por si la pyme responde tarde.
export const VIGENCIA_ENLACE_STOCK_MS = 7 * MS_DIA

export interface EstadoConsultaStock {
  stock_consultado_en: string | null
  stock_token_usado: boolean
}

// Devuelve hasta cuándo está bloqueada la consulta (fecha ISO) o null si se puede preguntar ahora.
export function bloqueoConsultaStock(p: EstadoConsultaStock, ahoraMs: number = Date.now()): string | null {
  if (!p.stock_consultado_en || p.stock_token_usado) return null
  const hastaMs = new Date(p.stock_consultado_en).getTime() + BLOQUEO_CONSULTA_STOCK_MS
  return hastaMs > ahoraMs ? new Date(hastaMs).toISOString() : null
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
