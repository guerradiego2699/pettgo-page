import { Routes, Route } from "react-router-dom"
import Layout from "./components/Layout"
import Home from "./pages/Home"
import Tienda from "./pages/Tienda"
import Especialistas from "./pages/Especialistas"
import Veterinarias from "./pages/Veterinarias"
import Mapa from "./pages/Mapa"
import Comunidad from "./pages/Comunidad"
import NotFound from "./pages/NotFound"

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="tienda" element={<Tienda />} />
        <Route path="especialistas" element={<Especialistas />} />
        <Route path="veterinarias" element={<Veterinarias />} />
        <Route path="mapa" element={<Mapa />} />
        <Route path="comunidad" element={<Comunidad />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

export default App
