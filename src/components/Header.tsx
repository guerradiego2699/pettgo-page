import { useState } from "react"
import { NavLink } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import { useAuth } from "../context/AuthContext"
import logo from "../assets/pettgo-logo.webp"

const navLinks = [
  { to: "/", label: "Inicio", end: true },
  { to: "/tienda", label: "Tienda" },
  { to: "/especialistas", label: "Especialistas" },
  { to: "/veterinarias", label: "Veterinarias" },
  { to: "/mapa", label: "Mapa" },
  { to: "/comunidad", label: "Comunidad" },
]

function Header() {
  const { profile, loading, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-20 border-b border-brand-200/60 bg-cream-50/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <NavLink to="/" className="flex items-center gap-2.5" onClick={() => setMenuOpen(false)}>
          <img src={logo} alt="PettGo" className="h-11 w-11 drop-shadow-sm" />
          <span className="font-heading text-2xl font-bold text-ink-900">PettGo</span>
        </NavLink>

        <nav className="hidden flex-wrap items-center justify-end gap-x-1 gap-y-1 text-sm font-semibold text-ink-500 md:flex">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `group relative px-3 py-2 transition-colors hover:text-brand-600 ${
                  isActive ? "text-brand-600" : ""
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {link.label}
                  <span
                    className={`absolute inset-x-3 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full bg-brand-500 transition-transform duration-300 group-hover:scale-x-100 ${
                      isActive ? "scale-x-100" : ""
                    }`}
                  />
                </>
              )}
            </NavLink>
          ))}

          {!loading && (
            profile ? (
              <span className="ml-3 flex items-center gap-3 border-l border-brand-200 pl-4">
                <NavLink to="/mascotas" className="hover:text-brand-600">
                  Mascotas
                </NavLink>
                {profile.role === "admin" && (
                  <NavLink to="/admin" className="hover:text-brand-600">
                    Admin
                  </NavLink>
                )}
                <NavLink to="/cuenta" className="hover:text-brand-600">
                  {profile.name}
                </NavLink>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="text-ink-300 transition hover:text-brand-600"
                >
                  Cerrar sesión
                </button>
              </span>
            ) : (
              <span className="ml-3 flex items-center gap-3 border-l border-brand-200 pl-4">
                <NavLink to="/login" className="hover:text-brand-600">
                  Iniciar sesión
                </NavLink>
                <NavLink
                  to="/registro"
                  className="rounded-full bg-gradient-to-br from-brand-400 to-brand-600 px-4 py-2 text-white shadow-sm shadow-brand-500/30 transition hover:shadow-md hover:shadow-brand-500/40"
                >
                  Crear cuenta
                </NavLink>
              </span>
            )
          )}
        </nav>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink-700 transition hover:bg-brand-100 md:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
            )}
          </svg>
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden border-t border-brand-100 bg-cream-50 md:hidden"
          >
            <div className="flex flex-col gap-1 px-6 py-4 text-base font-semibold text-ink-600">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-2.5 transition-colors ${
                      isActive ? "bg-brand-100 text-brand-700" : "hover:bg-brand-50"
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}

              <div className="mt-2 flex flex-col gap-2 border-t border-brand-100 pt-3">
                {!loading && (
                  profile ? (
                    <>
                      <NavLink
                        to="/mascotas"
                        onClick={() => setMenuOpen(false)}
                        className="rounded-lg px-3 py-2.5 hover:bg-brand-50"
                      >
                        Mascotas
                      </NavLink>
                      {profile.role === "admin" && (
                        <NavLink
                          to="/admin"
                          onClick={() => setMenuOpen(false)}
                          className="rounded-lg px-3 py-2.5 hover:bg-brand-50"
                        >
                          Admin
                        </NavLink>
                      )}
                      <NavLink
                        to="/cuenta"
                        onClick={() => setMenuOpen(false)}
                        className="rounded-lg px-3 py-2.5 hover:bg-brand-50"
                      >
                        {profile.name}
                      </NavLink>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false)
                          signOut()
                        }}
                        className="rounded-lg px-3 py-2.5 text-left text-ink-400 hover:bg-brand-50"
                      >
                        Cerrar sesión
                      </button>
                    </>
                  ) : (
                    <>
                      <NavLink
                        to="/login"
                        onClick={() => setMenuOpen(false)}
                        className="rounded-lg px-3 py-2.5 hover:bg-brand-50"
                      >
                        Iniciar sesión
                      </NavLink>
                      <NavLink
                        to="/registro"
                        onClick={() => setMenuOpen(false)}
                        className="rounded-full bg-gradient-to-br from-brand-400 to-brand-600 px-4 py-2.5 text-center text-white shadow-sm shadow-brand-500/30"
                      >
                        Crear cuenta
                      </NavLink>
                    </>
                  )
                )}
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}

export default Header
