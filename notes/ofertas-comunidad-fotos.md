# Ofertas cargadas por usuarios (foto + confirmación comunitaria) — Diseño

## Qué resuelve
SEPA solo cubre cadenas grandes obligadas por ley (Coto, Día, Jumbo, Vea, Carrefour, etc.).
Los almacenes de barrio y mayoristas chicos quedan completamente afuera de esa fuente. Este
feature cubre ese hueco: cualquier usuario que ve una oferta real en el local puede cargarla
sacándole una foto, sin depender de que el comercio tenga web, ni de que se sume al portal de
comercios por su cuenta.

## Flujo de carga

```
1. Usuario ve una oferta en un comercio → saca una foto desde la app
2. Se captura junto con la foto: ubicación GPS del celular en ese momento
3. La foto se sube a Supabase Storage; el servidor la procesa con OCR
4. El servidor le muestra al usuario lo que entendió de la foto, ANTES de guardar nada:
   "Detectamos: Leche La Serenísima 1L - $890 ¿Está bien?"
   → el usuario confirma o corrige a mano. Nunca se guarda un dato sin que la persona lo vea.
5. Matching de comercio:
   a. Se buscan comercios ya conocidos (Google Places/OSM) en un radio chico (~80-100m)
      de la ubicación de la foto
   b. Si hay uno solo dentro de ese radio → se asocia automáticamente
   c. Si hay más de uno, o ninguno → se le pide al usuario:
        - Nombre del local (texto libre)
        - Tipo: desplegable Almacén / Supermercado / Mayorista
      La dirección se completa sola con reverse geocoding de las coordenadas de la foto
      (mismo mecanismo que ya usa el GPS de Inicio/Mapa - server/_core/openstreetmap.ts
      y el endpoint reverseGeocode)
6. La oferta queda guardada con estado "sin confirmar" hasta la primera revalidación
   (ver sistema de vigencia abajo)
```

## Por qué el paso 4 (confirmar antes de guardar) no es opcional
El OCR sobre carteles de oferta reales nunca es 100% exacto: carteles a mano, descuentos
superpuestos, mala luz, cartulina torcida. Guardar directamente lo que el OCR "cree" que dice,
sin que un humano lo mire, terminaría llenando la base de precios inventados por una mala
lectura — el mismo problema de confianza que ya resolvimos en Ahorros (datos falsos) y en el
aviso de "fuente de los datos" en Ofertas/Mapa. Este paso es el que mantiene la base confiable.

## Sistema de vigencia por confirmación comunitaria

**Regla base:** el día que se carga la oferta, se asume vigente (alguien la vio en persona ese
mismo momento).

**Quién puede confirmar:** solo se le pregunta a un usuario si está *físicamente cerca* del
comercio (mismo radio que ya se usa para mostrar ofertas cercanas). Preguntarle a alguien en
otra ciudad no aporta ninguna información real, así que nunca se dispara la pregunta para esos
casos - directamente no le aparece.

**Qué pasa con cada respuesta:**
- Primer "Sí" o cualquier "Sí" posterior → la oferta se marca vigente hoy, se resetea el contador
  de vencimiento automático
- Un "No" → la oferta pasa a estado "en revisión": deja de mostrarse como oferta confirmada,
  pero NO se borra todavía (evita que un solo voto malicioso o un error tire abajo una oferta real)
- Segundo "No" sin ningún "Sí" confirmando en el medio → recién ahí se retira de verdad

**Vencimiento automático (red de seguridad):** si pasan 7 días sin que nadie la confirme ni la
desmienta (producto poco buscado, nadie volvió a pasar cerca), se marca sola como "sin
confirmar" y deja de listarse como oferta activa hasta que alguien la revalide.

## Tablas nuevas (Supabase / Postgres)

```sql
create table community_offers (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid references auth.users(id),
  photo_url text not null,
  product_name text not null,
  price_cents integer not null,
  store_id uuid references stores(id),          -- null si no matcheó ningún comercio conocido
  store_name_manual text,                         -- solo si el usuario lo tuvo que tipear
  store_type_manual text,                         -- 'almacen' | 'supermercado' | 'mayorista'
  latitude numeric not null,
  longitude numeric not null,
  address text,                                   -- via reverse geocoding
  status text not null default 'sin_confirmar',   -- 'vigente' | 'en_revision' | 'retirada' | 'sin_confirmar'
  created_at timestamptz not null default now(),
  last_confirmed_at timestamptz
);

create table community_offer_votes (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid references community_offers(id) not null,
  user_id uuid references auth.users(id) not null,
  vote boolean not null,        -- true = sigue vigente, false = ya no está
  voted_at timestamptz not null default now(),
  unique (offer_id, user_id, voted_at::date)  -- 1 voto por usuario por oferta por día
);
```

## Dónde encaja en el roadmap ya definido
No es un camino nuevo — se apoya en lo mismo que ya decidimos para el portal de comercios:
Supabase (Storage para las fotos, Postgres para las tablas de arriba, Auth para saber quién
carga/vota cada cosa). Se puede construir en paralelo al portal de comercios una vez que esté
la base de Supabase andando.

## Piezas técnicas que faltan validar cuando se implemente
- **Motor de OCR:** hay opciones con capa gratuita (a definir cuál según volumen esperado) -
  falta elegir una y probarla con fotos reales de carteles argentinos antes de confiar en su
  precisión
- **Anti-abuso básico:** limitar cuántas ofertas puede cargar un mismo usuario por día, y
  cuántas fotos de comercios de terceros - para que esto no se preste a spam
- **Moderación:** igual que en el portal de comercios, conviene poder revisar altas
  sospechosas a mano (precio absurdamente bajo, mismo usuario cargando decenas de ofertas
  seguidas, etc.)
