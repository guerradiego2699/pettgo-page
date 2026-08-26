-- PettGo — Fase 2.0: esquema base + roles + RLS
-- Ejecutar en el SQL Editor de Supabase (o via `supabase db push` si usas la CLI).

-- ── Roles y estados ─────────────────────────────────────────────
create type public.user_role as enum ('persona', 'admin', 'especialista', 'veterinaria');
create type public.listing_status as enum ('pending', 'approved', 'rejected');

-- ── Perfiles (1:1 con auth.users) ───────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null,
  role public.user_role not null default 'persona',
  created_at timestamptz not null default now()
);

-- Crea el perfil automáticamente cuando alguien se registra (email/password o Google).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', new.email),
    new.email,
    'persona'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Helper: ¿el usuario actual es admin?
create function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Evita que un usuario se autoasigne un rol distinto (solo admin puede cambiar roles).
create function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role <> old.role and not public.is_admin() then
    raise exception 'Solo un administrador puede cambiar el rol de una cuenta';
  end if;
  return new;
end;
$$;

create trigger trg_prevent_role_self_escalation
  before update on public.profiles
  for each row execute procedure public.prevent_role_self_escalation();

-- Vista pública segura: nombre visible en el foro, email NUNCA expuesto.
create view public.public_profiles as
  select id, name, role from public.profiles;

alter table public.profiles enable row level security;

create policy "profiles_select_own_or_admin" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

create policy "profiles_update_own_or_admin" on public.profiles
  for update using (auth.uid() = id or public.is_admin());

grant select on public.public_profiles to anon, authenticated;

-- ── Mascotas ─────────────────────────────────────────────────────
create table public.pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  species text not null check (species in ('perro', 'gato')),
  breed text,
  age_years numeric,
  photo_url text,
  highlight text,
  created_at timestamptz not null default now()
);

alter table public.pets enable row level security;

create policy "pets_select_own_or_admin" on public.pets
  for select using (auth.uid() = owner_id or public.is_admin());

create policy "pets_insert_own" on public.pets
  for insert with check (auth.uid() = owner_id);

create policy "pets_update_own_or_admin" on public.pets
  for update using (auth.uid() = owner_id or public.is_admin());

create policy "pets_delete_own_or_admin" on public.pets
  for delete using (auth.uid() = owner_id or public.is_admin());

-- ── Veterinarias ─────────────────────────────────────────────────
create table public.vets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles (id) on delete set null,
  name text not null,
  address text,
  phone text,
  contact_email text,
  photos text[] not null default '{}',
  services text[] not null default '{}',
  is_24h boolean not null default false,
  schedule text,
  lat double precision,
  lng double precision,
  google_place_id text,
  status public.listing_status not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.vets enable row level security;

create policy "vets_select_approved_or_owner_or_admin" on public.vets
  for select using (status = 'approved' or auth.uid() = owner_id or public.is_admin());

create policy "vets_insert_admin" on public.vets
  for insert with check (public.is_admin());

create policy "vets_update_owner_or_admin" on public.vets
  for update using (auth.uid() = owner_id or public.is_admin());

create policy "vets_delete_admin" on public.vets
  for delete using (public.is_admin());

-- ── Especialistas ────────────────────────────────────────────────
create table public.specialists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles (id) on delete set null,
  name text not null,
  phone text,
  contact_email text,
  photos text[] not null default '{}',
  services text[] not null default '{}',
  schedule text,
  status public.listing_status not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.specialists enable row level security;

create policy "specialists_select_approved_or_owner_or_admin" on public.specialists
  for select using (status = 'approved' or auth.uid() = owner_id or public.is_admin());

create policy "specialists_insert_admin" on public.specialists
  for insert with check (public.is_admin());

create policy "specialists_update_owner_or_admin" on public.specialists
  for update using (auth.uid() = owner_id or public.is_admin());

create policy "specialists_delete_admin" on public.specialists
  for delete using (public.is_admin());

-- ── Productos (dropshipping) ─────────────────────────────────────
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  photo_url text,
  external_link text,
  external_contact text,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

create policy "products_select_public" on public.products
  for select using (true);

create policy "products_insert_admin" on public.products
  for insert with check (public.is_admin());

create policy "products_update_admin" on public.products
  for update using (public.is_admin());

create policy "products_delete_admin" on public.products
  for delete using (public.is_admin());

-- ── Foro ─────────────────────────────────────────────────────────
create table public.forum_threads (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.forum_threads enable row level security;

create policy "threads_select_authenticated" on public.forum_threads
  for select using (auth.uid() is not null);

create policy "threads_insert_own" on public.forum_threads
  for insert with check (auth.uid() = author_id);

create policy "threads_update_own_or_admin" on public.forum_threads
  for update using (auth.uid() = author_id or public.is_admin());

create policy "threads_delete_own_or_admin" on public.forum_threads
  for delete using (auth.uid() = author_id or public.is_admin());

create table public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.forum_threads (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.forum_posts enable row level security;

create policy "posts_select_authenticated" on public.forum_posts
  for select using (auth.uid() is not null);

create policy "posts_insert_own" on public.forum_posts
  for insert with check (auth.uid() = author_id);

create policy "posts_update_own_or_admin" on public.forum_posts
  for update using (auth.uid() = author_id or public.is_admin());

create policy "posts_delete_own_or_admin" on public.forum_posts
  for delete using (auth.uid() = author_id or public.is_admin());

-- Reportes de moderación (foro)
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  thread_id uuid references public.forum_threads (id) on delete cascade,
  post_id uuid references public.forum_posts (id) on delete cascade,
  reason text,
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  constraint reports_target_check check (thread_id is not null or post_id is not null)
);

alter table public.reports enable row level security;

create policy "reports_insert_authenticated" on public.reports
  for insert with check (auth.uid() = reporter_id);

create policy "reports_select_own_or_admin" on public.reports
  for select using (auth.uid() = reporter_id or public.is_admin());

create policy "reports_update_admin" on public.reports
  for update using (public.is_admin());
