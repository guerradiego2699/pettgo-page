import { useEffect } from "react"
import { useAuth } from "../context/AuthContext"

declare global {
  interface Window {
    PETTGO_USER_EMAIL?: string
  }
}

// Dirección del servidor del asistente de agendamiento. Si no está definida (o no es https), el botón
// "Agendar Cita Veterinaria" simplemente no se carga.
const SERVIDOR = (import.meta.env.VITE_AGENDAMIENTO_URL as string | undefined)?.trim().replace(/\/+$/, "")

function direccionValida(url: string | undefined): url is string {
  if (!url) return false
  try {
    const u = new URL(url)
    return u.protocol === "https:" || (u.protocol === "http:" && u.hostname === "localhost")
  } catch {
    return false
  }
}

// Carga el botón de agendamiento. El script se sirve desde este mismo sitio (public/pettgo-agendar.js), así que
// lo que cambie en el servidor del asistente no puede alterar el código de la página; el servidor solo controla
// el contenido de la ventana del chat. Además publica el correo de la persona con sesión para que el chat se lo ofrezca.
function AgendarWidget() {
  const { user } = useAuth()

  useEffect(() => {
    window.PETTGO_USER_EMAIL = user?.email ?? ""
  }, [user])

  useEffect(() => {
    if (!direccionValida(SERVIDOR) || document.getElementById("pettgo-agendar-script")) return
    const script = document.createElement("script")
    script.id = "pettgo-agendar-script"
    script.src = "/pettgo-agendar.js"
    script.defer = true
    script.setAttribute("data-server", SERVIDOR)
    document.body.appendChild(script)
  }, [])

  return null
}

export default AgendarWidget
