// Reglas de cálculo del módulo de Gestión de Proyecto.
//
// Importante: estas reglas (puntaje de riesgo, ruta crítica, prioridad
// sugerida) son un diseño propio, pensado para ser razonable y transparente —
// no son la réplica de ningún sistema externo. Los umbrales están pensados
// para ajustarse fácilmente si no calzan con cómo trabaja el equipo.

import type {
  Actividad,
  ActividadCalculada,
  Alerta,
  AnalisisProyecto,
  FactorRiesgo,
  GrafoArista,
  GrafoNodo,
  Hito,
  HitoCalculado,
  ProyectoEstado,
  ProyectoPrioridad,
  ProyectoRiesgo,
  Resumen,
  RutaCritica,
} from "../../src/types/proyecto.js"

const MS_DIA = 24 * 60 * 60 * 1000
const DURACION_POR_DEFECTO_DIAS = 5

function hoyUTC(): Date {
  const d = new Date()
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
}

function aFecha(iso: string | null): Date | null {
  if (!iso) return null
  const d = new Date(iso + "T00:00:00Z")
  return Number.isNaN(d.getTime()) ? null : d
}

function diffDias(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / MS_DIA)
}

const PUNTOS_RIESGO_DECLARADO: Record<ProyectoRiesgo, number> = { Bajo: 0, Medio: 10, Alto: 20, Crítico: 30 }
const PESO_RIESGO: Record<ProyectoRiesgo, number> = { Bajo: 0, Medio: 1, Alto: 2, Crítico: 3 }

function nivelRiesgo(puntos: number): ProyectoRiesgo {
  if (puntos >= 60) return "Crítico"
  if (puntos >= 35) return "Alto"
  if (puntos >= 15) return "Medio"
  return "Bajo"
}

function nivelPrioridad(puntos: number): ProyectoPrioridad {
  if (puntos >= 45) return "Crítica"
  if (puntos >= 28) return "Alta"
  if (puntos >= 12) return "Media"
  return "Baja"
}

function estadoCalculado(act: Actividad, hoy: Date): ProyectoEstado {
  if (act.avance_real >= 100) return "Completada"
  if (act.estado === "Bloqueada") return "Bloqueada"
  const limite = aFecha(act.fecha_limite)
  if (limite && diffDias(hoy, limite) > 0) return "Atrasada"
  return act.estado === "Atrasada" ? "En desarrollo" : act.estado
}

interface Grafo {
  nodos: string[]
  entrantes: Map<string, string[]> // codigo -> de quiénes depende (existen)
  salientes: Map<string, string[]> // codigo -> quiénes dependen de él
  ciclos: string[][]
  orden: string[] // orden topológico (excluye nodos en ciclo)
}

function construirGrafo(actividades: Actividad[]): Grafo {
  const codigos = new Set(actividades.map((a) => a.codigo))
  const entrantes = new Map<string, string[]>()
  const salientes = new Map<string, string[]>()
  for (const a of actividades) {
    const deps = a.dependencias.filter((d) => codigos.has(d))
    entrantes.set(a.codigo, deps)
    if (!salientes.has(a.codigo)) salientes.set(a.codigo, [])
    for (const d of deps) {
      if (!salientes.has(d)) salientes.set(d, [])
      salientes.get(d)!.push(a.codigo)
    }
  }

  // Kahn: orden topológico + detección de ciclos (lo que queda sin procesar).
  const gradoEntrada = new Map<string, number>()
  for (const a of actividades) gradoEntrada.set(a.codigo, entrantes.get(a.codigo)!.length)
  const cola = [...gradoEntrada.entries()].filter(([, g]) => g === 0).map(([c]) => c)
  const orden: string[] = []
  const restante = new Map(gradoEntrada)
  while (cola.length) {
    const c = cola.shift()!
    orden.push(c)
    for (const sig of salientes.get(c) ?? []) {
      restante.set(sig, (restante.get(sig) ?? 0) - 1)
      if (restante.get(sig) === 0) cola.push(sig)
    }
  }

  const enCiclo = new Set(actividades.map((a) => a.codigo).filter((c) => !orden.includes(c)))
  const ciclos: string[][] = []
  const visitados = new Set<string>()
  for (const inicio of enCiclo) {
    if (visitados.has(inicio)) continue
    const camino: string[] = []
    let actual: string | undefined = inicio
    const enCaminoSet = new Set<string>()
    while (actual && enCiclo.has(actual) && !enCaminoSet.has(actual)) {
      camino.push(actual)
      enCaminoSet.add(actual)
      actual = (entrantes.get(actual) ?? []).find((d) => enCiclo.has(d))
    }
    if (actual && enCaminoSet.has(actual)) {
      const idx = camino.indexOf(actual)
      ciclos.push([...camino.slice(idx), actual])
    }
    camino.forEach((c) => visitados.add(c))
  }

  return { nodos: [...codigos], entrantes, salientes, ciclos, orden }
}

