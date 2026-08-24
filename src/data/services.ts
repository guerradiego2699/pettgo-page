export interface Service {
  id: string
  title: string
  description: string
  icon: string
  path: string
}

export const services: Service[] = [
  {
    id: "tienda",
    title: "Tienda (Dropshipping)",
    description:
      "Productos de alimentación, higiene y accesorios que llegan directo a tu casa en Curicó.",
    icon: "🛒",
    path: "/tienda",
  },
  {
    id: "especialistas",
    title: "Especialistas",
    description:
      "Agenda hora con peluqueros, adiestradores y otros especialistas para el cuidado de tu mascota.",
    icon: "✂️",
    path: "/especialistas",
  },
  {
    id: "veterinarias",
    title: "Veterinarias",
    description:
      "Reserva tu hora en las veterinarias de la ciudad sin necesidad de llamar por teléfono.",
    icon: "🩺",
    path: "/veterinarias",
  },
  {
    id: "mapa",
    title: "Mapa de veterinarias",
    description:
      "Encuentra la veterinaria más cercana a ti y revisa su ubicación en el mapa de Curicó.",
    icon: "📍",
    path: "/mapa",
  },
  {
    id: "comunidad",
    title: "Comunidad",
    description:
      "Conecta con otros dueños de mascotas, comparte experiencias y resuelve tus dudas.",
    icon: "🐾",
    path: "/comunidad",
  },
]
