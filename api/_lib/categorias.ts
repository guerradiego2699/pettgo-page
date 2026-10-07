// Categorías fijas de los productos de pymes. Debe coincidir con src/lib/categoriasProducto.ts
// y con el enum `producto_pyme_categoria` de Supabase (migración 0013).
export type CategoriaProducto = "alimento" | "higiene" | "juguetes" | "accesorios" | "salud" | "descanso"

export const CATEGORIAS: CategoriaProducto[] = ["alimento", "higiene", "juguetes", "accesorios", "salud", "descanso"]

export function categoriaValida(valor: unknown): valor is CategoriaProducto {
  return typeof valor === "string" && (CATEGORIAS as string[]).includes(valor)
}

const PATRONES: [CategoriaProducto, RegExp][] = [
  ["juguetes", /juguete|pelota|mordedor|peluche|juego/],
  ["alimento", /alimento|comida|snack|premio|croqueta|galleta|dieta/],
  ["higiene", /higiene|limpieza|shampoo|champu|cepillo|arena|aseo|ba.o/],
  ["salud", /salud|medic|vitamina|suplemento|antipulga|antiparasit|vacuna|farmac/],
  ["descanso", /descanso|cama|colchon|cojin|duerm|manta/],
  ["accesorios", /accesorio|collar|correa|arnes|ropa|chaleco|bandana|placa|transportadora|comedero|bebedero|plato/],
]

// Convierte cualquier valor guardado (categoría nueva o texto libre antiguo) en una categoría válida, o null.
export function normalizarCategoria(valor: string | null | undefined): CategoriaProducto | null {
  if (!valor) return null
  const limpio = valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
  if (categoriaValida(limpio)) return limpio
  return PATRONES.find(([, patron]) => patron.test(limpio))?.[0] ?? null
}
