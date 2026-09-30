export const nf = new Intl.NumberFormat("es-CL")
export const pctS = (n: number) => (n >= 0 ? "+" : "") + (n * 100).toFixed(0) + "%"
export const pct1 = (n: number) => (n * 100).toFixed(1).replace(".", ",") + "%"

export function formatoClpCorto(valor: number): string {
  const abs = Math.abs(valor)
  if (abs >= 1e6) return (valor / 1e6).toFixed(1).replace(".", ",") + " M"
  if (abs >= 1e3) {
    const k = valor / 1e3
    return (Number.isInteger(k) ? String(k) : k.toFixed(1).replace(".", ",")) + " k"
  }
  return String(Math.round(valor))
}
