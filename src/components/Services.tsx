import { motion } from "framer-motion"
import { services } from "../data/services"
import ServiceCard from "./ServiceCard"

function Services() {
  return (
    <section id="servicios" className="bg-cream-50 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center font-heading text-3xl font-bold text-ink-900"
        >
          Qué puedes hacer en PettGo
        </motion.h2>
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, index) => (
            <ServiceCard key={service.id} service={service} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}

export default Services
