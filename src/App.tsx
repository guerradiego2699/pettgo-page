import { lazy } from "react"
import { Routes, Route } from "react-router-dom"
import Layout from "./components/Layout"
import ProtectedRoute from "./components/ProtectedRoute"

const Home = lazy(() => import("./pages/Home"))
const Productos = lazy(() => import("./pages/Productos"))
const ProductoDetalle = lazy(() => import("./pages/ProductoDetalle"))
const Propuesta = lazy(() => import("./pages/Propuesta"))
const Especialistas = lazy(() => import("./pages/Especialistas"))
const EspecialistaDetalle = lazy(() => import("./pages/EspecialistaDetalle"))
const Veterinarias = lazy(() => import("./pages/Veterinarias"))
const VeterinariaDetalle = lazy(() => import("./pages/VeterinariaDetalle"))
const Mapa = lazy(() => import("./pages/Mapa"))
const Comunidad = lazy(() => import("./pages/Comunidad"))
const ForoTema = lazy(() => import("./pages/ForoTema"))
const PerfilPublico = lazy(() => import("./pages/PerfilPublico"))
const Login = lazy(() => import("./pages/Login"))
const Registro = lazy(() => import("./pages/Registro"))
const RecuperarPassword = lazy(() => import("./pages/RecuperarPassword"))
const RestablecerPassword = lazy(() => import("./pages/RestablecerPassword"))
const Cuenta = lazy(() => import("./pages/Cuenta"))
const Mascotas = lazy(() => import("./pages/Mascotas"))
const AdminHome = lazy(() => import("./pages/admin/AdminHome"))
const AdminVeterinarias = lazy(() => import("./pages/admin/AdminVeterinarias"))
const AdminEspecialistas = lazy(() => import("./pages/admin/AdminEspecialistas"))
const AdminProductos = lazy(() => import("./pages/admin/AdminProductos"))
const AdminTendencias = lazy(() => import("./pages/admin/AdminTendencias"))
const AdminUsuarios = lazy(() => import("./pages/admin/AdminUsuarios"))
const AdminReportes = lazy(() => import("./pages/admin/AdminReportes"))
const Privacidad = lazy(() => import("./pages/Privacidad"))
const Terminos = lazy(() => import("./pages/Terminos"))
const NotFound = lazy(() => import("./pages/NotFound"))

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="productos" element={<Productos />} />
        <Route path="productos/:id" element={<ProductoDetalle />} />
        <Route path="propuesta/:token" element={<Propuesta />} />
        <Route path="especialistas" element={<Especialistas />} />
        <Route path="especialistas/:id" element={<EspecialistaDetalle />} />
        <Route path="veterinarias" element={<Veterinarias />} />
        <Route path="veterinarias/:id" element={<VeterinariaDetalle />} />
        <Route path="mapa" element={<Mapa />} />
        <Route path="privacidad" element={<Privacidad />} />
        <Route path="terminos" element={<Terminos />} />
        <Route path="login" element={<Login />} />
        <Route path="registro" element={<Registro />} />
        <Route path="recuperar-password" element={<RecuperarPassword />} />
        <Route path="restablecer-password" element={<RestablecerPassword />} />
        <Route element={<ProtectedRoute />}>
          <Route path="cuenta" element={<Cuenta />} />
          <Route path="mascotas" element={<Mascotas />} />
          <Route path="comunidad" element={<Comunidad />} />
          <Route path="comunidad/:id" element={<ForoTema />} />
          <Route path="perfil/:id" element={<PerfilPublico />} />
        </Route>
        <Route element={<ProtectedRoute roles={["admin"]} />}>
          <Route path="admin" element={<AdminHome />} />
          <Route path="admin/veterinarias" element={<AdminVeterinarias />} />
          <Route path="admin/especialistas" element={<AdminEspecialistas />} />
          <Route path="admin/productos" element={<AdminProductos />} />
          <Route path="admin/tendencias" element={<AdminTendencias />} />
          <Route path="admin/usuarios" element={<AdminUsuarios />} />
          <Route path="admin/reportes" element={<AdminReportes />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

export default App
