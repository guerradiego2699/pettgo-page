export type ProyectoEstado = "Pendiente" | "En desarrollo" | "Completada" | "Bloqueada" | "Atrasada"
export type ProyectoPrioridad = "Baja" | "Media" | "Alta" | "Crítica"
export type ProyectoRiesgo = "Bajo" | "Medio" | "Alto" | "Crítico"
export type ProyectoHitoEstado = "Pendiente" | "En curso" | "Cumplido"
export type ProyectoPropuestaEstado = "PENDIENTE DE APROBACIÓN" | "APROBADA" | "RECHAZADA"

export const AREAS_PROYECTO = [
  "Gestión de Proyectos",
  "Gestión Financiera",
  "Gestión de Marketing",
  "Gestión de Operaciones",
  "Gestión de Clientes y Comunidad",
  "Gestión Tecnológica",
  "Gestión Legal, Seguridad y Protección de Datos",
] as const

export const AGENTES_AREA = [
  "Financiero",
  "Marketing",
  "Operaciones",
  "Clientes y Comunidad",
  "Tecnología",
  "Legal, Seguridad y Protección de Datos",
] as const

export interface Actividad {
  codigo: string
  area: string
  actividad: string
  responsable: string | null
  estado: ProyectoEstado
  fecha_inicio: string | null
  fecha_limite: string | null
  avance_esperado: number
  avance_real: number
  prioridad: ProyectoPrioridad
  riesgo: ProyectoRiesgo
  dependencias: string[]
  observaciones: string | null
  creado_en: string
  actualizado_en: string
}

export interface FactorRiesgo {
  regla: string
  detalle: string
  puntos: number
}

export interface ActividadCalculada extends Actividad {
  estado_calculado: ProyectoEstado
  dias_atraso: number
  dias_para_vencer: number | null
  desviacion: number
  en_ruta_critica: boolean
  puntaje_riesgo: number
  riesgo_calculado: ProyectoRiesgo
  factores_riesgo: FactorRiesgo[]
  prioridad_sugerida: ProyectoPrioridad
  explicacion_prioridad: string
  dependientes_directos: string[]
  discrepancia_con_declarado: boolean
}

export interface Hito {
  codigo: string
  nombre: string
  fecha: string
  estado_declarado: ProyectoHitoEstado
  actividades_requeridas: string[]
  descripcion: string | null
}

export interface HitoCalculado extends Hito {
  estado_calculado: ProyectoHitoEstado
  dias_restantes: number
  avance_promedio: number
  motivos: string[]
  en_riesgo: boolean
}

export interface Alerta {
  nivel: "CRÍTICO" | "ALTO" | "MEDIO" | "BAJO"
  tipo: string
  area: string
  actividad: string
  actividad_codigo: string | null
  problema: string
  impacto: string
  actividades_relacionadas: string[]
  fecha_limite: string | null
  accion_recomendada: string
  requiere_aprobacion: boolean
}

export interface Resumen {
  estado_general: "ROJO" | "AMARILLO" | "VERDE"
  avance_general: number
  avance_esperado_general: number
  desviacion_general: number
  total_actividades: number
  completadas: number
  en_desarrollo: number
  pendientes: number
  atrasadas: number
  bloqueadas: number
  riesgos_criticos: number
  riesgos_altos: number
  hitos_total: number
  hitos_en_riesgo: number
}

export interface RutaCritica {
  ruta: string[]
  duracion_dias: number
}

export interface GrafoNodo {
  codigo: string
  actividad: string
  estado: ProyectoEstado
  nivel: number
}

export interface GrafoArista {
  desde: string
  hacia: string
}

export interface AnalisisProyecto {
  resumen: Resumen
  actividades: ActividadCalculada[]
  hitos: HitoCalculado[]
  alertas: Alerta[]
  actividades_criticas: { codigo: string; actividad: string; area: string; afectadas: number; motivos: string[] }[]
  ruta_critica: RutaCritica
  ciclos: string[][]
  grafo: { nodos: GrafoNodo[]; aristas: GrafoArista[] }
}

export interface Propuesta {
  id: string
  actividad_codigo: string
  texto: string
  cronograma_propuesto: {
    codigo: string
    nivel_dependencia: number
    fecha_inicio_actual: string | null
    fecha_inicio_propuesta: string | null
    fecha_limite_actual: string | null
    fecha_limite_propuesta: string | null
    desplazamiento_dias: number
  }[]
  estado: ProyectoPropuestaEstado
  decidido_por: string | null
  comentario_decision: string | null
  decidido_en: string | null
  creado_en: string
}

export interface ReporteArea {
  id: string
  agente: string
  actividad: string
  actividad_codigo: string | null
  avance: number | null
  riesgo: string | null
  mensaje: string
  creado_en: string
  avance_registrado: number | null
  diferencia: number | null
}

export interface EntradaAuditoria {
  id: number
  creado_en: string
  tipo_analisis: string
  origen: string
  actividad: string | null
  riesgo_detectado: string | null
  recomendacion: string | null
}
