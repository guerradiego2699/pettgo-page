import { createHash } from "node:crypto"

// Deriva un salt del propio service_role key (secreto que ya existe y nunca
// sale del servidor) en vez de agregar una variable de entorno nueva solo
// para esto.
const SALT = process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-24) ?? "pettgo-salt-por-defecto"

// Hash no reversible de IP + user agent + día: sirve para contar visitantes
// únicos por día sin guardar la IP en claro.
export function hashVisitante(ip: string, userAgent: string): string {
  const hoy = new Date().toISOString().slice(0, 10)
  return createHash("sha256").update(`${SALT}:${ip}:${userAgent}:${hoy}`).digest("hex")
}

const PATRON_BOT = /bot|crawl|spider|slurp|facebookexternalhit|preview|monitor|headless/i

export function esBot(userAgent: string): boolean {
  return PATRON_BOT.test(userAgent)
}
