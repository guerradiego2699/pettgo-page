// Aspecto de la página según el mes.
//
// El tema "base" es el que siempre tuvo PettGo (el bloque @theme de index.css).
// Los meses que no estén en TEMA_POR_MES lo usan tal cual.
//
// Para agregar un mes: suma su paleta en src/temas.css y su entrada acá.

import fotoHalloween from "../assets/halloween-hero.webp"
import fotoNavidad from "../assets/navidad-hero.webp"

export type Tema = "base" | "halloween" | "navidad"

export const TEMAS: Record<Tema, { nombre: string }> = {
  base: { nombre: "PettGo" },
  halloween: { nombre: "Halloween" },
  navidad: { nombre: "Navidad" },
}

// Clave = mes (1 = enero … 12 = diciembre).
const TEMA_POR_MES: Partial<Record<number, Tema>> = {
  10: "halloween",
  // Noviembre también lleva la navidad: se adelantó para la presentación del proyecto.
  // Para volver al aspecto normal en noviembre, basta con borrar esta línea.
  11: "navidad",
  12: "navidad",
}

function esTema(valor: string | null): valor is Tema {
  return valor !== null && valor in TEMAS
}

/**
 * Qué tema corresponde mostrar.
 *
 * El parámetro `?tema=` de la URL manda por encima del mes. Sin eso, cada tema
 * solo se podría ver durante su mes, y en una presentación o una revisión con el
 * equipo no habría forma de mostrar los demás.
 */
export function resolverTema(): Tema {
  const forzado = new URLSearchParams(window.location.search).get("tema")
  if (esTema(forzado)) return forzado
  return TEMA_POR_MES[new Date().getMonth() + 1] ?? "base"
}

/** Tema de esta carga de la página. Se calcula una sola vez. */
export const TEMA_ACTIVO = resolverTema()

export interface FotoHero {
  src: string
  /**
   * Clases de Tailwind para encuadrar ESTA foto en el Hero. El encuadre depende
   * de dónde esté el animal en cada imagen, así que no puede ser uno solo para
   * todas: la de Halloween hay que correrla para que el logo no tape al gato, y
   * la de navidad ya viene centrada.
   */
  ajuste?: string
}

// Foto de fondo del Hero, por tema. Un tema sin entrada acá deja el Hero con su
// fondo de siempre.
const FOTO_POR_TEMA: Partial<Record<Tema, FotoHero>> = {
  halloween: { src: fotoHalloween, ajuste: "object-center -translate-x-[9%] scale-[1.25]" },
  // El gatito queda algo a la izquierda, donde va el texto: se corre a la derecha.
  navidad: { src: fotoNavidad, ajuste: "object-center translate-x-[8%] scale-[1.2]" },
}

/** Foto de fondo del Hero para el tema activo, o null si este tema no lleva. */
export const FOTO_HERO: FotoHero | null = FOTO_POR_TEMA[TEMA_ACTIVO] ?? null

/** Marca el <html> para que los bloques de src/temas.css tomen efecto. */
export function aplicarTema() {
  document.documentElement.dataset.tema = TEMA_ACTIVO
}
