import type { ProductoPymeEspecie } from "../types/productoPyme"

// Categorías fijas de los productos de pymes. Si cambian, hay que actualizar también:
// api/_lib/categorias.ts y el enum `producto_pyme_categoria` en Supabase (migración 0013).
export type CategoriaProducto = "alimento" | "higiene" | "juguetes" | "accesorios" | "salud" | "descanso"

export const CATEGORIAS_PRODUCTO: { id: CategoriaProducto; label: string }[] = [
  { id: "alimento", label: "Alimento" },
  { id: "higiene", label: "Higiene" },
  { id: "juguetes", label: "Juguetes" },
  { id: "accesorios", label: "Accesorios" },
  { id: "salud", label: "Salud" },
  { id: "descanso", label: "Descanso" },
]

export const ESPECIE_LABEL: Record<ProductoPymeEspecie, string> = {
  perro: "Perro",
  gato: "Gato",
  ambos: "Perro y gato",
}

// Palabras que en los textos libres antiguos indican cada categoría (mismo criterio y orden que la migración 0013).
const PATRONES: [CategoriaProducto, RegExp][] = [
  ["juguetes", /juguete|pelota|mordedor|peluche|juego/],
  ["alimento", /alimento|comida|snack|premio|croqueta|galleta|dieta/],
  ["higiene", /higiene|limpieza|shampoo|champu|cepillo|arena|aseo|ba.o/],
  ["salud", /salud|medic|vitamina|suplemento|antipulga|antiparasit|vacuna|farmac/],
  ["descanso", /descanso|cama|colchon|cojin|duerm|manta/],
  ["accesorios", /accesorio|collar|correa|arnes|ropa|chaleco|bandana|placa|transportadora|comedero|bebedero|plato/],
]

// Convierte cualquier valor guardado (categoría nueva o texto libre antiguo) en una de las 6 categorías, o null.
export function normalizarCategoria(valor: string | null | undefined): CategoriaProducto | null {
  if (!valor) return null
  const limpio = valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
  const exacta = CATEGORIAS_PRODUCTO.find((c) => c.id === limpio)
  if (exacta) return exacta.id
  return PATRONES.find(([, patron]) => patron.test(limpio))?.[0] ?? null
}

export function etiquetaCategoria(valor: string | null | undefined): string | null {
  const id = normalizarCategoria(valor)
  return id ? (CATEGORIAS_PRODUCTO.find((c) => c.id === id)?.label ?? null) : null
}

// Un producto "para ambos" aparece tanto al filtrar perros como al filtrar gatos.
export function coincideMascota(especie: ProductoPymeEspecie | null | undefined, filtro: "perro" | "gato" | null): boolean {
  if (!filtro) return true
  const e = especie ?? "ambos"
  return e === "ambos" || e === filtro
}

// Etiqueta para el id que devuelve Tendencias ("sin_categoria" agrupa los productos antiguos sin categoría).
export function etiquetaIdCategoria(id: string): string {
  return id === "sin_categoria" ? "Sin categoría" : (etiquetaCategoria(id) ?? id)
}
