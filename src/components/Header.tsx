import { NavLink } from "react-router-dom"

const navLinks = [
  { to: "/", label: "Inicio", end: true },
  { to: "/tienda", label: "Tienda" },
  { to: "/especialistas", label: "Especialistas" },
  { to: "/veterinarias", label: "Veterinarias" },
  { to: "/mapa", label: "Mapa" },
  { to: "/comunidad", label: "Comunidad" },
]

function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-emerald-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <NavLink to="/" className="flex items-center gap-2 text-xl font-bold text-emerald-700">
          <span aria-hidden="true">🐾</span>
          PettGo
        </NavLink>
        <nav className="flex flex-wrap justify-end gap-x-5 gap-y-1 text-sm font-medium text-slate-600">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `transition hover:text-emerald-700 ${
                  isActive ? "font-semibold text-emerald-700" : ""
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}

export default Header
