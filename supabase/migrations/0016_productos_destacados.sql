-- PettGo — 0016: productos destacados para la portada.
--
-- La portada muestra los productos con más clics. El problema: `eventos_producto`
-- tiene RLS y NO tiene política de select para anon (por diseño de 0007: las
-- métricas solo se leen desde /api con la service role key). Así que la página
-- pública no puede contar los clics por su cuenta.
--
-- Solución: una vista que entrega los productos publicados ya con su total de
-- clics acumulado. Igual que `productos_pyme_publicos`, la vista corre con los
-- permisos de su dueño, así que deja leer el agregado sin abrir la tabla de
-- eventos. Aparece en el Security Advisor como "Security Definer View" — mismo
-- caso ya aceptado en 0007 y 0013.
--
-- Qué se expone: solo el total de clics por producto publicado. Nunca el
-- visitante_hash, el referer ni ningún evento individual.
--
-- "Clics" = eventos de tipo 'vista' (clic en la ficha del producto), que es lo
-- mismo que el panel de Tendencias llama "clics en el producto". Los clics a la
-- tienda externa son el otro tipo ('clic_tienda') y no se usan acá.
--
-- Re-ejecutable: se puede pegar completa de nuevo sin romper nada.

drop view if exists public.productos_pyme_destacados;

create view public.productos_pyme_destacados as
  select
    p.id,
    p.nombre,
    p.descripcion,
    p.imagen_url,
    p.precio_ref,
    p.categoria,
    p.especie,
    p.pyme_nombre,
    p.creado_en,
    coalesce(e.clics, 0) as clics
  from public.productos_pyme p
  left join (
    select producto_id, count(*) as clics
    from public.eventos_producto
    where tipo = 'vista'
    group by producto_id
  ) e on e.producto_id = p.id
  where p.estado = 'publicado';

grant select on public.productos_pyme_destacados to anon, authenticated;
