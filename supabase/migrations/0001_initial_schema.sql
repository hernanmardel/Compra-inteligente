-- CompraInteligente — schema inicial de Supabase (Postgres)
-- Unifica las 3 notas de diseño: notes/sepa-precios-claros-integracion.md,
-- notes/ofertas-comunidad-fotos.md y notes/puntos-ranking-usuarios.md,
-- más las tablas de comercios que hoy solo existen en AsyncStorage
-- (constants/merchant-portal-store.ts).
--
-- Cómo correrla: Supabase → SQL Editor → pegar todo este archivo → Run.
-- Se puede correr una sola vez; si hace falta modificar algo después, se hace
-- con una migración nueva, no editando esta.

-- ============================================================
-- 1. COMERCIOS (portal de comercios - hoy local, pasa a compartido)
-- ============================================================

create table stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) not null,
  name text not null,
  category text not null,          -- 'Almacén' | 'Supermercado' | 'Mayorista'
  address text not null,
  city text not null,
  province text,
  phone text,
  schedule text,
  latitude numeric,
  longitude numeric,
  google_place_id text,            -- si matchea con un comercio real de Google Places
  verified boolean not null default false,   -- moderación básica (FODA de Manus)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table store_catalog_items (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores(id) not null,
  name text not null,
  category text,
  barcode text,                    -- EAN, si el comercio lo tiene
  regular_price int not null,      -- centavos
  updated_at timestamptz not null default now()
);

create table store_offers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references stores(id) not null,
  catalog_item_id uuid references store_catalog_items(id),
  original_price int not null,     -- centavos
  offer_price int not null,        -- centavos
  starts_at date not null,
  ends_at date not null,
  stock text,                      -- 'Stock limitado', texto libre
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 2. SEPA / Precios Claros (ver notes/sepa-precios-claros-integracion.md)
-- ============================================================

create table sepa_products (
  id serial primary key,
  external_id text not null,       -- id_producto/EAN de SEPA
  name text not null,
  brand text,
  category text
);

create table sepa_chains (
  id serial primary key,
  name text not null unique        -- "Dia", "Coto", etc.
);

create table sepa_prices (
  id bigserial primary key,
  product_id int references sepa_products(id) not null,
  chain_id int references sepa_chains(id) not null,
  province text not null,
  sucursal_address text not null,
  sucursal_lat numeric,
  sucursal_lng numeric,
  list_price int not null,         -- centavos
  promo_price int,
  reported_date date not null,
  synced_at timestamptz not null default now()
);

create table sepa_synced_provinces (
  province text primary key,
  last_synced_at timestamptz,
  last_requested_at timestamptz not null default now()
);

-- ============================================================
-- 3. Ofertas cargadas por usuarios (ver notes/ofertas-comunidad-fotos.md)
-- ============================================================

create table community_offers (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid references auth.users(id) not null,
  photo_url text not null,
  product_name text not null,
  price_cents int not null,
  store_id uuid references stores(id),
  store_name_manual text,
  store_type_manual text,          -- 'almacen' | 'supermercado' | 'mayorista'
  latitude numeric not null,
  longitude numeric not null,
  address text,
  status text not null default 'sin_confirmar',  -- 'vigente' | 'en_revision' | 'retirada' | 'sin_confirmar'
  created_at timestamptz not null default now(),
  last_confirmed_at timestamptz
);

create table community_offer_votes (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid references community_offers(id) not null,
  user_id uuid references auth.users(id) not null,
  vote boolean not null,           -- true = sigue vigente, false = ya no está
  voted_at timestamptz not null default now(),
  unique (offer_id, user_id, voted_at)
);

-- ============================================================
-- 4. Puntos y ranking (ver notes/puntos-ranking-usuarios.md)
-- ============================================================

create table user_points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  points int not null,
  reason text not null,            -- 'oferta_confirmada' | 'voto_confirmacion' | 'voto_baja'
  related_offer_id uuid references community_offers(id),
  city text,
  created_at timestamptz not null default now()
);

create table user_ranking_prefs (
  user_id uuid references auth.users(id) primary key,
  display_name text,
  show_in_ranking boolean not null default false
);

-- ============================================================
-- Índices para las consultas más frecuentes (por cercanía y por ciudad)
-- ============================================================

create index idx_stores_city on stores (city);
create index idx_store_offers_store on store_offers (store_id) where active = true;
create index idx_sepa_prices_province on sepa_prices (province);
create index idx_sepa_prices_product on sepa_prices (product_id);
create index idx_community_offers_status on community_offers (status);
create index idx_points_ledger_user on user_points_ledger (user_id);
create index idx_points_ledger_city on user_points_ledger (city);

-- ============================================================
-- Row Level Security (RLS) - básico para arrancar
-- Sin esto, cualquiera con la anon key podría leer/escribir todo sin control.
-- ============================================================

alter table stores enable row level security;
alter table store_catalog_items enable row level security;
alter table store_offers enable row level security;
alter table community_offers enable row level security;
alter table community_offer_votes enable row level security;
alter table user_points_ledger enable row level security;
alter table user_ranking_prefs enable row level security;

-- Lectura pública (la app necesita mostrar comercios/ofertas a cualquiera, con o sin login)
create policy "lectura publica stores" on stores for select using (true);
create policy "lectura publica catalog" on store_catalog_items for select using (true);
create policy "lectura publica offers" on store_offers for select using (true);
create policy "lectura publica community_offers" on community_offers for select using (true);
create policy "lectura publica ranking" on user_ranking_prefs for select using (show_in_ranking = true);

-- Escritura: solo el dueño autenticado de ese comercio puede modificar sus propios datos
create policy "dueno escribe su comercio" on stores for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "dueno escribe su catalogo" on store_catalog_items for all
  using (auth.uid() = (select owner_id from stores where stores.id = store_id))
  with check (auth.uid() = (select owner_id from stores where stores.id = store_id));
create policy "dueno escribe sus ofertas" on store_offers for all
  using (auth.uid() = (select owner_id from stores where stores.id = store_id))
  with check (auth.uid() = (select owner_id from stores where stores.id = store_id));

-- Cualquier usuario logueado puede cargar una oferta comunitaria y votar
create policy "usuario carga oferta comunitaria" on community_offers for insert
  with check (auth.uid() = submitted_by);
create policy "usuario vota" on community_offer_votes for insert
  with check (auth.uid() = user_id);

-- sepa_* no lleva RLS de escritura de usuarios: se llenan solo desde el
-- proceso de sincronización con la service_role key (que se salta RLS),
-- nunca desde la app en el celular.
