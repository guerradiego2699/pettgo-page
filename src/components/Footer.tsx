import { Link } from "react-router-dom"
import logo from "../assets/pettgo-logo.webp"

const socialLinks = [
  { label: "Instagram", href: "#" },
  { label: "Facebook", href: "#" },
  { label: "WhatsApp", href: "#" },
]

function Footer() {
  return (
    <footer className="bg-ink-950 text-cream-200">
      <div className="mx-auto max-w-6xl px-6 py-12 text-center text-sm sm:flex sm:items-center sm:justify-between sm:text-left">
        <div>
          <p className="flex items-center justify-center gap-2.5 font-heading text-lg font-bold text-brand-300 sm:justify-start">
            <img src={logo} alt="" aria-hidden="true" className="h-8 w-8" />
            PettGo
          </p>
          <p className="mt-2 text-cream-300/80">Curicó, Chile</p>
          <p className="mt-1 text-cream-300/80">contacto@pettgo.cl · +56 9 0000 0000</p>
        </div>
        <div className="mt-6 flex justify-center gap-5 sm:mt-0">
          {socialLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-cream-300/80 transition hover:text-brand-300"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
      <div className="flex flex-col items-center gap-2 border-t border-white/10 py-4 text-center text-xs text-cream-300/50 sm:flex-row sm:justify-between sm:px-6">
        <p>© {new Date().getFullYear()} PettGo. Todos los derechos reservados.</p>
        <div className="flex gap-4">
          <Link to="/privacidad" className="hover:text-cream-200">
            Privacidad
          </Link>
          <Link to="/terminos" className="hover:text-cream-200">
            Términos de uso
          </Link>
        </div>
      </div>
    </footer>
  )
}

export default Footer
