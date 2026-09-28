export async function registrarVista(productoId: string) {
  try {
    await fetch("/api/evento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ producto_id: productoId }),
    })
  } catch {
    // Best-effort: si falla la métrica, no debe afectar la navegación.
  }
}
