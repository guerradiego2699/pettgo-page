import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuth, type UserRole } from "../context/AuthContext"

interface ProtectedRouteProps {
  roles?: UserRole[]
}

function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const { session, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <p className="px-6 py-16 text-center text-ink-500">Cargando…</p>
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (roles && (!profile || !roles.includes(profile.role))) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
