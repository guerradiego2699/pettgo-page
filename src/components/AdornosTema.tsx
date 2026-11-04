import { motion, useReducedMotion } from "framer-motion"
import { useLocation } from "react-router-dom"
import { TEMA_ACTIVO } from "../lib/temas"

// Adornos decorativos del tema activo.
//
// Capa fija sobre la página, sin eventos de puntero, para que nunca tapen un
// clic. Todo es SVG en línea: no agrega peso de imágenes ni peticiones.
//
// Estilo: ilustración plana y redondeada, con mejillas rosadas. El gato y el
// perro son los mismos en los dos temas y solo les cambia el gorro.

const NEGRO = "#1b0f2e"
const AMARILLO = "#f5c518"
const MEJILLA = "#f08a8a"
const CREMA = "#fffdf9"

const NARANJA = "#e2761a"
const NARANJA_OSCURO = "#c25c0e"

const ROJO = "#c4433c"
const ROJO_OSCURO = "#a82f29"
const VERDE = "#2f5a3e"
const VERDE_CLARO = "#3d7a52"
const DORADO = "#e0a93f"
const MARRON = "#8a5a33"

type Gorro = "bruja" | "santa"

// ── Gorros ───────────────────────────────────────────────────────

function SombreroBruja({ x, y, escala = 1 }: { x: number; y: number; escala?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${escala})`}>
      <path d="M0 0 C-3 -14 4 -26 12 -30 C16 -20 18 -8 18 0 Z" fill={NEGRO} />
      <ellipse cx="9" cy="1" rx="22" ry="5.5" fill={NEGRO} />
      <rect x="-1" y="-6" width="20" height="5" rx="2" fill={NARANJA} />
    </g>
  )
}

function GorroSanta({ x, y, escala = 1 }: { x: number; y: number; escala?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${escala})`}>
      <path d="M-2 -2 C0 -18 8 -28 20 -30 C24 -22 22 -10 18 -2 Z" fill={ROJO} />
      <path d="M20 -30 C26 -29 28 -25 26 -22 C23 -24 21 -27 20 -30 Z" fill={ROJO_OSCURO} />
      <rect x="-5" y="-4" width="28" height="7" rx="3.5" fill={CREMA} />
      <circle cx="27" cy="-23" r="5" fill={CREMA} />
    </g>
  )
}

function Gorro({ tipo, x, y, escala }: { tipo: Gorro; x: number; y: number; escala?: number }) {
  return tipo === "bruja" ? (
    <SombreroBruja x={x} y={y} escala={escala} />
  ) : (
    <GorroSanta x={x} y={y} escala={escala} />
  )
}

// ── Figuras compartidas entre temas ──────────────────────────────

function Gato({ className, gorro }: { className: string; gorro?: Gorro }) {
  return (
    <svg viewBox="0 0 72 64" className={className} fill="none">
      <path d="M58 50c6-2 9-8 8-15-3 4-6 6-10 6Z" fill={NEGRO} />
      <ellipse cx="34" cy="46" rx="22" ry="15" fill={NEGRO} />
      <circle cx="30" cy="26" r="16" fill={NEGRO} />
      <path d="M17 17l2-11 10 6Z" fill={NEGRO} />
      <path d="M43 17l-2-11-10 6Z" fill={NEGRO} />
      <ellipse cx="23" cy="26" rx="4.5" ry="5" fill={AMARILLO} />
      <ellipse cx="37" cy="26" rx="4.5" ry="5" fill={AMARILLO} />
      <ellipse cx="23" cy="26" rx="1.5" ry="4" fill={NEGRO} />
      <ellipse cx="37" cy="26" rx="1.5" ry="4" fill={NEGRO} />
      <path d="M28 33h4l-2 2.5Z" fill={MEJILLA} />
      <g stroke={NEGRO} strokeWidth="1.2" strokeLinecap="round" opacity="0.5">
        <path d="M14 30h-7M14 34l-6 2M46 30h7M46 34l6 2" />
      </g>
      {gorro && <Gorro tipo={gorro} x={16} y={14} escala={0.8} />}
    </svg>
  )
}

