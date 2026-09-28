-- PettGo — Productos de pymes (recomendación con propuesta por correo + métricas)
--
-- Reemplaza el concepto de "Tienda" (venta directa) por una vitrina gratuita de
-- productos de pymes chilenas del rubro mascotas, que PettGo recomienda y hacia
-- las que deriva visitas. El flujo completo (proponer, aceptar/editar/rechazar,
-- publicar, medir) vive en /api con la service role key — por diseño, la clave
-- anon NO puede escribir en ninguna de estas dos tablas, ni siquiera un admin
-- autenticado: toda escritura pasa por las funciones serverless para poder
-- disparar el correo de propuesta y validar los datos de forma consistente.

create type public.producto_pyme_estado as enum ('pendiente', 'publicado', 'rechazado');
create type public.evento_producto_tipo as enum ('vista', 'clic_tienda');

create table public.productos_pyme (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  imagen_url text,
  precio_ref integer,
  link_tienda text not null,
  categoria text,
  pyme_nombre text not null,
  pyme_email text not null,
  estado public.producto_pyme_estado not null default 'pendiente',
  token uuid not null default gen_random_uuid(),
  token_expira timestamptz not null default (now() + interval '14 days'),
  token_usado boolean not null default false,
  motivo_rechazo text,
  aceptado_en timestamptz,
  editado_por_pyme boolean not null default false,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create unique index productos_pyme_token_key on public.productos_pyme (token);

create function public.set_actualizado_en()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

create trigger trg_productos_pyme_actualizado_en
  before update on public.productos_pyme
  for each row execute procedure public.set_actualizado_en();

-- ── Métricas ─────────────────────────────────────────────────────
create table public.eventos_producto (
  id bigint generated always as identity primary key,
  producto_id uuid not null references public.productos_pyme (id) on delete cascade,
  tipo public.evento_producto_tipo not null,
  -- Nunca se guarda la IP en claro: se hashea (SHA-256) junto a un salt del
  -- servidor + IP + user agent + día, solo para poder deduplicar/contar
  -- visitantes únicos sin poder identificar a la persona real.
  visitante_hash text not null,
  referer text,
  creado_en timestamptz not null default now()
);

create index eventos_producto_producto_tipo_fecha_idx
  on public.eventos_producto (producto_id, tipo, creado_en);

-- Métricas agregadas por producto, con filtro opcional de rango de fechas.
create function public.metricas_producto(desde timestamptz default null, hasta timestamptz default null)
returns table (
  producto_id uuid,
  vistas_totales bigint,
  vistas_unicas bigint,
  clics_totales bigint,
  clics_unicos bigint,
  tasa_clic numeric
)
language sql
stable
as $$
  select
    p.id as producto_id,
    coalesce(v.totales, 0) as vistas_totales,
    coalesce(v.unicos, 0) as vistas_unicas,
    coalesce(c.totales, 0) as clics_totales,
    coalesce(c.unicos, 0) as clics_unicos,
    case
      when coalesce(v.unicos, 0) = 0 then 0
      else round((coalesce(c.unicos, 0)::numeric / v.unicos::numeric) * 100, 2)
    end as tasa_clic
  from public.productos_pyme p
  left join (
    select producto_id, count(*) as totales, count(distinct visitante_hash) as unicos
    from public.eventos_producto
    where tipo = 'vista'
      and (desde is null or creado_en >= desde)
      and (hasta is null or creado_en <= hasta)
    group by producto_id
  ) v on v.producto_id = p.id
  left join (
    select producto_id, count(*) as totales, count(distinct visitante_hash) as unicos
    from public.eventos_producto
    where tipo = 'clic_tienda'
      and (desde is null or creado_en >= desde)
      and (hasta is null or creado_en <= hasta)
    group by producto_id
  ) c on c.producto_id = p.id;
$$;

-- Serie diaria (todos los productos publicados juntos), para el gráfico de
-- evolución del panel de admin.
create function public.metricas_diarias(desde timestamptz default null, hasta timestamptz default null)
returns table (
  dia date,
  vistas bigint,
  clics bigint
)
language sql
stable
as $$
  select
    date_trunc('day', creado_en)::date as dia,
    count(*) filter (where tipo = 'vista') as vistas,
    count(*) filter (where tipo = 'clic_tienda') as clics
  from public.eventos_producto
  where (desde is null or creado_en >= desde)
    and (hasta is null or creado_en <= hasta)
  group by 1
  order by 1;
$$;

-- ── Row Level Security ───────────────────────────────────────────
alter table public.productos_pyme enable row level security;
alter table public.eventos_producto enable row level security;

-- Sin políticas de insert/update/delete para anon ni authenticated en ninguna
-- de las dos tablas: todas las escrituras las hace /api con la service role
-- key, que se salta RLS por diseño de Supabase. Tampoco hay política de
-- select genérica sobre productos_pyme (expone pyme_email, token, motivo de
-- rechazo, etc.) — la lectura pública real pasa por la vista de abajo.

-- Vista pública segura: solo productos publicados, sin campos internos.
create view public.productos_pyme_publicos as
  select id, nombre, descripcion, imagen_url, precio_ref, categoria, pyme_nombre, creado_en
  from public.productos_pyme
  where estado = 'publicado';

grant select on public.productos_pyme_publicos to anon, authenticated;
