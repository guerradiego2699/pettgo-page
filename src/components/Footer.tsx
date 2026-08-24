const socialLinks = [
  { label: "Instagram", href: "#" },
  { label: "Facebook", href: "#" },
  { label: "WhatsApp", href: "#" },
]

function Footer() {
  return (
    <footer className="border-t border-emerald-100 bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-10 text-center text-sm text-slate-500 sm:flex sm:items-center sm:justify-between sm:text-left">
        <div>
          <p className="flex items-center justify-center gap-2 text-base font-bold text-emerald-700 sm:justify-start">
            <span aria-hidden="true">🐾</span>
            PettGo
          </p>
          <p className="mt-1">Curicó, Chile</p>
          <p className="mt-1">contacto@pettgo.cl · +56 9 0000 0000</p>
        </div>
        <div className="mt-6 flex justify-center gap-4 sm:mt-0">
          {socialLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="transition hover:text-emerald-700"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
      <p className="border-t border-emerald-100 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} PettGo. Todos los derechos reservados.
      </p>
    </footer>
  )
}

export default Footer