function Perro({ className, gorro }: { className: string; gorro?: Gorro }) {
  return (
    <svg viewBox="0 0 86 64" className={className} fill="none">
      <ellipse cx="44" cy="42" rx="27" ry="13" fill="#c99163" />
      <rect x="24" y="48" width="7" height="12" rx="3.5" fill="#c99163" />
      <rect x="57" y="48" width="7" height="12" rx="3.5" fill="#c99163" />
      <path d="M69 38c6-3 11-2 15 2-4 1-7 4-9 8Z" fill="#c99163" />
      <circle cx="24" cy="32" r="15" fill="#c99163" />
      <path d="M11 28c-5 2-7 9-5 16 4-1 7-5 8-10Z" fill="#8a5a33" />
      <ellipse cx="18" cy="32" rx="2.4" ry="3" fill={NEGRO} />
      <ellipse cx="30" cy="32" rx="2.4" ry="3" fill={NEGRO} />
      <ellipse cx="13" cy="38" rx="3.6" ry="2.4" fill={MEJILLA} opacity="0.7" />
      <ellipse cx="34" cy="38" rx="3.6" ry="2.4" fill={MEJILLA} opacity="0.7" />
      <ellipse cx="24" cy="40" rx="3.4" ry="2.6" fill={NEGRO} />
      <path d="M24 43c0 2.5 2 4 4.5 3.5" stroke={NEGRO} strokeWidth="1.4" strokeLinecap="round" />
      {gorro && <Gorro tipo={gorro} x={13} y={19} escala={0.95} />}
    </svg>
  )
}

// ── Halloween ────────────────────────────────────────────────────

function Calabaza({ className, conSombrero = false }: { className: string; conSombrero?: boolean }) {
  return (
    <svg viewBox="0 0 80 72" className={className} fill="none">
      <path d="M40 22c-1.5 0-2.5-5-1.2-9 .6-1.7 2.9-2.2 3.7-.6 1 2.2.4 5.6-2.5 9.6Z" fill="#4a7c3f" />
      <ellipse cx="40" cy="45" rx="31" ry="25" fill={NARANJA} />
      <ellipse cx="22" cy="45" rx="11" ry="25" fill={NARANJA_OSCURO} opacity="0.35" />
      <ellipse cx="58" cy="45" rx="11" ry="25" fill={NARANJA_OSCURO} opacity="0.35" />
      <ellipse cx="18" cy="51" rx="5" ry="3.5" fill={MEJILLA} opacity="0.75" />
      <ellipse cx="62" cy="51" rx="5" ry="3.5" fill={MEJILLA} opacity="0.75" />
      <path d="M26 38l9-6v11l-9-5Z" fill={NEGRO} />
      <path d="M54 38l-9-6v11l9-5Z" fill={NEGRO} />
      <path d="M27 50c3.5 6 8 9 13 9s9.5-3 13-9c-3 1-5.6 1.4-7.6.6-1.6-.6-2.6-2-5.4-2s-3.8 1.4-5.4 2c-2 .8-4.6.4-7.6-.6Z" fill={NEGRO} />
      {conSombrero && <SombreroBruja x={28} y={24} escala={1.15} />}
    </svg>
  )
}

function Fantasma({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 52 68" className={className} fill="none">
      <path
        d="M26 4C14.4 4 8 13 8 24v33c0 2.6 2.8 4 4.8 2.3l4-3.4c1.1-1 2.8-.9 3.8.2l2.6 2.8c1.1 1.2 3 1.2 4.1 0l2.3-2.5c1.1-1.2 3-1.2 4.1 0l2.3 2.5c1.1 1.2 3 1.2 4.1 0l1.1-1.2c1.9-2 5.3-.7 5.3 2V24C46.5 13 37.6 4 26 4Z"
        fill={CREMA}
        stroke={NEGRO}
        strokeOpacity="0.15"
        strokeWidth="1.5"
      />
      <ellipse cx="19" cy="26" rx="3.4" ry="4.4" fill={NEGRO} />
      <ellipse cx="33" cy="26" rx="3.4" ry="4.4" fill={NEGRO} />
      <ellipse cx="13" cy="34" rx="3.6" ry="2.4" fill={MEJILLA} opacity="0.65" />
      <ellipse cx="39" cy="34" rx="3.6" ry="2.4" fill={MEJILLA} opacity="0.65" />
      <ellipse cx="26" cy="36" rx="3.6" ry="4.6" fill={NEGRO} />
    </svg>
  )
}

function Estrella({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 1.5l3 7.2 7.5.6-5.7 4.9 1.8 7.3L12 17.6 5.4 21.5l1.8-7.3L1.5 9.3l7.5-.6Z" />
    </svg>
  )
}

function Telaraña({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M0 0 L100 100 M0 0 L100 40 M0 0 L40 100 M0 0 L100 0 M0 0 L0 100" />
      <path d="M22 0 Q14 14 0 22" />
      <path d="M44 0 Q28 28 0 44" />
      <path d="M66 0 Q42 42 0 66" />
      <path d="M88 0 Q56 56 0 88" />
    </svg>
  )
}

// ── Navidad ──────────────────────────────────────────────────────

