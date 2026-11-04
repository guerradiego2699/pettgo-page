export type ProductoPymeEstado = "pendiente" | "publicado" | "rechazado" | "archivado"
export type StockEstado = "disponible" | "agotado"
export type ProductoPymeEspecie = "perro" | "gato" | "ambos"

export interface ProductoPymePublico {
  id: string
  nombre: string
  descripcion: string | null
  imagen_url: string | null
  precio_ref: number | null
  categoria: string | null
  // Puede faltar si la migración 0013 todavía no se aplicó: se trata como "ambos".
  especie?: ProductoPymeEspecie
  pyme_nombre: string
  creado_en: string
}

// Vista productos_pyme_destacados (migración 0017): lo mismo que el público, más
// el total de clics acumulado, para poder rankear en la portada.
export interface ProductoPymeDestacado extends ProductoPymePublico {
  clics: number
}

export interface ProductoPymePropuesta {
  id: string
  nombre: string
  descripcion: string | null
  imagen_url: string | null
  precio_ref: number | null
  link_tienda: string
  categoria: string | null
  pyme_nombre: string
  estado: ProductoPymeEstado
}

export interface ProductoPymeMetrica {
  id: string
  nombre: string
  descripcion: string | null
  imagen_url: string | null
  precio_ref: number | null
  link_tienda: string
  estado: ProductoPymeEstado
  pyme_nombre: string
  pyme_email: string
  categoria: string | null
  especie: ProductoPymeEspecie
  // Consulta de stock a la pyme y archivado (migración 0017).
  stock_estado: StockEstado | null
  stock_confirmado_en: string | null
  stock_consultado_en: string | null
  // Mientras haya fecha, el botón "Preguntar stock" está bloqueado (hasta que responda o pasen 4 días).
  stock_bloqueado_hasta: string | null
  archivado_en: string | null
  archivado_motivo: "manual" | "sin_stock" | null
  vistas_totales: number
  vistas_unicas: number
  clics_totales: number
  clics_unicos: number
  tasa_clic: number
}

export interface SerieDiaria {
  dia: string
  vistas: number
  clics: number
}

export interface MetricasResponse {
  productos: ProductoPymeMetrica[]
  serieDiaria: SerieDiaria[]
}
