import { Routes, Route } from "react-router-dom"
import Layout from "./components/Layout"
import ProtectedRoute from "./components/ProtectedRoute"
import Home from "./pages/Home"
import Tienda from "./pages/Tienda"
import Especialistas from "./pages/Especialistas"
import EspecialistaDetalle from "./pages/EspecialistaDetalle"
import Veterinarias from "./pages/Veterinarias"
import VeterinariaDetalle from "./pages/VeterinariaDetalle"
import Mapa from "./pages/Mapa"
import Comunidad from "./pages/Comunidad"
import ForoTema from "./pages/ForoTema"
import Login from "./pages/Login"
import Registro from "./pages/Registro"
import RecuperarPassword from "./pages/RecuperarPassword"
import RestablecerPassword from "./pages/RestablecerPassword"
import Cuenta from "./pages/Cuenta"
import Mascotas from "./pages/Mascotas"
import AdminHome from "./pages/admin/AdminHome"
import AdminVeterinarias from "./pages/admin/AdminVeterinarias"
import AdminEspecialistas from "./pages/admin/AdminEspecialistas"
import AdminProductos from "./pages/admin/AdminProductos"
import AdminUsuarios from "./pages/admin/AdminUsuarios"
import AdminReportes from "./pages/admin/AdminReportes"
import Privacidad from "./pages/Privacidad"
import Terminos from "./pages/Terminos"
import NotFound from "./pages/NotFound"

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="tienda" element={<Tienda />} />
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
        </Route>
        <Route element={<ProtectedRoute roles={["admin"]} />}>
          <Route path="admin" element={<AdminHome />} />
          <Route path="admin/veterinarias" element={<AdminVeterinarias />} />
          <Route path="admin/especialistas" element={<AdminEspecialistas />} />
          <Route path="admin/productos" element={<AdminProductos />} />
          <Route path="admin/usuarios" element={<AdminUsuarios />} />
          <Route path="admin/reportes" element={<AdminReportes />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

export default App