function MunecoNieve({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 56 72" className={className} fill="none">
      <ellipse cx="28" cy="54" rx="19" ry="16" fill={CREMA} stroke={NEGRO} strokeOpacity="0.14" strokeWidth="1.5" />
      <circle cx="28" cy="26" r="14" fill={CREMA} stroke={NEGRO} strokeOpacity="0.14" strokeWidth="1.5" />
      <path d="M11 32c-5 1-8 4-9 8M45 32c5 1 8 4 9 8" stroke={MARRON} strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="23" cy="24" rx="2.2" ry="2.6" fill={NEGRO} />
      <ellipse cx="33" cy="24" rx="2.2" ry="2.6" fill={NEGRO} />
      <path d="M28 27l9 3-9 3Z" fill={NARANJA} />
      <ellipse cx="17" cy="30" rx="3.4" ry="2.2" fill={MEJILLA} opacity="0.7" />
      <ellipse cx="39" cy="30" rx="3.4" ry="2.2" fill={MEJILLA} opacity="0.7" />
      <path d="M15 38c8 4 18 4 26 0l-1 6c-7 3-17 3-24 0Z" fill={ROJO} />
      <path d="M38 44c3 2 4 6 3 10l-5-1c1-3 1-6 2-9Z" fill={ROJO_OSCURO} />
      <circle cx="28" cy="50" r="2.2" fill={NEGRO} opacity="0.6" />
      <circle cx="28" cy="58" r="2.2" fill={NEGRO} opacity="0.6" />
    </svg>
  )
}

function Arbol({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 68 80" className={className} fill="none">
      <rect x="29" y="62" width="10" height="13" rx="2" fill={MARRON} />
      <path d="M34 6 14 32h40Z" fill={VERDE_CLARO} />
      <path d="M34 22 9 50h50Z" fill={VERDE} />
      <path d="M34 40 4 68h60Z" fill={VERDE_CLARO} />
      <path d="M34 0l2.6 6.2L43 6.8l-4.9 4.2 1.5 6.3L34 14l-5.6 3.3 1.5-6.3L25 6.8l6.4-.6Z" fill={DORADO} />
      <circle cx="24" cy="44" r="3" fill={ROJO} />
      <circle cx="45" cy="46" r="3" fill={DORADO} />
      <circle cx="34" cy="56" r="3" fill={ROJO} />
      <circle cx="18" cy="62" r="3" fill={DORADO} />
      <circle cx="50" cy="62" r="3" fill={ROJO} />
      <circle cx="29" cy="28" r="2.6" fill={ROJO} />
    </svg>
  )
}

function Copo({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7" />
      <path d="M12 6l-2.6-2.4M12 6l2.6-2.4M12 18l-2.6 2.4M12 18l2.6 2.4" />
      <path d="M6.9 9.4L3.4 9M6.9 14.6l-3.5.4M17.1 9.4l3.5-.4M17.1 14.6l3.5.4" />
    </svg>
  )
}

function RamaPino({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none">
      <g stroke={VERDE} strokeWidth="3" strokeLinecap="round">
        <path d="M0 0 L62 62M0 0 L84 34M0 0 L34 84" />
      </g>
      <g stroke={VERDE_CLARO} strokeWidth="2.2" strokeLinecap="round">
        <path d="M18 18l8-2M18 18l-2 8M32 32l10-3M32 32l-3 10M46 46l11-4M46 46l-4 11" />
        <path d="M28 11l6-4M28 11l-1 7M48 19l7-3M48 19l-2 7M68 27l7-2M68 27l-2 7" />
        <path d="M11 28l-4 6M11 28l7-1M19 48l-3 7M19 48l7-2M27 68l-2 7M27 68l7-2" />
      </g>
      <circle cx="30" cy="24" r="3.4" fill={ROJO} />
      <circle cx="22" cy="36" r="3" fill={ROJO} />
      <circle cx="47" cy="38" r="3" fill={ROJO} />
      <circle cx="38" cy="52" r="3.4" fill={ROJO} />
    </svg>
  )
}

// ── Composición ──────────────────────────────────────────────────

function useFlotar() {
  // Si la persona pidió menos movimiento en su sistema, los adornos no se mueven.
  const quieto = useReducedMotion()
  return (y: number, duracion: number, retraso = 0) =>
    quieto
      ? {}
      : {
          animate: { y: [0, y, 0] },
          transition: { duration: duracion, repeat: Infinity, ease: "easeInOut" as const, delay: retraso },
        }
}

// Las figuras viven en los márgenes laterales, que están vacíos en pantallas
// anchas. En móvil no hay márgenes, así que se ocultan para no quedar encima del
// texto: ahí solo quedan las esquinas.
const LATERAL_IZQ = "absolute left-3 top-[32%] hidden lg:block"
const LATERAL_DER = "absolute right-4 top-[22%] hidden lg:block"
const INICIO_IZQ = "absolute left-4 top-[66%] hidden xl:block"
const INICIO_DER = "absolute right-6 top-[62%] hidden lg:block"