function duracionDias(act: Actividad): number {
  const inicio = aFecha(act.fecha_inicio)
  const limite = aFecha(act.fecha_limite)
  if (inicio && limite) return Math.max(1, diffDias(limite, inicio))
  return DURACION_POR_DEFECTO_DIAS
}

function calcularRutaCritica(actividades: Actividad[], grafo: Grafo): { ruta: RutaCritica; enRuta: Set<string> } {
  const porCodigo = new Map(actividades.map((a) => [a.codigo, a]))
  const largoHasta = new Map<string, number>()
  const predecesor = new Map<string, string | null>()

  for (const c of grafo.orden) {
    const act = porCodigo.get(c)!
    const deps = grafo.entrantes.get(c) ?? []
    let mejor = 0
    let mejorDep: string | null = null
    for (const d of deps) {
      const largo = largoHasta.get(d) ?? 0
      if (largo > mejor) {
        mejor = largo
        mejorDep = d
      }
    }
    largoHasta.set(c, mejor + duracionDias(act))
    predecesor.set(c, mejorDep)
  }

  let finCodigo: string | null = null
  let mejorTotal = 0
  for (const [c, largo] of largoHasta) {
    if (largo > mejorTotal) {
      mejorTotal = largo
      finCodigo = c
    }
  }

  const ruta: string[] = []
  let actual = finCodigo
  while (actual) {
    ruta.unshift(actual)
    actual = predecesor.get(actual) ?? null
  }

  return { ruta: { ruta, duracion_dias: mejorTotal }, enRuta: new Set(ruta) }
}

function calcularRiesgo(
  act: Actividad,
  estadoCalc: ProyectoEstado,
  diasAtraso: number,
  desviacion: number,
  dependientesDirectos: string[],
  hitosPorActividad: Map<string, { dias_restantes: number; estado_declarado: string }[]>
): { puntaje: number; nivel: ProyectoRiesgo; factores: FactorRiesgo[] } {
  const factores: FactorRiesgo[] = []
  let puntaje = PUNTOS_RIESGO_DECLARADO[act.riesgo]
  if (PUNTOS_RIESGO_DECLARADO[act.riesgo] > 0) {
    factores.push({ regla: "Riesgo declarado", detalle: `Declarado como ${act.riesgo}`, puntos: PUNTOS_RIESGO_DECLARADO[act.riesgo] })
  }
  if (estadoCalc === "Atrasada" && diasAtraso > 0) {
    const p = Math.min(30, diasAtraso * 2)
    puntaje += p
    factores.push({ regla: "Atraso", detalle: `${diasAtraso} día(s) después de la fecha límite`, puntos: p })
  }
  if (estadoCalc === "Bloqueada") {
    puntaje += 25
    factores.push({ regla: "Bloqueada", detalle: "La actividad está bloqueada", puntos: 25 })
  }
  if (dependientesDirectos.length > 0) {
    const p = Math.min(20, dependientesDirectos.length * 5)
    puntaje += p
    factores.push({ regla: "Dependientes", detalle: `${dependientesDirectos.length} actividad(es) dependen de esta`, puntos: p })
  }
  if (desviacion <= -20 && estadoCalc !== "Completada") {
    puntaje += 15
    factores.push({ regla: "Desviación", detalle: `${Math.abs(desviacion)} pp por debajo del avance esperado`, puntos: 15 })
  }
  const hitos = hitosPorActividad.get(act.codigo) ?? []
  const hitoProximo = hitos.find((h) => h.estado_declarado !== "Cumplido" && h.dias_restantes >= 0 && h.dias_restantes <= 14)
  if (hitoProximo && estadoCalc !== "Completada") {
    puntaje += 15
    factores.push({ regla: "Hito próximo", detalle: `Un hito que la requiere vence en ${hitoProximo.dias_restantes} día(s)`, puntos: 15 })
  }
  return { puntaje, nivel: nivelRiesgo(puntaje), factores }
}

