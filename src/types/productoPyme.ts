export type ProductoPymeEstado = "pendiente" | "publicado" | "rechazado"
export type ProductoPymeEspecie = "perro" | "gato" | "ambos"

export interface ProductoPymePublico {
  id: string
  nombre: string
  descripcion: string | null
  imagen_url: string | null
  precio_ref: number | null
  categoria: string | null
  pyme_nombre: string
  creado_en: string
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
