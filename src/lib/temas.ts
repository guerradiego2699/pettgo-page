// Aspecto de la página según el mes.
//
// El tema "base" es el que siempre tuvo PettGo (el bloque @theme de index.css).
// Los meses que no estén en TEMA_POR_MES lo usan tal cual.
//
// Para agregar un mes: suma su paleta en src/temas.css y su entrada acá.

export type Tema = "base" | "halloween"

export const TEMAS: Record<Tema, { nombre: string }> = {
  base: { nombre: "PettGo" },
  halloween: { nombre: "Halloween" },
}

// Clave = mes (1 = enero … 12 = diciembre).
const TEMA_POR_MES: Partial<Record<number, Tema>> = {
  10: "halloween",
}

function esTema(valor: string | null): valor is Tema {
  return valor !== null && valor in TEMAS
}

/**
 * Qué tema corresponde mostrar.
 *
 * El parámetro `?tema=` de la URL manda por encima del mes. Sin eso, el tema de
 * Halloween solo se podría ver durante octubre, y en una presentación o una
 * revisión con el equipo no habría forma de mostrar los demás.
 */
export function resolverTema(): Tema {
  const forzado = new URLSearchParams(window.location.search).get("tema")
  if (esTema(forzado)) return forzado
  return TEMA_POR_MES[new Date().getMonth() + 1] ?? "base"
}

/** Tema de esta carga de la página. Se calcula una sola vez. */
export const TEMA_ACTIVO = resolverTema()

/** Marca el <html> para que los bloques de src/temas.css tomen efecto. */
export function aplicarTema() {
  document.documentElement.dataset.tema = TEMA_ACTIVO
}
