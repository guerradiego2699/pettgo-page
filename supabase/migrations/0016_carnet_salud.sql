-- PettGo — Carnet de salud de las mascotas
--
-- Cada mascota (public.pets) puede llevar su carnet: vacunas, desparasitaciones, historial de
-- salud y peso, más unos datos de ficha que antes no existían (sexo, fecha de nacimiento,
-- esterilización, microchip, veterinaria habitual y alergias).
--
-- PRIVACIDAD:
--  * Las 4 tablas nuevas (vacunas, desparasitaciones, historial y peso) son SOLO del dueño de la
--    mascota. No hay política para anon ni para admin: si algún día hace falta que un admin las
--    vea, que sea a propósito, por /api.
--  * Los campos nuevos de `pets` (sexo, microchip, alergias…) quedan bajo las políticas que ya
--    tenía esa tabla: los ve el dueño y también un admin (para soporte).
--  * La vista pública `public_pets` usa una lista fija de columnas, así que esos campos nuevos
--    no se exponen en perfiles públicos.
--
-- Es una migración aditiva: no cambia ni borra nada de lo que ya existe.

-- ── Datos nuevos de la ficha ─────────────────────────────────────
alter table public.pets
  add column sex text,
  add column birth_date date,
  add column neutered boolean,
  add column microchip text,
  add column usual_vet text,
  add column allergies text;

alter table public.pets
  add constraint pets_sex_check check (sex is null or sex in ('macho', 'hembra')),
  add constraint pets_microchip_check check (microchip is null or microchip ~ '^[0-9]{15}$'),
  add constraint pets_usual_vet_check check (usual_vet is null or char_length(usual_vet) <= 120),
  add constraint pets_allergies_check check (allergies is null or char_length(allergies) <= 500);

-- ── Vacunas ──────────────────────────────────────────────────────
create table public.pet_vaccines (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  applied_on date not null,
  -- La próxima dosis la define el veterinario tratante; la app solo la recuerda.
  next_due_on date,
  vet_name text check (vet_name is null or char_length(vet_name) <= 120),
  batch text check (batch is null or char_length(batch) <= 60),
  created_at timestamptz not null default now(),
  constraint pet_vaccines_dates_check check (next_due_on is null or next_due_on >= applied_on)
);
create index pet_vaccines_pet_idx on public.pet_vaccines (pet_id, applied_on desc);

-- ── Desparasitaciones ────────────────────────────────────────────
create table public.pet_dewormings (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets (id) on delete cascade,
  kind text not null check (kind in ('interna', 'externa')),
  product text not null check (char_length(product) between 1 and 120),
  applied_on date not null,
  next_due_on date,
  created_at timestamptz not null default now(),
  constraint pet_dewormings_dates_check check (next_due_on is null or next_due_on >= applied_on)
);
create index pet_dewormings_pet_idx on public.pet_dewormings (pet_id, applied_on desc);

-- ── Historial de salud ───────────────────────────────────────────
create table public.pet_health_events (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets (id) on delete cascade,
  occurred_on date not null,
  kind text not null check (kind in ('consulta', 'diagnostico', 'tratamiento', 'examen', 'cirugia')),
  title text not null check (char_length(title) between 1 and 120),
  detail text check (detail is null or char_length(detail) <= 2000),
  vet_name text check (vet_name is null or char_length(vet_name) <= 120),
  created_at timestamptz not null default now()
);
create index pet_health_events_pet_idx on public.pet_health_events (pet_id, occurred_on desc);

-- ── Peso ─────────────────────────────────────────────────────────
create table public.pet_weights (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets (id) on delete cascade,
  measured_on date not null,
  kg numeric(5, 1) not null check (kg > 0 and kg < 200),
  created_at timestamptz not null default now(),
  -- Un solo peso por día: registrar otro el mismo día reemplaza al anterior.
  constraint pet_weights_unique_day unique (pet_id, measured_on)
);

-- ── Seguridad: solo el dueño de la mascota ───────────────────────
alter table public.pet_vaccines enable row level security;
alter table public.pet_dewormings enable row level security;
alter table public.pet_health_events enable row level security;
alter table public.pet_weights enable row level security;

revoke all on public.pet_vaccines, public.pet_dewormings, public.pet_health_events, public.pet_weights from anon;

create policy "pet_vaccines_owner" on public.pet_vaccines
  for all to authenticated
  using (exists (select 1 from public.pets p where p.id = pet_id and p.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.pets p where p.id = pet_id and p.owner_id = (select auth.uid())));

create policy "pet_dewormings_owner" on public.pet_dewormings
  for all to authenticated
  using (exists (select 1 from public.pets p where p.id = pet_id and p.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.pets p where p.id = pet_id and p.owner_id = (select auth.uid())));

create policy "pet_health_events_owner" on public.pet_health_events
  for all to authenticated
  using (exists (select 1 from public.pets p where p.id = pet_id and p.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.pets p where p.id = pet_id and p.owner_id = (select auth.uid())));

create policy "pet_weights_owner" on public.pet_weights
  for all to authenticated
  using (exists (select 1 from public.pets p where p.id = pet_id and p.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.pets p where p.id = pet_id and p.owner_id = (select auth.uid())));
