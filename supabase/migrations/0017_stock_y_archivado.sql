-- PettGo — consulta de stock a las pymes y estado "archivado" para sus productos
--
-- El admin puede preguntarle a la pyme, por correo, si un producto sigue disponible. La pyme
-- responde con un enlace personal ("Sí, sigue disponible" / "No, está agotado"). Si responde que
-- está agotado, el producto se ARCHIVA solo: deja de mostrarse en el sitio, pero conserva su
-- historial y sus métricas, y se puede reactivar.
--
-- Es una migración aditiva: no cambia ni borra nada de lo existente. Las tablas con RLS sin
-- políticas (productos_pyme) siguen sin ser accesibles para anon: todo pasa por /api.
-- La vista pública productos_pyme_publicos solo muestra estado = 'publicado', así que los
-- archivados desaparecen de ella sin tocarla.
--
-- IMPORTANTE: correr ANTES de publicar el código que usa estas columnas.

alter type public.producto_pyme_estado add value if not exists 'archivado';

alter table public.productos_pyme
  add column stock_estado text,
  -- Cuándo respondió la pyme por última vez ("hace cuánto se confirmó").
  add column stock_confirmado_en timestamptz,
  -- Cuándo se le envió la última consulta (de aquí sale el bloqueo de 4 días del botón).
  add column stock_consultado_en timestamptz,
  add column stock_token uuid,
  add column stock_token_expira timestamptz,
  add column stock_token_usado boolean not null default false,
  add column archivado_en timestamptz,
  add column archivado_motivo text;

alter table public.productos_pyme
  add constraint productos_pyme_stock_estado_check check (stock_estado is null or stock_estado in ('disponible', 'agotado')),
  add constraint productos_pyme_archivado_motivo_check check (archivado_motivo is null or archivado_motivo in ('manual', 'sin_stock'));

create unique index productos_pyme_stock_token_key on public.productos_pyme (stock_token) where stock_token is not null;
