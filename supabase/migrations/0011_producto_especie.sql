-- PettGo — agrega especie (perro/gato/ambos) a productos_pyme
--
-- Necesario para el panel de Tendencias del admin (filtrar/agrupar el
-- catálogo por mascota). Los productos ya existentes quedan en 'ambos' por
-- defecto — conviene revisarlos y ajustarlos uno por uno desde "Editar".

create type public.producto_pyme_especie as enum ('perro', 'gato', 'ambos');

alter table public.productos_pyme
  add column especie public.producto_pyme_especie not null default 'ambos';
