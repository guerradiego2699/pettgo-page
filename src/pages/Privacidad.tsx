function Privacidad() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-heading text-3xl font-bold text-ink-900">Política de Privacidad</h1>
      <p className="mt-2 text-sm text-ink-400">Última actualización: 26 de agosto de 2026.</p>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-ink-700">
        <p>
          En PettGo nos importa la privacidad de las personas que usan la plataforma y de sus
          mascotas. Este documento explica qué datos recolectamos, para qué los usamos y qué
          derechos tienes sobre ellos.
        </p>

        <section>
          <h2 className="font-heading text-lg font-bold text-ink-900">1. Qué datos recolectamos</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Datos de tu cuenta: nombre, correo electrónico y, si inicias sesión con Google, tu foto de perfil de Google.</li>
            <li>Datos de tus mascotas: nombre, especie, raza, edad, foto y cualquier información que agregues voluntariamente.</li>
            <li>Contenido que publicas en la comunidad: temas, respuestas y reportes.</li>
            <li>
              Si tienes una ficha de veterinaria o especialista: dirección, teléfono, correo de
              contacto, horarios y fotos del negocio.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-lg font-bold text-ink-900">2. Para qué usamos tus datos</h2>
          <p className="mt-2">
            Usamos tus datos exclusivamente para operar PettGo: mostrar tu perfil y el de tus
            mascotas, mostrar fichas de veterinarias/especialistas y productos, permitir la
            participación en la comunidad, y moderar contenido reportado. No vendemos tus datos a
            terceros ni los usamos con fines publicitarios.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-bold text-ink-900">3. Dónde se almacenan tus datos</h2>
          <p className="mt-2">
            Los datos se almacenan en Supabase (base de datos Postgres e infraestructura de
            almacenamiento de archivos), con reglas de seguridad a nivel de fila que restringen
            quién puede ver o modificar cada dato. Las fotos que subes a la plataforma (avatares,
            mascotas, fichas, productos) son de acceso público, ya que su propósito es mostrarse en
            la plataforma.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-bold text-ink-900">4. Visibilidad de tu correo electrónico</h2>
          <p className="mt-2">
            Tu correo electrónico nunca se muestra públicamente en el foro ni en ningún listado; solo
            se usa para identificarte, para que puedas iniciar sesión, y para contacto interno o de
            moderación cuando sea necesario.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-bold text-ink-900">5. Tus derechos</h2>
          <p className="mt-2">
            Puedes acceder, corregir o eliminar tus datos en cualquier momento desde "Mi cuenta" y
            "Mis mascotas", o solicitándolo a nuestro correo de contacto. Si eliminas tu cuenta,
            eliminamos los datos asociados salvo aquellos que debamos conservar por razones legales
            o de moderación.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg font-bold text-ink-900">6. Contacto</h2>
          <p className="mt-2">
            Si tienes dudas sobre esta política o quieres ejercer tus derechos, escríbenos a{" "}
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

export default Privacidad