export function calcularAnalisis(actividades: Actividad[], hitos: Hito[]): AnalisisProyecto {
  const hoy = hoyUTC()
  const grafo = construirGrafo(actividades)
  const { ruta: rutaCritica, enRuta } = calcularRutaCritica(actividades, grafo)

  const dependientesDirectosMap = new Map<string, string[]>()
  for (const a of actividades) {
    dependientesDirectosMap.set(
      a.codigo,
      actividades.filter((x) => x.dependencias.includes(a.codigo)).map((x) => x.codigo)
    )
  }

  // Hitos: primera pasada liviana (sin motivos) para poder usarlos en el
  // puntaje de riesgo de las actividades.
  const hitosPorActividad = new Map<string, { dias_restantes: number; estado_declarado: string }[]>()
  for (const h of hitos) {
    const fecha = aFecha(h.fecha)
    const dias = fecha ? diffDias(fecha, hoy) : 9999
    for (const codigo of h.actividades_requeridas) {
      if (!hitosPorActividad.has(codigo)) hitosPorActividad.set(codigo, [])
      hitosPorActividad.get(codigo)!.push({ dias_restantes: dias, estado_declarado: h.estado_declarado })
    }
  }

  const actividadesCalculadas: ActividadCalculada[] = actividades.map((a) => {
    const estadoCalc = estadoCalculado(a, hoy)
    const limite = aFecha(a.fecha_limite)
    const diasAtraso = estadoCalc === "Atrasada" && limite ? diffDias(hoy, limite) : 0
    const diasParaVencer = limite && estadoCalc !== "Completada" ? diffDias(limite, hoy) : null
    const desviacion = a.avance_real - a.avance_esperado
    const dependientesDirectos = dependientesDirectosMap.get(a.codigo) ?? []
    const { puntaje, nivel, factores } = calcularRiesgo(a, estadoCalc, diasAtraso, desviacion, dependientesDirectos, hitosPorActividad)

    const puntosPrioridad =
      PESO_RIESGO[nivel] * 10 + (enRuta.has(a.codigo) ? 15 : 0) + Math.min(15, diasAtraso) + Math.min(9, dependientesDirectos.length * 3)
    const prioridadSugerida = nivelPrioridad(puntosPrioridad)
    const razones = [
      enRuta.has(a.codigo) && "está en la ruta crítica",
      diasAtraso > 0 && `lleva ${diasAtraso} día(s) de atraso`,
      dependientesDirectos.length > 0 && `${dependientesDirectos.length} actividad(es) dependen de ella`,
      nivel !== "Bajo" && `su riesgo calculado es ${nivel.toLowerCase()}`,
    ].filter(Boolean) as string[]

    return {
      ...a,
      estado_calculado: estadoCalc,
      dias_atraso: diasAtraso,
      dias_para_vencer: diasParaVencer,
      desviacion,
      en_ruta_critica: enRuta.has(a.codigo),
      puntaje_riesgo: puntaje,
      riesgo_calculado: nivel,
      factores_riesgo: factores,
      prioridad_sugerida: prioridadSugerida,
      explicacion_prioridad: razones.length ? "Sugerida así porque " + razones.join(", ") + "." : "Sin factores que la urjan por ahora.",
      dependientes_directos: dependientesDirectos,
      discrepancia_con_declarado: PESO_RIESGO[nivel] - PESO_RIESGO[a.riesgo] >= 2,
    }
  })

  const porCodigo = new Map(actividadesCalculadas.map((a) => [a.codigo, a]))

  const hitosCalculados: HitoCalculado[] = hitos.map((h) => {
    const fecha = aFecha(h.fecha)
    const diasRestantes = fecha ? diffDias(fecha, hoy) : 0
    const requeridas = h.actividades_requeridas.map((c) => porCodigo.get(c)).filter((x): x is ActividadCalculada => !!x)
    const avancePromedio = requeridas.length ? Math.round(requeridas.reduce((s, a) => s + a.avance_real, 0) / requeridas.length) : 0
    const motivos: string[] = []
    const problematicas = requeridas.filter((a) => a.estado_calculado === "Bloqueada" || a.estado_calculado === "Atrasada")
    if (problematicas.length) motivos.push(`${problematicas.map((a) => a.codigo).join(", ")} está(n) atrasada(s) o bloqueada(s)`)
    if (diasRestantes < 0 && h.estado_declarado !== "Cumplido") motivos.push("la fecha del hito ya venció")
    else if (diasRestantes <= 7 && avancePromedio < 80 && h.estado_declarado !== "Cumplido")
      motivos.push(`vence en ${diasRestantes} día(s) con solo ${avancePromedio}% de avance promedio`)

    const estadoCalc: typeof h.estado_declarado =
      h.estado_declarado === "Cumplido" || avancePromedio >= 100 ? "Cumplido" : h.estado_declarado
    const enRiesgo = estadoCalc !== "Cumplido" && (motivos.length > 0 || diasRestantes < 0)

    return { ...h, estado_calculado: estadoCalc, dias_restantes: diasRestantes, avance_promedio: avancePromedio, motivos, en_riesgo: enRiesgo }
  })

  // Alertas
  const alertas: Alerta[] = []
  for (const a of actividadesCalculadas) {
    if (a.estado_calculado === "Bloqueada") {
      alertas.push({
        nivel: "CRÍTICO",
        tipo: "Actividad bloqueada",
        area: a.area,
        actividad: a.actividad,
        actividad_codigo: a.codigo,
        problema: "La actividad está marcada como bloqueada.",
        impacto: a.dependientes_directos.length
          ? `Bloquea a ${a.dependientes_directos.join(", ")}.`
          : "No tiene actividades dependientes directas.",
        actividades_relacionadas: a.dependientes_directos,
        fecha_limite: a.fecha_limite,
        accion_recomendada: "Revisar qué la bloquea y reasignar o desbloquear cuanto antes.",
        requiere_aprobacion: true,
      })
    } else if (a.estado_calculado === "Atrasada") {
      alertas.push({
        nivel: a.dias_atraso > 7 ? "ALTO" : "MEDIO",
        tipo: "Actividad atrasada",
        area: a.area,
        actividad: a.actividad,
        actividad_codigo: a.codigo,
        problema: `Pasó la fecha límite hace ${a.dias_atraso} día(s), con ${a.avance_real}% de avance.`,
        impacto: a.en_ruta_critica ? "Está en la ruta crítica del proyecto." : "No está en la ruta crítica actual.",
        actividades_relacionadas: a.dependientes_directos,
        fecha_limite: a.fecha_limite,
        accion_recomendada: "Evaluar una propuesta de reprogramación o reforzar al responsable.",
        requiere_aprobacion: a.dias_atraso > 7,
      })
    }
    if (a.riesgo_calculado === "Crítico" && a.estado_calculado !== "Bloqueada") {
      alertas.push({
        nivel: "CRÍTICO",
        tipo: "Riesgo crítico",
        area: a.area,
        actividad: a.actividad,
        actividad_codigo: a.codigo,
        problema: `Puntaje de riesgo ${a.puntaje_riesgo} (${a.factores_riesgo.map((f) => f.regla).join(", ")}).`,
        impacto: "Alta probabilidad de afectar el cronograma general.",
        actividades_relacionadas: a.dependientes_directos,
        fecha_limite: a.fecha_limite,
        accion_recomendada: "Priorizar su revisión en la próxima reunión de equipo.",
        requiere_aprobacion: false,
      })
    } else if (a.discrepancia_con_declarado) {
      alertas.push({
        nivel: "MEDIO",
        tipo: "Riesgo subestimado",
        area: a.area,
        actividad: a.actividad,
        actividad_codigo: a.codigo,
        problema: `Se declaró como riesgo ${a.riesgo}, pero el cálculo la sitúa en ${a.riesgo_calculado}.`,
        impacto: "El responsable podría no estar viendo la urgencia real.",
        actividades_relacionadas: [],
        fecha_limite: a.fecha_limite,
        accion_recomendada: "Conversar con el responsable para actualizar el riesgo declarado.",
        requiere_aprobacion: false,
      })
    }
  }
  for (const h of hitosCalculados) {
    if (h.en_riesgo) {
      alertas.push({
        nivel: h.dias_restantes < 0 ? "CRÍTICO" : h.dias_restantes <= 7 ? "ALTO" : "MEDIO",
        tipo: "Hito en riesgo",
        area: "Gestión de Proyectos",
        actividad: h.nombre,
        actividad_codigo: h.codigo,
        problema: h.motivos.join("; ") || "Hito en riesgo de no cumplirse.",
        impacto: `Requiere: ${h.actividades_requeridas.join(", ") || "—"}.`,
        actividades_relacionadas: h.actividades_requeridas,
        fecha_limite: h.fecha,
        accion_recomendada: "Revisar el avance de las actividades requeridas antes de la fecha del hito.",
        requiere_aprobacion: h.dias_restantes < 7,
      })
    }
  }
  const ordenNivel: Record<Alerta["nivel"], number> = { CRÍTICO: 0, ALTO: 1, MEDIO: 2, BAJO: 3 }
  alertas.sort((a, b) => ordenNivel[a.nivel] - ordenNivel[b.nivel])

  // Actividades críticas (para el dashboard): en ruta crítica o bloqueadas.
  const actividadesCriticas = actividadesCalculadas
    .filter((a) => a.en_ruta_critica || a.estado_calculado === "Bloqueada")
    .map((a) => {
      const visitados = new Set<string>()
      const cola = [...a.dependientes_directos]
      while (cola.length) {
        const c = cola.shift()!
        if (visitados.has(c)) continue
        visitados.add(c)
        cola.push(...(porCodigo.get(c)?.dependientes_directos ?? []))
      }
      const motivos = [a.en_ruta_critica && "en la ruta crítica del proyecto", a.estado_calculado === "Bloqueada" && "bloqueada"].filter(
        Boolean
      ) as string[]
      return { codigo: a.codigo, actividad: a.actividad, area: a.area, afectadas: visitados.size, motivos }
    })
    .sort((a, b) => b.afectadas - a.afectadas)

  // Resumen
  const total = actividadesCalculadas.length
  const avanceGeneral = total ? Math.round(actividadesCalculadas.reduce((s, a) => s + a.avance_real, 0) / total) : 0
  const avanceEsperadoGeneral = total ? Math.round(actividadesCalculadas.reduce((s, a) => s + a.avance_esperado, 0) / total) : 0
  const riesgosCriticos = actividadesCalculadas.filter((a) => a.riesgo_calculado === "Crítico").length
  const riesgosAltos = actividadesCalculadas.filter((a) => a.riesgo_calculado === "Alto").length
  const bloqueadas = actividadesCalculadas.filter((a) => a.estado_calculado === "Bloqueada").length
  const atrasadas = actividadesCalculadas.filter((a) => a.estado_calculado === "Atrasada").length
  const hitosEnRiesgo = hitosCalculados.filter((h) => h.en_riesgo).length

  const resumen: Resumen = {
    estado_general: riesgosCriticos > 0 || bloqueadas > 0 ? "ROJO" : riesgosAltos > 0 || atrasadas > 0 ? "AMARILLO" : "VERDE",
    avance_general: avanceGeneral,
    avance_esperado_general: avanceEsperadoGeneral,
    desviacion_general: avanceGeneral - avanceEsperadoGeneral,
    total_actividades: total,
    completadas: actividadesCalculadas.filter((a) => a.estado_calculado === "Completada").length,
    en_desarrollo: actividadesCalculadas.filter((a) => a.estado_calculado === "En desarrollo").length,
    pendientes: actividadesCalculadas.filter((a) => a.estado_calculado === "Pendiente").length,
    atrasadas,
    bloqueadas,
    riesgos_criticos: riesgosCriticos,
    riesgos_altos: riesgosAltos,
    hitos_total: hitosCalculados.length,
    hitos_en_riesgo: hitosEnRiesgo,
  }

  const nodos: GrafoNodo[] = actividadesCalculadas.map((a) => ({
    codigo: a.codigo,
    actividad: a.actividad,
    estado: a.estado_calculado,
    nivel: grafo.orden.includes(a.codigo) ? nivelEnGrafo(a.codigo, grafo) : 0,
  }))
  const aristas: GrafoArista[] = []
  for (const a of actividades) {
    for (const d of a.dependencias) {
      if (porCodigo.has(d)) aristas.push({ desde: d, hacia: a.codigo })
    }
  }

  return {
    resumen,
    actividades: actividadesCalculadas,
    hitos: hitosCalculados,
    alertas,
    actividades_criticas: actividadesCriticas,
    ruta_critica: rutaCritica,
    ciclos: grafo.ciclos,
    grafo: { nodos, aristas },
  }
}

function nivelEnGrafo(codigo: string, grafo: Grafo): number {
  const deps = grafo.entrantes.get(codigo) ?? []
  if (deps.length === 0) return 0
  return 1 + Math.max(...deps.map((d) => nivelEnGrafo(d, grafo)))
}
