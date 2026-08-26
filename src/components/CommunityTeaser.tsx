import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import PawPrint from "./PawPrint"

function CommunityTeaser() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-500 to-brand-700 px-6 py-20 text-center">
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute left-[10%] top-8 h-16 w-16 text-white/15"
        animate={{ y: [0, -12, 0], rotate: [0, 10, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <PawPrint className="h-full w-full" />
      </motion.div>
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-8 right-[12%] h-20 w-20 text-white/10"
        animate={{ y: [0, 14, 0], rotate: [0, -8, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
      >
        <PawPrint className="h-full w-full" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="relative mx-auto max-w-2xl"
      >
        <span className="text-4xl" aria-hidden="true">
          🐶🐱
        </span>
        <h2 className="mt-4 font-heading text-3xl font-bold text-white">
          Una comunidad para dueños de mascotas
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-brand-50/90">
          Conecta con otros dueños de perros y gatos en Curicó, comparte
          experiencias y haz nuevos amigos peludos.
        </p>
        <Link
          to="/comunidad"
          className="mt-7 inline-block rounded-full bg-white px-7 py-3.5 text-sm font-bold text-brand-700 shadow-lg shadow-ink-950/20 transition hover:-translate-y-0.5 hover:shadow-xl"
        >
          Visitar la comunidad
        </Link>
      </motion.div>
    </section>
  )
}

export default CommunityTeaser
