import { textoValido } from "./validation.js"
import { AREAS_PROYECTO } from "../../src/types/proyecto.js"

export const CODIGO_PATTERN = /^[A-Za-z]+-[0-9]+$/

export function codigoValido(valor: unknown): valor is string {
  return typeof valor === "string" && CODIGO_PATTERN.test(valor)
}

export function areaValida(valor: unknown): boolean {
  return typeof valor === "string" && (AREAS_PROYECTO as readonly string[]).includes(valor)
}

export function estadoActividadValido(valor: unknown): boolean {
  return typeof valor === "string" && ["Pendiente", "En desarrollo", "Completada", "Bloqueada", "Atrasada"].includes(valor)
}

export function prioridadValida(valor: unknown): boolean {
  return typeof valor === "string" && ["Baja", "Media", "Alta", "Crítica"].includes(valor)
}

export function riesgoValido(valor: unknown): boolean {
  return typeof valor === "string" && ["Bajo", "Medio", "Alto", "Crítico"].includes(valor)
}

export function estadoHitoValido(valor: unknown): boolean {
  return typeof valor === "string" && ["Pendiente", "En curso", "Cumplido"].includes(valor)
}

export function porcentajeValido(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isInteger(valor) && valor >= 0 && valor <= 100
}

export function fechaValida(valor: unknown): valor is string {
  return typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor) && !Number.isNaN(new Date(valor).getTime())
}

export function listaCodigosValida(valor: unknown): valor is string[] {
  return Array.isArray(valor) && valor.every((v) => typeof v === "string" && CODIGO_PATTERN.test(v))
}

export function actividadTextoValida(valor: unknown): boolean {
  return textoValido(valor, { maxLength: 200, requerido: true })
}
