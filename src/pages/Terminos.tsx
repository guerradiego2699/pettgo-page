function Terminos() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-heading text-3xl font-bold text-ink-900">Términos de Uso</h1>
      <p className="mt-2 text-sm text-ink-400">Última actualización: 26 de agosto de 2026.</p>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-ink-700">
        <p>
          Al usar PettGo aceptas estos términos. Si no estás de acuerdo con ellos, te pedimos no
          usar la plataforma.
        </p>

        <section>
          <h2 className="font-heading text-lg font-bold text-ink-900">1. Qué es PettGo</h2>
          <p className="mt-2">
            PettGo es una plataforma que centraliza información para dueños de mascotas en Curicó:
            un directorio de veterinarias y especialistas, un catálogo de productos, un mapa y un
            foro de comunidad. PettGo no presta directamente servicios veterinarios, de peluquería
            ni de venta de productos.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-bold text-ink-900">2. Tu cuenta</h2>
          <p className="mt-2">
            Eres responsable de la veracidad de la información que ingresas y de mantener segura tu
            contraseña. Cada cuenta es personal e intransferible.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-bold text-ink-900">3. Veterinarias, especialistas y productos</h2>
          <p className="mt-2">
            La información de veterinarias, especialistas y productos publicados es proporcionada o
            verificada por el equipo de PettGo antes de publicarse, pero no garantizamos la calidad,
            disponibilidad ni resultados de los servicios de terceros que ahí se listan. La compra de
            productos se realiza directamente con cada vendedor externo; PettGo no procesa pagos ni
            interviene en esa transacción.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-bold text-ink-900">4. Comunidad y contenido de usuarios</h2>
          <p className="mt-2">
            Al publicar en el foro, aceptas mantener un trato respetuoso hacia otros usuarios y no
            publicar contenido falso, ofensivo o ilegal. Cualquier publicación puede ser reportada
            por otros usuarios, y el equipo de PettGo puede eliminar contenido que incumpla estas
            reglas.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-bold text-ink-900">5. Limitación de responsabilidad</h2>
          <p className="mt-2">
            PettGo se entrega "tal cual"; hacemos nuestro mejor esfuerzo para mantener la información
            actualizada, pero no somos responsables por decisiones tomadas en base a la información
            publicada por terceros en la plataforma.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-bold text-ink-900">6. Cambios a estos términos</h2>
          <p className="mt-2">
            Podemos actualizar estos términos a medida que la plataforma crece. Publicaremos la
            fecha de la última actualización al inicio de este documento.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-bold text-ink-900">7. Ley aplicable</h2>
          <p className="mt-2">Estos términos se rigen por las leyes de la República de Chile.</p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-bold text-ink-900">8. Contacto</h2>
          <p className="mt-2">
            ¿Preguntas sobre estos términos? Escríbenos a{" "}
            <a href="mailto:contacto@pettgo.cl" className="font-semibold text-brand-700 hover:underline">
              contacto@pettgo.cl
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  )
}

export default Terminos