function AdornosHalloween({ esInicio }: { esInicio: boolean }) {
  const flotar = useFlotar()

  return (
    <>
      <Telaraña className="absolute -left-2 -top-2 h-24 w-24 text-ink-900/20 sm:h-32 sm:w-32" />
      <Telaraña className="absolute -right-2 -top-2 h-24 w-24 -scale-x-100 text-ink-900/20 sm:h-32 sm:w-32" />

      {/* Gato y fantasma acompañan toda la navegación. */}
      <motion.div className={LATERAL_IZQ} {...flotar(-14, 6)}>
        <Gato className="h-20 w-24" />
      </motion.div>
      <motion.div className={LATERAL_DER} {...flotar(16, 7.5, 0.4)}>
        <Fantasma className="h-24 w-[4.5rem]" />
      </motion.div>

      {/* Perro, calabaza y estrellas son exclusivos de la portada. */}
      {esInicio && (
        <>
          <motion.div className={INICIO_IZQ} {...flotar(-10, 8, 0.8)}>
            <Perro className="h-20 w-28" gorro="bruja" />
          </motion.div>
          <motion.div className={INICIO_DER} {...flotar(-12, 6.8, 0.2)}>
            <Calabaza className="h-20 w-24" conSombrero />
          </motion.div>

          <Estrella className="absolute left-[18%] top-[14%] hidden h-4 w-4 text-ink-900/40 lg:block" />
          <Estrella className="absolute right-[22%] top-[10%] hidden h-3 w-3 text-brand-500/60 lg:block" />
          <Estrella className="absolute left-[30%] top-[78%] hidden h-3 w-3 text-ink-900/30 xl:block" />
          <Estrella className="absolute right-[32%] top-[84%] hidden h-4 w-4 text-brand-500/50 xl:block" />
          <Estrella className="absolute left-[8%] top-[52%] hidden h-3 w-3 text-brand-500/50 lg:block" />
        </>
      )}
    </>
  )
}

function AdornosNavidad({ esInicio }: { esInicio: boolean }) {
  const flotar = useFlotar()

  return (
    <>
      <RamaPino className="absolute -left-3 -top-3 h-28 w-28 opacity-80 sm:h-36 sm:w-36" />
      <RamaPino className="absolute -right-3 -top-3 h-28 w-28 -scale-x-100 opacity-80 sm:h-36 sm:w-36" />

      {/* Gato y muñeco de nieve acompañan toda la navegación. */}
      <motion.div className={LATERAL_IZQ} {...flotar(-14, 6)}>
        <Gato className="h-20 w-24" gorro="santa" />
      </motion.div>
      <motion.div className={LATERAL_DER} {...flotar(16, 7.5, 0.4)}>
        <MunecoNieve className="h-24 w-[4.5rem]" />
      </motion.div>

      {/* Perro, árbol y copos son exclusivos de la portada. */}
      {esInicio && (
        <>
          <motion.div className={INICIO_IZQ} {...flotar(-10, 8, 0.8)}>
            <Perro className="h-20 w-28" gorro="santa" />
          </motion.div>
          <motion.div className={INICIO_DER} {...flotar(-12, 6.8, 0.2)}>
            <Arbol className="h-24 w-20" />
          </motion.div>

          <Copo className="absolute left-[18%] top-[14%] hidden h-5 w-5 text-ink-300/60 lg:block" />
          <Copo className="absolute right-[22%] top-[10%] hidden h-4 w-4 text-brand-400/60 lg:block" />
          <Copo className="absolute left-[30%] top-[78%] hidden h-4 w-4 text-ink-300/50 xl:block" />
          <Copo className="absolute right-[32%] top-[84%] hidden h-5 w-5 text-brand-400/50 xl:block" />
          <Copo className="absolute left-[8%] top-[52%] hidden h-4 w-4 text-ink-300/50 lg:block" />
        </>
      )}
    </>
  )
}

function AdornosTema() {
  const { pathname } = useLocation()

  // El panel de administración es una herramienta de trabajo: no se decora.
  if (pathname.startsWith("/admin")) return null
  if (TEMA_ACTIVO !== "halloween" && TEMA_ACTIVO !== "navidad") return null

  const esInicio = pathname === "/"

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-20 overflow-hidden">
      {TEMA_ACTIVO === "halloween" ? (
        <AdornosHalloween esInicio={esInicio} />
      ) : (
        <AdornosNavidad esInicio={esInicio} />
      )}
    </div>
  )
}

export default AdornosTema
