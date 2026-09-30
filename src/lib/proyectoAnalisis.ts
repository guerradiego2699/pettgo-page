import type { AnalisisProyecto } from "../types/proyecto"

// Resumen calculado a partir de los datos reales — sin IA, gratis e inmediato.
export function analisisLocalProyecto(a: AnalisisProyecto): string {
  const r = a.resumen
  if (r.total_actividades === 0) {
    return "Todavía no hay actividades registradas. Agrega actividades en la pestaña «Actividades» para que este análisis se arme solo."
  }

  let s = `El proyecto está en estado ${r.estado_general}, con ${r.avance_general}% de avance general frente a un ${r.avance_esperado_general}% esperado. `
  s += `De ${r.total_actividades} actividades, ${r.completadas} están completadas, ${r.en_desarrollo} en desarrollo, ${r.atrasadas} atrasadas y ${r.bloqueadas} bloqueadas. `

  if (r.bloqueadas > 0) {
    s += `Hay ${r.bloqueadas} actividad(es) bloqueada(s) que conviene resolver antes de seguir avanzando. `
  }
  if (a.actividades_criticas[0]) {
    const c = a.actividades_criticas[0]
    s += `La actividad más crítica ahora es ${c.codigo} (${c.actividad}): ${c.motivos.join(", ")}, y afecta a ${c.afectadas} actividad(es) más. `
  }
  if (r.hitos_en_riesgo > 0) {
    s += `${r.hitos_en_riesgo} de ${r.hitos_total} hitos están en riesgo de no cumplirse a tiempo. `
  }
  if (a.ciclos.length > 0) {
    s += `Ojo: hay dependencias circulares (${a.ciclos.map((c) => c.join(" → ")).join(" | ")}) que conviene corregir. `
  }
  s +=
    r.riesgos_criticos > 0
      ? `Recomendación: priorizar las ${r.riesgos_criticos} actividad(es) con riesgo crítico en la próxima reunión de equipo.`
      : "Sin riesgos críticos por ahora — buen momento para revisar la ruta crítica y adelantar trabajo."

  return s
}

export function generarTextoReporteGeneral(analisis: AnalisisProyecto): string {
  const r = analisis.resumen
  const lineas: string[] = []
  lineas.push(`REPORTE GENERAL — PettGo (${new Date().toLocaleDateString("es-CL")})`)
  lineas.push("")
  lineas.push(`Estado general: ${r.estado_general} · Avance ${r.avance_general}% (esperado ${r.avance_esperado_general}%)`)
  lineas.push(
    `Actividades: ${r.total_actividades} totales · ${r.completadas} completadas · ${r.en_desarrollo} en desarrollo · ${r.pendientes} pendientes · ${r.atrasadas} atrasadas · ${r.bloqueadas} bloqueadas`
  )
  lineas.push(`Riesgos: ${r.riesgos_criticos} críticos · ${r.riesgos_altos} altos`)
  lineas.push(`Hitos: ${r.hitos_en_riesgo} de ${r.hitos_total} en riesgo`)
  lineas.push("")
  lineas.push(`Ruta crítica: ${analisis.ruta_critica.ruta.join(" → ") || "sin datos suficientes"} (${analisis.ruta_critica.duracion_dias} días)`)
  if (analisis.ciclos.length) {
    lineas.push(`Dependencias circulares detectadas: ${analisis.ciclos.map((c) => c.join(" → ")).join(" | ")}`)
  }
  lineas.push("")
  lineas.push("Actividades críticas:")
  for (const c of analisis.actividades_criticas.slice(0, 8)) {
    lineas.push(`- ${c.codigo} (${c.area}): ${c.motivos.join(", ")} · afecta a ${c.afectadas} actividad(es)`)
  }
  lineas.push("")
  lineas.push("Alertas principales:")
  for (const a of analisis.alertas.slice(0, 8)) {
    lineas.push(`- [${a.nivel}] ${a.tipo} — ${a.actividad}: ${a.problema}`)
  }
  return lineas.join("\n")
}

export function generarResumenReunion(analisis: AnalisisProyecto): string {
  const r = analisis.resumen
  const lineas: string[] = []
  lineas.push(`RESUMEN PARA REUNIÓN — ${new Date().toLocaleDateString("es-CL")}`)
  lineas.push(`Estado: ${r.estado_general}. Avance ${r.avance_general}% vs. ${r.avance_esperado_general}% esperado.`)
  if (r.bloqueadas > 0) lineas.push(`⚠ ${r.bloqueadas} actividad(es) bloqueada(s) — revisar antes de seguir.`)
  if (r.atrasadas > 0) lineas.push(`${r.atrasadas} actividad(es) atrasada(s).`)
  if (r.hitos_en_riesgo > 0) lineas.push(`${r.hitos_en_riesgo} hito(s) en riesgo de no cumplirse a tiempo.`)
  const top = analisis.actividades_criticas.slice(0, 3)
  if (top.length) lineas.push(`Prioridad de la semana: ${top.map((t) => `${t.codigo} (${t.motivos.join(", ")})`).join("; ")}.`)
  return lineas.join("\n")
}
