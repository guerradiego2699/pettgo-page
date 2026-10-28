import type { AnalisisProyecto, EntradaAuditoria, Propuesta, ReporteArea } from "../types/proyecto"

export class ErrorAprobacion extends Error {
  accion: string
  camposSensibles?: string[]
  dependientesDirectos?: string[]
  constructor(mensaje: string, accion: string, camposSensibles?: string[], dependientesDirectos?: string[]) {
    super(mensaje)
    this.accion = accion
    this.camposSensibles = camposSensibles
    this.dependientesDirectos = dependientesDirectos
  }
}

async function llamar<T>(token: string, path: string, opciones: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...opciones,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...opciones.headers },
  })
  const body = await res.json().catch(() => ({}))
  if (res.status === 409 && body.accion) {
    throw new ErrorAprobacion(body.error || "Requiere aprobación.", body.accion, body.camposSensibles, body.dependientesDirectos)
  }
  if (!res.ok) throw new Error(body.error || "Ocurrió un error inesperado.")
  return body as T
}

// Todas las rutas cuelgan de un único endpoint (/api/admin/proyecto) con un
// parámetro ?seccion= para el ruteo interno: el módulo completo se consolidó
// en una sola función serverless para no exceder el límite de 12 funciones
// del plan Hobby de Vercel (ver api/admin/proyecto.ts).
export const proyectoApi = {
  analisis: (token: string, registrar?: "analisis" | "reporte") =>
    llamar<AnalisisProyecto>(token, `/api/admin/proyecto${registrar ? `?registrar=${registrar}` : ""}`),

  crearActividad: (token: string, datos: Record<string, unknown>) =>
    llamar(token, "/api/admin/proyecto?seccion=actividades", { method: "POST", body: JSON.stringify(datos) }),

  editarActividad: (token: string, codigo: string, datos: Record<string, unknown>) =>
    llamar(token, `/api/admin/proyecto?seccion=actividades&codigo=${encodeURIComponent(codigo)}`, {
      method: "PATCH",
      body: JSON.stringify(datos),
    }),

  eliminarActividad: (token: string, codigo: string, aprobadoPor?: string) => {
    const params = new URLSearchParams({ seccion: "actividades", codigo })
    if (aprobadoPor) {
      params.set("confirmar", "true")
      params.set("aprobado_por", aprobadoPor)
    }
    return llamar(token, `/api/admin/proyecto?${params.toString()}`, { method: "DELETE" })
  },

  crearHito: (token: string, datos: Record<string, unknown>) =>
    llamar<{ actividades_inexistentes: string[] }>(token, "/api/admin/proyecto?seccion=hitos", { method: "POST", body: JSON.stringify(datos) }),

  editarHito: (token: string, codigo: string, datos: Record<string, unknown>) =>
    llamar<{ actividades_inexistentes: string[] }>(token, `/api/admin/proyecto?seccion=hitos&codigo=${encodeURIComponent(codigo)}`, {
      method: "PATCH",
      body: JSON.stringify(datos),
    }),

  eliminarHito: (token: string, codigo: string, aprobadoPor?: string) => {
    const params = new URLSearchParams({ seccion: "hitos", codigo })
    if (aprobadoPor) {
      params.set("confirmar", "true")
      params.set("aprobado_por", aprobadoPor)
    }
    return llamar(token, `/api/admin/proyecto?${params.toString()}`, { method: "DELETE" })
  },

  listarPropuestas: (token: string) => llamar<Propuesta[]>(token, "/api/admin/proyecto?seccion=propuestas"),

  crearPropuesta: (token: string, actividadCodigo: string, nuevaFechaLimite?: string) =>
    llamar<Propuesta>(token, "/api/admin/proyecto?seccion=propuestas", {
      method: "POST",
      body: JSON.stringify({ actividad_codigo: actividadCodigo, nueva_fecha_limite: nuevaFechaLimite || undefined }),
    }),

  decidirPropuesta: (token: string, id: string, aprobado: boolean, responsable: string, comentario?: string) =>
    llamar(token, `/api/admin/proyecto?seccion=propuestas&id=${encodeURIComponent(id)}`, {
      method: "POST",
      body: JSON.stringify({ aprobado, responsable, comentario }),
    }),

  listarReportesArea: (token: string) =>
    llamar<{ reportes: ReporteArea[]; agentes_sin_reporte: string[] }>(token, "/api/admin/proyecto?seccion=reportes-area"),

  crearReporteArea: (token: string, datos: Record<string, unknown>) =>
    llamar(token, "/api/admin/proyecto?seccion=reportes-area", { method: "POST", body: JSON.stringify(datos) }),

  listarAuditoria: (token: string) => llamar<EntradaAuditoria[]>(token, "/api/admin/proyecto?seccion=auditoria"),
}
