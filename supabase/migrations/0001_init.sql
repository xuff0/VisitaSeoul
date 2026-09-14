-- Esquema de visitaseoul.
--
-- Guarda solamente lo tuyo. Los 134 lugares precargados, la red de trenes y el catálogo de
-- compras viven en el repositorio y se despliegan con la app: copiarlos a la base por cada
-- persona que entra no aportaría nada y volvería lenta la primera carga.
--
-- De los lugares precargados se guarda el diff (place_overrides), no una copia entera. Así, si
-- una versión futura corrige la dirección de una tienda, la corrección llega igual a quien haya
-- editado el nombre de ese mismo lugar.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Cursor de sincronización
--
-- updated_at lo pone el cliente y sirve para resolver conflictos: gana la escritura más reciente.
-- Pero no sirve para paginar la bajada: un teléfono con la hora mal puesta escribiría filas con
-- fecha pasada y el que sincroniza nunca las vería. Para eso está synced_at, que lo pone el
-- servidor y siempre avanza.
-- ---------------------------------------------------------------------------
create or replace function public.touch_synced_at()
returns trigger
language plpgsql
as $$
begin
  new.synced_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

-- Lugares que agregaste vos.
create table if not exists public.places (
  id          uuid primary key,
  owner       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  n           text not null,
  k           text not null default '',
  c           text not null,
  z           text not null check (z in ('seul', 'alrededores')),
  d           text not null default '',
  lat         double precision not null check (lat between -90 and 90),
  lng         double precision not null check (lng between -180 and 180),
  t           text,
  hours       text,
  tags        text[] not null default '{}',
  buy         text[] not null default '{}',
  updated_at  timestamptz not null,
  deleted_at  timestamptz,
  device_id   text not null default '',
  synced_at   timestamptz not null default now()
);

-- Tus cambios sobre los lugares precargados: sólo los campos que tocaste, más si lo ocultaste.
create table if not exists public.place_overrides (
  owner       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  seed_id     text not null,
  patch       jsonb not null default '{}'::jsonb,
  hidden      boolean not null default false,
  updated_at  timestamptz not null,
  deleted_at  timestamptz,
  device_id   text not null default '',
  synced_at   timestamptz not null default now(),
  primary key (owner, seed_id)
);

-- Categorías propias, además de las once que trae la app.
create table if not exists public.categories (
  id          uuid primary key,
  owner       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label       text not null,
  color       text not null,
  icon        text not null default '📍',
  updated_at  timestamptz not null,
  deleted_at  timestamptz,
  device_id   text not null default '',
  synced_at   timestamptz not null default now()
);

-- Favorito y visitado. Valen tanto para los lugares precargados como para los tuyos.
create table if not exists public.flags (
  owner       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  place_id    text not null,
  fav         boolean not null default false,
  done        boolean not null default false,
  updated_at  timestamptz not null,
  deleted_at  timestamptz,
  device_id   text not null default '',
  synced_at   timestamptz not null default now(),
  primary key (owner, place_id)
);

-- Lo que compraste de verdad, con lo que efectivamente pagaste. Alimenta el contador de la
-- franquicia de $1.000 de la aduana boliviana.
create table if not exists public.purchases (
  id            uuid primary key,
  owner         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_id       text,
  label         text not null,
  qty           integer not null default 1 check (qty > 0),
  krw_paid      bigint not null check (krw_paid >= 0),
  place_id      text,
  tax_refunded  boolean not null default false,
  bought_at     timestamptz not null,
  updated_at    timestamptz not null,
  deleted_at    timestamptz,
  device_id     text not null default '',
  synced_at     timestamptz not null default now()
);

-- Precios vistos en la góndola. El catálogo del repo es el punto de partida; esto es el dato
-- fresco, y es lo que hace que el multiplicador deje de ser una estimación.
create table if not exists public.price_sightings (
  id          uuid primary key,
  owner       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_id     text not null,
  krw         bigint not null check (krw >= 0),
  place_id    text,
  note        text,
  seen_at     timestamptz not null,
  updated_at  timestamptz not null,
  deleted_at  timestamptz,
  device_id   text not null default '',
  synced_at   timestamptz not null default now()
);

-- Tipos de cambio y preferencias. Una fila por persona.
create table if not exists public.settings (
  owner             uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  usd_krw           numeric not null default 1350,
  usd_bob_oficial   numeric not null default 12.26,
  usd_bob_paralelo  numeric not null default 12.39,
  bob_rate          text not null default 'oficial' check (bob_rate in ('oficial', 'paralelo')),
  travellers        integer not null default 1 check (travellers between 1 and 9),
  updated_at        timestamptz not null,
  device_id         text not null default '',
  synced_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Índices del cursor de bajada
-- ---------------------------------------------------------------------------
create index if not exists places_owner_synced          on public.places (owner, synced_at);
create index if not exists place_overrides_owner_synced on public.place_overrides (owner, synced_at);
create index if not exists categories_owner_synced      on public.categories (owner, synced_at);
create index if not exists flags_owner_synced           on public.flags (owner, synced_at);
create index if not exists purchases_owner_synced       on public.purchases (owner, synced_at);
create index if not exists price_sightings_owner_synced on public.price_sightings (owner, synced_at);

-- ---------------------------------------------------------------------------
-- Disparadores de synced_at
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'places', 'place_overrides', 'categories', 'flags', 'purchases', 'price_sightings', 'settings'
  ]
  loop
    execute format('drop trigger if exists %I_touch on public.%I', t, t);
    execute format(
      'create trigger %I_touch before insert or update on public.%I
         for each row execute function public.touch_synced_at()', t, t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Seguridad a nivel de fila
--
-- Cada quien ve y escribe únicamente lo suyo. Vale también para los usuarios anónimos que crea
-- signInAnonymously(): son usuarios reales con su propio auth.uid(), así que la app puede no
-- tener pantalla de login sin que la base quede abierta a cualquiera con el enlace.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'places', 'place_overrides', 'categories', 'flags', 'purchases', 'price_sightings', 'settings'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I_own on public.%I', t, t);
    execute format(
      'create policy %I_own on public.%I
         for all to authenticated
         using (owner = auth.uid())
         with check (owner = auth.uid())', t, t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permisos
--
-- Un proyecto de Supabase ya concede estos permisos por defecto a las tablas nuevas de public,
-- pero dejarlos escritos hace que la migración se explique sola y funcione igual si se aplica
-- sobre un proyecto con los permisos por defecto cambiados. Quien filtra sigue siendo el RLS.
-- ---------------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.places, public.place_overrides, public.categories, public.flags,
  public.purchases, public.price_sightings, public.settings
  to authenticated;
