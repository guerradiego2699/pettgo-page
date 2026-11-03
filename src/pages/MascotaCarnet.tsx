import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { aFecha, hoyISO, recordatorios, sumarDias, type Recordatorio } from "../lib/carnet"
import PetForm from "../components/PetForm"
import CarnetPerfil from "../components/carnet/CarnetPerfil"
import CarnetRecordatorios from "../components/carnet/CarnetRecordatorios"
import CarnetVacunas from "../components/carnet/CarnetVacunas"
import CarnetDesparasitaciones from "../components/carnet/CarnetDesparasitaciones"
import CarnetHistorial from "../components/carnet/CarnetHistorial"
import CarnetPeso from "../components/carnet/CarnetPeso"
import type { Pet, PetDeworming, PetHealthEvent, PetVaccine, PetWeight } from "../types/pet"

type Seccion = "vacunas" | "desparasitaciones" | "historial" | "peso"

const SECCIONES: { id: Seccion; label: string }[] = [
  { id: "vacunas", label: "Vacunas" },
  { id: "desparasitaciones", label: "Desparasitación" },
  { id: "historial", label: "Historial de salud" },
  { id: "peso", label: "Peso" },
]

// Para "registrar dosis" desde un recordatorio: misma vacuna o producto, hoy, y la próxima fecha
// con el mismo intervalo que tuvo la dosis anterior. El veterinario puede corregirla antes de guardar.
function proximaConMismoIntervalo(aplicada: string, proxima: string | null): string {
  if (!proxima) return ""
  const dias = Math.round((aFecha(proxima).getTime() - aFecha(aplicada).getTime()) / 864e5)
  return dias > 0 ? sumarDias(hoyISO(), dias) : ""
}

function MascotaCarnet() {
  const { id } = useParams()
  const [pet, setPet] = useState<Pet | null>(null)
  const [vacunas, setVacunas] = useState<PetVaccine[]>([])
  const [desparas, setDesparas] = useState<PetDeworming[]>([])
  const [eventos, setEventos] = useState<PetHealthEvent[]>([])
  const [pesos, setPesos] = useState<PetWeight[]>([])
  const [cargando, setCargando] = useState(true)
  const [noEncontrada, setNoEncontrada] = useState(false)
  const [errorCarnet, setErrorCarnet] = useState(false)
  const [seccion, setSeccion] = useState<Seccion>("vacunas")
  const [editandoFicha, setEditandoFicha] = useState(false)
  const [prefill, setPrefill] = useState<Record<string, string> | null>(null)
  const limpiarPrefill = useCallback(() => setPrefill(null), [])

  const cargar = useCallback(async () => {
    if (!id) return
    const [mascota, v, d, e, p] = await Promise.all([
      supabase.from("pets").select("*").eq("id", id).maybeSingle(),
      supabase.from("pet_vaccines").select("*").eq("pet_id", id),
      supabase.from("pet_dewormings").select("*").eq("pet_id", id),
      supabase.from("pet_health_events").select("*").eq("pet_id", id),
      supabase.from("pet_weights").select("*").eq("pet_id", id),
    ])
    // La base solo devuelve mascotas del propio usuario (RLS): si no es suya, aparece como inexistente.
    setNoEncontrada(!mascota.data)
    setPet(mascota.data)
    setErrorCarnet(Boolean(v.error || d.error || e.error || p.error))
    setVacunas(v.data ?? [])
    setDesparas(d.data ?? [])
    setEventos(e.data ?? [])
    setPesos(p.data ?? [])
    setCargando(false)
  }, [id])

  useEffect(() => {
    cargar()
  }, [cargar])

  const pendientes = useMemo(() => recordatorios(vacunas, desparas), [vacunas, desparas])

  function registrarDosis(r: Recordatorio) {
    if (r.tipo === "vacuna") {
      const v = vacunas.find((x) => x.id === r.id)
      if (!v) return
      setPrefill({ name: v.name, applied_on: hoyISO(), next_due_on: proximaConMismoIntervalo(v.applied_on, v.next_due_on), vet_name: "", batch: "" })
      setSeccion("vacunas")
    } else {
      const d = desparas.find((x) => x.id === r.id)
      if (!d) return
      setPrefill({ kind: d.kind, product: d.product, applied_on: hoyISO(), next_due_on: proximaConMismoIntervalo(d.applied_on, d.next_due_on) })
      setSeccion("desparasitaciones")
    }
  }

  if (cargando) return <p className="mx-auto max-w-4xl px-6 py-16 text-ink-500">Cargando…</p>

  if (noEncontrada || !pet) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center px-6 py-24 text-center">
        <h1 className="font-heading text-2xl font-bold text-ink-900">No encontramos esta mascota</h1>
        <Link to="/mascotas" className="mt-6 text-sm font-semibold text-brand-700 hover:underline">
          ← Volver a mis mascotas
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-16">
      <Link to="/mascotas" className="text-sm font-semibold text-brand-700 hover:underline">
        ← Mis mascotas
      </Link>

      {editandoFicha ? (
        <PetForm
          pet={pet}
          onCancel={() => setEditandoFicha(false)}
          onSaved={() => {
            setEditandoFicha(false)
            cargar()
          }}
        />
      ) : (
        <CarnetPerfil pet={pet} pesos={pesos} onEditar={() => setEditandoFicha(true)} />
      )}

      {errorCarnet ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          No pudimos cargar el carnet de salud en este momento. Intenta de nuevo en unos minutos.
        </p>
      ) : (
        <>
          <CarnetRecordatorios
            lista={pendientes}
            onRegistrar={registrarDosis}
            onVer={(r) => setSeccion(r.tipo === "vacuna" ? "vacunas" : "desparasitaciones")}
          />

          <section>
            <div role="tablist" className="flex flex-wrap gap-2">
              {SECCIONES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={seccion === s.id}
                  onClick={() => setSeccion(s.id)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    seccion === s.id ? "bg-ink-900 text-white" : "border border-brand-100 bg-white text-ink-600 hover:bg-brand-50"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="mt-4">
              {seccion === "vacunas" && (
                <CarnetVacunas petId={pet.id} especie={pet.species} vacunas={vacunas} onCambio={cargar} prefill={prefill} onPrefillUsado={limpiarPrefill} />
              )}
              {seccion === "desparasitaciones" && (
                <CarnetDesparasitaciones petId={pet.id} registros={desparas} onCambio={cargar} prefill={prefill} onPrefillUsado={limpiarPrefill} />
              )}
              {seccion === "historial" && <CarnetHistorial petId={pet.id} eventos={eventos} onCambio={cargar} />}
              {seccion === "peso" && <CarnetPeso petId={pet.id} pesos={pesos} onCambio={cargar} />}
            </div>
          </section>
        </>
      )}

      <p className="text-xs text-ink-500">
        Estos datos son privados: solo tú los ves. Las fechas de próxima dosis las define el veterinario tratante; PettGo solo te las
        recuerda. Este carnet no reemplaza el carnet de tu veterinaria ni su consejo profesional.
      </p>
    </div>
  )
}

export default MascotaCarnet
