import { useState } from "react"
import { edadTexto, REGISTRO_NACIONAL_CONSULTA_URL, REGISTRO_NACIONAL_URL } from "../../lib/carnet"
import type { Pet, PetWeight } from "../../types/pet"
import { BTN_SECUNDARIO } from "./ui"

function copiar(texto: string): Promise<boolean> {
  return navigator.clipboard?.writeText(texto).then(
    () => true,
    () => false
  ) ?? Promise.resolve(false)
}

function Microchip({ chip }: { chip: string | null | undefined }) {
  const [copiado, setCopiado] = useState(false)

  if (!chip) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-semibold text-ink-900">Sin registro</span>
        <a href={REGISTRO_NACIONAL_URL} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-brand-700 hover:underline">
          Inscribir en el Registro Nacional de Mascotas ↗
        </a>
      </div>
    )
  }

  async function alCopiar() {
    if (await copiar(chip as string)) {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1500)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-mono font-semibold tracking-wide text-ink-900">{chip}</span>
        <button type="button" onClick={alCopiar} className={`${BTN_SECUNDARIO} !px-3 !py-1 text-xs`}>
          {copiado ? "Copiado" : "Copiar"}
        </button>
        <a
          href={REGISTRO_NACIONAL_CONSULTA_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => void copiar(chip)}
          className="text-sm font-semibold text-brand-700 hover:underline"
        >
          Consultar en el Registro Nacional de Mascotas ↗
        </a>
      </div>
      <span className="text-xs text-ink-500">Al abrir el registro, el número queda copiado: pégalo en «Microchip/Identificador».</span>
    </div>
  )
}

function Dato({ etiqueta, children, ancho }: { etiqueta: string; children: React.ReactNode; ancho?: boolean }) {
  return (
    <div className={ancho ? "col-span-2 sm:col-span-3" : ""}>
      <dt className="text-xs text-ink-500">{etiqueta}</dt>
      <dd className="text-sm font-semibold text-ink-900">{children}</dd>
    </div>
  )
}

function CarnetPerfil({ pet, pesos, onEditar }: { pet: Pet; pesos: PetWeight[]; onEditar: () => void }) {
  const ultimoPeso = [...pesos].sort((a, b) => (a.measured_on < b.measured_on ? 1 : -1))[0]
  const sexo = pet.sex === "macho" ? "Macho" : pet.sex === "hembra" ? "Hembra" : "—"
  const esterilizado = pet.neutered === true ? "Sí" : pet.neutered === false ? "No" : "—"

  return (
    <section className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full bg-brand-100">
          {pet.photo_url ? (
            <img src={pet.photo_url} alt={pet.name} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-3xl" aria-hidden="true">
              {pet.species === "perro" ? "🐶" : "🐱"}
            </span>
          )}
        </div>
        <div className="min-w-[10rem] flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-2xl font-bold text-ink-900">Carnet de {pet.name}</h1>
            <span className="rounded-full bg-ink-50 px-2.5 py-0.5 text-xs font-semibold text-ink-500">{pet.species === "perro" ? "Perro" : "Gato"}</span>
          </div>
          {pet.highlight && <p className="mt-1 text-sm italic text-ink-500">"{pet.highlight}"</p>}
        </div>
        <button type="button" onClick={onEditar} className={BTN_SECUNDARIO}>
          Editar ficha
        </button>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
        <Dato etiqueta="Raza">{pet.breed || "—"}</Dato>
        <Dato etiqueta="Sexo">{sexo}</Dato>
        <Dato etiqueta="Edad">{edadTexto(pet.birth_date, pet.age_years)}</Dato>
        <Dato etiqueta="Peso actual">{ultimoPeso ? `${Number(ultimoPeso.kg).toFixed(1)} kg` : "—"}</Dato>
        <Dato etiqueta="Esterilizado">{esterilizado}</Dato>
        <Dato etiqueta="Veterinaria habitual">{pet.usual_vet || "—"}</Dato>
        <Dato etiqueta="N° de microchip" ancho>
          <Microchip chip={pet.microchip} />
        </Dato>
      </dl>

      {pet.allergies && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
          <strong>Alergias / alertas:</strong> {pet.allergies}
        </p>
      )}
    </section>
  )
}

export default CarnetPerfil
