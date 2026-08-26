import { Link } from "react-router-dom"
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion"
import type { MouseEvent } from "react"
import type { Service } from "../data/services"

const MotionLink = motion.create(Link)

interface ServiceCardProps {
  service: Service
  index: number
}

function ServiceCard({ service, index }: ServiceCardProps) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [10, -10]), {
    stiffness: 250,
    damping: 20,
  })
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-10, 10]), {
    stiffness: 250,
    damping: 20,
  })

  function handleMouseMove(event: MouseEvent<HTMLAnchorElement>) {
    const bounds = event.currentTarget.getBoundingClientRect()
    x.set((event.clientX - bounds.left) / bounds.width - 0.5)
    y.set((event.clientY - bounds.top) / bounds.height - 0.5)
  }

  function handleMouseLeave() {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: "easeOut" }}
      className="perspective-1000"
    >
      <MotionLink
        to={service.path}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="block rounded-2xl border border-brand-100 bg-white p-6 text-left shadow-sm shadow-ink-900/5 transition-shadow hover:shadow-xl hover:shadow-brand-500/15"
      >
        <span
          style={{ transform: "translateZ(30px)" }}
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 text-2xl"
          aria-hidden="true"
        >
          {service.icon}
        </span>
        <h3
          style={{ transform: "translateZ(20px)" }}
          className="mt-4 font-heading text-lg font-bold text-ink-900"
        >
          {service.title}
        </h3>
        <p style={{ transform: "translateZ(15px)" }} className="mt-2 text-sm text-ink-500">
          {service.description}
        </p>
      </MotionLink>
    </motion.div>
  )
}

export default ServiceCard
