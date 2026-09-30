import type { VercelRequest } from "@vercel/node"
import { supabaseAdmin } from "./supabaseAdmin.js"

// Nota: a propósito NO es una unión discriminada ({ok:true} | {ok:false,...}).
// El chequeo de tipos aislado que Vercel corre por cada función serverless
// angostaba mal ese patrón (auth.ok era false en tiempo de ejecución pero el
// tipo se resolvía como {ok:true}), así que status/error siempre están
// presentes en la forma — más verboso, pero no depende de narrowing.
interface AdminCheck {
  ok: boolean
  status: number
  error: string
}

// Verifica la sesión de Supabase Auth del admin en el servidor (nunca confía
// en el frontend): el JWT debe ser válido y la cuenta debe tener role='admin'
// en profiles — el mismo criterio que usa el resto del sitio (is_admin(),
// ProtectedRoute), no un correo fijo, para que cualquier cuenta admin sirva.
export async function requireAdmin(req: VercelRequest): Promise<AdminCheck> {
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null

  if (!token) {
    return { ok: false, status: 401, error: "Falta el token de sesión." }
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data.user) {
    return { ok: false, status: 401, error: "Sesión inválida o expirada." }
  }

  const { data: perfil, error: errorPerfil } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single()

  if (errorPerfil || perfil?.role !== "admin") {
    return { ok: false, status: 403, error: "No tienes permisos de administrador." }
  }

  return { ok: true, status: 200, error: "" }
}
