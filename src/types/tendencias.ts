import type { ProductoPymeEspecie } from "./productoPyme"
import type { CategoriaProducto } from "../lib/categoriasProducto"

export type PeriodoTendencias = "diario" | "semanal" | "mensual"
export type EstadoTendencia = "up" | "down" | "flat"

export interface ProductoTendencia {
  id: string
  nombre: string
  categoria: CategoriaProducto | null
  especie: ProductoPymeEspecie
  pymeNombre: string
  pymeEmail: string
  clics: number
  tienda: number
  clicsPrev: number
  tiendaPrev: number
  pasoTienda: number
  tendencia: number
  estadoTendencia: EstadoTendencia
}

export interface PymeTendencia {
  nombre: string
  email: string
  nProductos: number
  clics: number
  tienda: number
  share: number
  productoEstrella: { nombre: string; tienda: number; tendencia: number; estadoTendencia: EstadoTendencia } | null
  starShare: number
}

export interface CategoriaTendencia {
  // "sin_categoria" agrupa los productos antiguos que no calzaron con ninguna categoría.
  id: CategoriaProducto | "sin_categoria"
  nProductos: number
  clics: number
  tienda: number
  share: number
  pasoTienda: number
  tendencia: number
  estadoTendencia: EstadoTendencia
  productoEstrella: string | null
}

export interface SerieDiariaTendencia {
  dia: string
  vistas: number
  clics: number
}

export interface PuntoCrecimiento {
  etiqueta: string
  nuevos: number
  acumulado: number
}

export interface ResumenTendencias {
  periodo: PeriodoTendencias
  rangoTexto: string
  totales: { clics: number; tienda: number; clicsPrev: number; tiendaPrev: number }
  pasoTienda: number
  pasoTiendaPrev: number
  productos: ProductoTendencia[]
  pymes: PymeTendencia[]
  categorias: CategoriaTendencia[]
  trending: ProductoTendencia[]
  serieDiaria: SerieDiariaTendencia[]
  serieSub: string
}

export interface PlataformaTendencias {
  usuarios: { total: number; nuevos: number; nuevosPrev: number }
  mascotas: {
    total: number
    nuevas: number
    nuevasPrev: number
    perros: number
    gatos: number
    cachorros: number
    adultos: number
    seniors: number
  }
  activacion: number
  crecimientoUsuarios: PuntoCrecimiento[]
  veterinarias: { aprobadas: number; pendientes: number; rechazadas: number; h24: number }
  especialistas: { aprobados: number; pendientes: number; rechazados: number }
  servicios: { nombre: string; cantidad: number }[]
  propuestas: {
    enviadas: number
    publicadas: number
    pendientes: number
    rechazadas: number
    vencidas: number
    diasRespuestaProm: number | null
  }
  origenVisitas: { origen: string; vistas: number; clics: number }[]
  comunidad: { temasNuevos: number; respuestas: number; temasSinRespuesta: number; reportesPendientes: number }
}

export interface TendenciasResponse {
  resumen: ResumenTendencias
  plataforma: PlataformaTendencias
}
