import { supabase } from "./supabase"
import type { PetDeworming, PetVaccine } from "../types/pet"

// ---------- Fechas (siempre como texto AAAA-MM-DD, en hora local de Chile) ----------

const MS_DIA = 24 * 60 * 60 * 1000

const dosCifras = (n: number) => String(n).padStart(2, "0")

export function aISO(fecha: Date): string {
  return `${fecha.getFullYear()}-${dosCifras(fecha.getMonth() + 1)}-${dosCifras(fecha.getDate())}`
}

export function hoyISO(): string {
  return aISO(new Date())
}

// "2026-11-03" → medianoche local de ese día (sin el desfase de zona horaria de new Date("2026-11-03")).
export function aFecha(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d)
}

export function diasHasta(iso: string, hoy: Date = new Date()): number {
  const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  return Math.round((aFecha(iso).getTime() - base.getTime()) / MS_DIA)
}

export function sumarDias(iso: string, dias: number): string {
  const f = aFecha(iso)
  f.setDate(f.getDate() + dias)
  return aISO(f)
}

export function formatoFecha(iso: string | null | undefined): string {
  if (!iso) return "—"
  return aFecha(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" })
}

// Edad legible. Con fecha de nacimiento es exacta ("1 año 7 m"); si no, usa la edad en años de la ficha.
export function edadTexto(nacimiento: string | null | undefined, edadAnios: number | null | undefined, hoy: Date = new Date()): string {
  if (nacimiento) {
    const n = aFecha(nacimiento)
    let meses = (hoy.getFullYear() - n.getFullYear()) * 12 + hoy.getMonth() - n.getMonth()
    if (hoy.getDate() < n.getDate()) meses--
    if (meses < 0) return "—"
    const anios = Math.floor(meses / 12)
    const resto = meses % 12
    if (anios > 0) return `${anios} año${anios > 1 ? "s" : ""}${resto ? ` ${resto} m` : ""}`
    return `${resto} mes${resto === 1 ? "" : "es"}`
  }
  if (edadAnios != null) return `${edadAnios} año${edadAnios === 1 ? "" : "s"}`
  return "—"
}

// Años con un decimal a partir de la fecha de nacimiento (para mantener `age_years` al día).
export function edadEnAnios(nacimiento: string, hoy: Date = new Date()): number {
  const anios = (hoy.getTime() - aFecha(nacimiento).getTime()) / (365.25 * MS_DIA)
  return Math.max(0, Math.round(anios * 10) / 10)
}

// ---------- Estado de una próxima dosis ----------

export type EstadoDosis = "vencida" | "hoy" | "pronto" | "al_dia" | "sin_fecha"

export function estadoProxima(iso: string | null | undefined, hoy: Date = new Date()): { estado: EstadoDosis; texto: string } {
  if (!iso) return { estado: "sin_fecha", texto: "Sin próxima fecha" }
  const n = diasHasta(iso, hoy)
  if (n < 0) return { estado: "vencida", texto: `Vencida hace ${-n} día${n === -1 ? "" : "s"}` }
  if (n === 0) return { estado: "hoy", texto: "Hoy" }
  if (n <= 30) return { estado: "pronto", texto: `En ${n} día${n === 1 ? "" : "s"}` }
  return { estado: "al_dia", texto: "Al día" }
}

// ---------- Recordatorios ----------

// Solo cuenta la última aplicación de cada vacuna (por nombre) y de cada tipo de desparasitación:
// las anteriores ya fueron reemplazadas por una dosis más nueva.
const claveVacuna = (v: PetVaccine) => v.name.trim().toLowerCase()

export function esUltimaVacuna(v: PetVaccine, todas: PetVaccine[]): boolean {
  return !todas.some((o) => o.id !== v.id && claveVacuna(o) === claveVacuna(v) && o.applied_on > v.applied_on)
}

export function esUltimaDesparasitacion(d: PetDeworming, todas: PetDeworming[]): boolean {
  return !todas.some((o) => o.id !== d.id && o.kind === d.kind && o.applied_on > d.applied_on)
}

export interface Recordatorio {
  tipo: "vacuna" | "desparasitacion"
  id: string
  titulo: string
  fecha: string
}

export function recordatorios(vacunas: PetVaccine[], desparas: PetDeworming[], ventanaDias = 60, hoy: Date = new Date()): Recordatorio[] {
  const lista: Recordatorio[] = [
    ...vacunas
      .filter((v) => v.next_due_on && esUltimaVacuna(v, vacunas))
      .map((v) => ({ tipo: "vacuna" as const, id: v.id, titulo: `Vacuna: ${v.name}`, fecha: v.next_due_on as string })),
    ...desparas
      .filter((d) => d.next_due_on && esUltimaDesparasitacion(d, desparas))
      .map((d) => ({ tipo: "desparasitacion" as const, id: d.id, titulo: `Desparasitación ${d.kind}`, fecha: d.next_due_on as string })),
  ]
  return lista.filter((r) => diasHasta(r.fecha, hoy) <= ventanaDias).sort((a, b) => (a.fecha < b.fecha ? -1 : 1))
}

// ---------- Guardar y eliminar (solo el dueño puede, lo exige la base con RLS) ----------

export type TablaCarnet = "pet_vaccines" | "pet_dewormings" | "pet_health_events" | "pet_weights"

// Devuelve un mensaje de error o null si salió bien.
export async function guardarRegistro(tabla: TablaCarnet, payload: Record<string, unknown>, id?: string | null): Promise<string | null> {
  const { error } = id
    ? await supabase.from(tabla).update(payload).eq("id", id)
    : tabla === "pet_weights"
      ? await supabase.from(tabla).upsert(payload, { onConflict: "pet_id,measured_on" })
      : await supabase.from(tabla).insert(payload)
  return error ? "No se pudo guardar. Revisa los datos e intenta de nuevo." : null
}

export async function eliminarRegistro(tabla: TablaCarnet, id: string): Promise<string | null> {
  const { error } = await supabase.from(tabla).delete().eq("id", id)
  return error ? "No se pudo eliminar. Intenta de nuevo." : null
}

export const REGISTRO_NACIONAL_URL = "https://registratumascota.cl"
export const REGISTRO_NACIONAL_CONSULTA_URL = "https://registratumascota.cl/consultas.xhtml"
