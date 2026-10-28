-- PettGo — Gestión de proyecto y equipo (panel de admin, uso interno)
--
-- Herramienta interna para que el equipo de PettGo (no los dueños de mascotas)
-- lleve sus propias actividades, hitos, riesgos y auditoría del proyecto.
-- Mismo patrón que productos_pyme: RLS activo sin políticas para anon ni
-- authenticated — todo el acceso pasa por /api con la service role key.

create type public.proyecto_estado as enum ('Pendiente', 'En desarrollo', 'Completada', 'Bloqueada', 'Atrasada');
create type public.proyecto_prioridad as enum ('Baja', 'Media', 'Alta', 'Crítica');
create type public.proyecto_riesgo as enum ('Bajo', 'Medio', 'Alto', 'Crítico');
create type public.proyecto_hito_estado as enum ('Pendiente', 'En curso', 'Cumplido');
create type public.proyecto_propuesta_estado as enum ('PENDIENTE DE APROBACIÓN', 'APROBADA', 'RECHAZADA');

create table public.proyecto_actividades (
  codigo text primary key check (codigo ~ '^[A-Za-z]+-[0-9]+$'),
  area text not null,
  actividad text not null,
  responsable text,
  estado public.proyecto_estado not null default 'Pendiente',
  fecha_inicio date,
  fecha_limite date,
  avance_esperado integer not null default 0 check (avance_esperado between 0 and 100),
  avance_real integer not null default 0 check (avance_real between 0 and 100),
  prioridad public.proyecto_prioridad not null default 'Media',
  riesgo public.proyecto_riesgo not null default 'Bajo',
  dependencias text[] not null default '{}',
  observaciones text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table public.proyecto_hitos (
  codigo text primary key check (codigo ~ '^[A-Za-z]+-[0-9]+$'),
  nombre text not null,
  fecha date not null,
  estado_declarado public.proyecto_hito_estado not null default 'Pendiente',
  actividades_requeridas text[] not null default '{}',
  descripcion text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table public.proyecto_propuestas (
  id uuid primary key default gen_random_uuid(),
  actividad_codigo text not null,
  texto text not null,
  cronograma_propuesto jsonb not null default '[]',
  estado public.proyecto_propuesta_estado not null default 'PENDIENTE DE APROBACIÓN',
  decidido_por text,
  comentario_decision text,
  decidido_en timestamptz,
  creado_en timestamptz not null default now()
);

create table public.proyecto_reportes_area (
  id uuid primary key default gen_random_uuid(),
  agente text not null,
  actividad text not null,
  actividad_codigo text,
  avance integer,
  riesgo text,
  mensaje text not null,
  creado_en timestamptz not null default now()
);

create table public.proyecto_auditoria (
  id bigint generated always as identity primary key,
  tipo_analisis text not null,
  origen text not null,
  actividad text,
  riesgo_detectado text,
  recomendacion text,
  creado_en timestamptz not null default now()
);

create index proyecto_auditoria_fecha_idx on public.proyecto_auditoria (creado_en desc);

create function public.set_actualizado_en_proyecto()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

create trigger trg_proyecto_actividades_actualizado_en
  before update on public.proyecto_actividades
  for each row execute procedure public.set_actualizado_en_proyecto();

create trigger trg_proyecto_hitos_actualizado_en
  before update on public.proyecto_hitos
  for each row execute procedure public.set_actualizado_en_proyecto();

alter table public.proyecto_actividades enable row level security;
alter table public.proyecto_hitos enable row level security;
alter table public.proyecto_propuestas enable row level security;
alter table public.proyecto_reportes_area enable row level security;
alter table public.proyecto_auditoria enable row level security;
-- Sin políticas: solo /api con la service role key puede leer o escribir.
