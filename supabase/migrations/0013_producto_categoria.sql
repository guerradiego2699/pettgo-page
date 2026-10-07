-- PettGo — categorías fijas para los productos de pymes
--
-- Hasta ahora `productos_pyme.categoria` era un texto libre. Pasa a ser una lista fija
-- (alimento, higiene, juguetes, accesorios, salud, descanso) para poder filtrar en la
-- página pública, en el panel de admin y agrupar en Tendencias.
--
-- ANTES DE CORRERLA, mira qué hay hoy (ver cuáles se van a convertir y cuáles no):
--   select categoria, count(*) from public.productos_pyme group by 1 order by 2 desc;
--
-- Los textos antiguos se convierten por palabras clave (misma lógica que
-- src/lib/categoriasProducto.ts). Lo que no calce con ninguna queda en NULL ("Sin
-- categoría") y se asigna a mano desde Editar en el admin.
--
-- Además la vista pública ahora expone `especie` (perro/gato/ambos), que hasta ahora solo
-- existía en el admin y en Tendencias, para poder filtrar por mascota en /productos.

create type public.producto_pyme_categoria as enum
  ('alimento', 'higiene', 'juguetes', 'accesorios', 'salud', 'descanso');

-- La vista depende de la columna, hay que soltarla para poder cambiar su tipo.
drop view public.productos_pyme_publicos;

alter table public.productos_pyme
  alter column categoria type public.producto_pyme_categoria
  using (
    case
      when categoria is null then null
      else (
        case
          when translate(lower(trim(categoria)), 'áéíóúü', 'aeiouu') ~ 'juguete|pelota|mordedor|peluche|juego' then 'juguetes'
          when translate(lower(trim(categoria)), 'áéíóúü', 'aeiouu') ~ 'alimento|comida|snack|premio|croqueta|galleta|dieta' then 'alimento'
          when translate(lower(trim(categoria)), 'áéíóúü', 'aeiouu') ~ 'higiene|limpieza|shampoo|champu|cepillo|arena|aseo|ba.o' then 'higiene'
          when translate(lower(trim(categoria)), 'áéíóúü', 'aeiouu') ~ 'salud|medic|vitamina|suplemento|antipulga|antiparasit|vacuna|farmac' then 'salud'
          when translate(lower(trim(categoria)), 'áéíóúü', 'aeiouu') ~ 'descanso|cama|colchon|cojin|duerm|manta' then 'descanso'
          when translate(lower(trim(categoria)), 'áéíóúü', 'aeiouu') ~ 'accesorio|collar|correa|arnes|ropa|chaleco|bandana|placa|transportadora|comedero|bebedero|plato' then 'accesorios'
          else null
        end
      )::public.producto_pyme_categoria
    end
  );

create index productos_pyme_categoria_idx on public.productos_pyme (categoria);

-- Vista pública segura: solo productos publicados, sin campos internos. (Mismo criterio
-- que en 0007; aparece en el Security Advisor como "Security Definer View", ya aceptado.)
create view public.productos_pyme_publicos as
  select id, nombre, descripcion, imagen_url, precio_ref, categoria, especie, pyme_nombre, creado_en
  from public.productos_pyme
  where estado = 'publicado';

grant select on public.productos_pyme_publicos to anon, authenticated;
