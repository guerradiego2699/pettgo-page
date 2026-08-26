import { Link } from "react-router-dom"
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion"
import type { MouseEvent } from "react"
import logo from "../assets/pettgo-logo.webp"
import PawPrint from "./PawPrint"

function Hero() {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [12, -12]), {
    stiffness: 150,
    damping: 15,
  })
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-12, 12]), {
    stiffness: 150,
    damping: 15,
  })

  function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect()
    mouseX.set((event.clientX - bounds.left) / bounds.width - 0.5)
    mouseY.set((event.clientY - bounds.top) / bounds.height - 0.5)
  }

  function handleMouseLeave() {
    mouseX.set(0)
    mouseY.set(0)
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-cream-100 via-cream-100 to-cream-50 px-6 pb-24 pt-16 sm:pt-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-brand-300/40 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 top-40 h-80 w-80 rounded-full bg-brand-200/50 blur-3xl"
      />

      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute left-[8%] top-24 h-10 w-10 text-brand-300/70"
        animate={{ y: [0, -14, 0], rotate: [0, 8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <PawPrint className="h-full w-full" />
      </motion.div>
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute right-[12%] top-10 h-14 w-14 text-brand-400/50"
        animate={{ y: [0, 16, 0], rotate: [0, -10, 0] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      >
        <PawPrint className="h-full w-full" />
      </motion.div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center lg:text-left"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 text-sm font-semibold text-brand-700">
            <PawPrint className="h-4 w-4" />
            Curicó, Chile
          </span>
          <h1 className="mt-5 font-heading text-4xl font-bold leading-tight text-ink-900 sm:text-5xl lg:text-6xl">
            Todo para tu mascota,{" "}
            <br className="hidden sm:block" />
            en{" "}
            <span className="bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent">
              un solo lugar
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-ink-500 lg:mx-0">
            PettGo centraliza productos y servicios para el cuidado de perros y
            gatos en Curicó: tienda, especialistas, veterinarias, mapa y
            comunidad, todo en una sola plataforma.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
            <a
              href="#servicios"
              className="rounded-full bg-gradient-to-br from-brand-400 to-brand-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-500/30 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/40"
            >
              Explorar servicios
            </a>
            <Link
              to="/comunidad"
              className="rounded-full border-2 border-ink-900/10 bg-white/60 px-7 py-3.5 text-sm font-bold text-ink-700 backdrop-blur transition hover:-translate-y-0.5 hover:border-brand-300 hover:text-brand-700"
            >
              Conocer la comunidad
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
          className="perspective-1000 relative mx-auto flex h-64 w-64 items-center justify-center sm:h-80 sm:w-80"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <div
            aria-hidden="true"
            className="absolute inset-6 rounded-full bg-brand-400/30 blur-2xl"
          />
          <motion.img
            src={logo}
            alt="PettGo"
            className="relative h-full w-full drop-shadow-2xl"
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </div>
    </section>
  )
}

export default Hero
