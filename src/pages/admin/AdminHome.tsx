import { Link } from "react-router-dom"

function AdminHome() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-heading text-3xl font-bold text-ink-900">Panel de administrador</h1>
      <p className="mt-2 text-ink-500">Gestiona el contenido publicado en PettGo.</p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          to="/admin/veterinarias"
          className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
        >
          <span className="text-2xl" aria-hidden="true">
            🩺
          </span>
          <h2 className="mt-3 font-heading text-lg font-bold text-ink-900">Veterinarias</h2>
          <p className="mt-1 text-sm text-ink-500">Crear, editar y aprobar fichas de veterinarias.</p>
        </Link>
        <Link
          to="/admin/especialistas"
          className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
        >
          <span className="text-2xl" aria-hidden="true">
            ✂️
          </span>
          <h2 className="mt-3 font-heading text-lg font-bold text-ink-900">Especialistas</h2>
          <p className="mt-1 text-sm text-ink-500">Crear, editar y aprobar fichas de especialistas.</p>
        </Link>
        <Link
          to="/admin/productos"
          className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
        >
          <span className="text-2xl" aria-hidden="true">
            🛍️
          </span>
          <h2 className="mt-3 font-heading text-lg font-bold text-ink-900">Productos</h2>
          <p className="mt-1 text-sm text-ink-500">Crear, editar y eliminar productos de la tienda.</p>
        </Link>
        <Link
          to="/admin/usuarios"
          className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
        >
          <span className="text-2xl" aria-hidden="true">
            👤
          </span>
          <h2 className="mt-3 font-heading text-lg font-bold text-ink-900">Usuarios</h2>
          <p className="mt-1 text-sm text-ink-500">Asignar el rol de veterinaria o especialista a una cuenta.</p>
        </Link>
        <Link
          to="/admin/reportes"
          className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
        >
          <span className="text-2xl" aria-hidden="true">
            🚩
          </span>
          <h2 className="mt-3 font-heading text-lg font-bold text-ink-900">Moderación</h2>
          <p className="mt-1 text-sm text-ink-500">Revisar reportes de temas y respuestas del foro.</p>
        </Link>
      </div>
    </div>
  )
}

export default AdminHome
