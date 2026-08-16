# Integración con SEPA / Precios Claros — Diseño

## Qué es
SEPA (Sistema Electrónico de Publicidad de Precios Argentinos), Secretaría de Comercio de la Nación.
Los supermercados grandes (Coto, Día, Jumbo, Disco, Vea, Carrefour, ChangoMás, etc.) están
obligados por ley a informar sus precios todos los días. Datos abiertos, licencia Creative
Commons, actualización diaria, ~70.000 productos, ~12M de registros/día a nivel país.
Fuente: https://datos.produccion.gob.ar/dataset/sepa-precios

No cubre: almacenes de barrio, verdulerías, mayoristas chicos — solo cadenas grandes con
obligación legal de reportar. (Ese hueco lo tapa el sistema de ofertas cargadas por usuarios,
ver notes/ofertas-comunidad-fotos.md)

## Por qué esto y no las otras dos opciones
- vs. scraping de cada web de comercio: una sola fuente estable, con respaldo legal, no se
  rompe cuando un comercio rediseña su sitio (riesgo que ya identificamos en la auditoría UX)
- vs. comunidad de usuarios: no depende de masa crítica ni de moderar contenido cargado a mano

## Alcance: todo el país, con sincronización bajo demanda por provincia
La meta es cubrir las 24 provincias, no solo Buenos Aires. Guardarlas todas de forma
permanente desde el día 1 no entra cómodo en el plan gratuito de Supabase (ver el cálculo de
tamaño más abajo) — por eso se sincroniza solo lo que hace falta: las provincias donde
realmente hay usuarios.

## Flujo propuesto

```
[Servidor - cuando llega un pedido de un usuario]
   1. Se detecta la provincia del usuario (ya lo hace useUserLocation → currentRegion)
   2. Si esa provincia nunca se sincronizó (o hace mucho que no) → se la marca como
      "pendiente de sync", y por ahora se le responde con lo que ya hay disponible
      (Google Places/OSM), sin bloquear su pedido esperando el proceso completo
        ↓
[Script de sincronización, corre 1 vez/día - GitHub Actions o cron del servidor]
   1. Descarga el CSV nacional del día desde datos.gob.ar
   2. Filtra SOLO las provincias marcadas como "pendiente de sync" o activas
      (no las 24 de una - solo donde hay uso real)
   3. Normaliza: nombre de producto, cadena, sucursal (dirección), precio lista, precio promo
   4. Guarda/actualiza en la base de datos (Supabase/Postgres) - pisa el precio anterior,
      no acumula historial diario (eso también ayuda a no crecer sin límite)
        ↓
[Endpoint del servidor: prices.byProduct / prices.nearbyOffers]
   Cruza la sucursal SEPA con el comercio real que ya trae Google Places/OSM
   (por nombre de cadena + cercanía de dirección), y expone precio + fuente
        ↓
[App: Ofertas / Mapa / Lista]
   Muestra el precio con una etiqueta clara: "Fuente: Precios Claros (SEPA) - Gob. Nacional"
   en vez de la ambigüedad actual (mock vs. scraping)
        ↓
[Al día siguiente, ese usuario ya ve precios SEPA reales de su provincia]
```

**Importante para la primera prueba:** el proceso no es instantáneo. Si abrís la app por
primera vez desde una provincia nueva (para vos, Buenos Aires), esa provincia recién queda
lista después de la próxima corrida diaria del sync (hasta 24hs), no en el momento exacto en
que la abriste. Mientras tanto la app sigue funcionando igual con Google Places/OSM, como ya
lo hace hoy.

**Provincias sin uso por un tiempo largo** se pueden dejar de sincronizar (liberan espacio), y
se vuelven a activar solas apenas alguien las vuelve a pedir.

## Por qué esto, y no cargar las 24 provincias de una
12 millones de registros/día a nivel país, incluso con filas livianas (~150-200 bytes cada
una), pesan entre 1,5 y 2,5 GB — 3 a 5 veces el límite del plan gratuito de Supabase (500 MB).
Sincronizar solo las provincias con uso real ata el espacio ocupado al crecimiento real de
usuarios, no al tamaño de Argentina. Si el proyecto crece mucho a nivel nacional, el paso
natural es subir al plan pago de Supabase (u$s25/mes, 8 GB incluidos) — pero no hace falta
pagar nada para arrancar ni para crecer al principio.

## Tablas (Supabase/Postgres) - normalizadas para pesar lo menos posible
Guardar el nombre completo del producto y de la cadena repetido en cada fila infla mucho el
tamaño. Conviene una tabla chica de catálogo (productos, cadenas) y que la tabla grande de
precios solo guarde números que apuntan a esas tablas:

```sql
create table sepa_products (
  id serial primary key,
  external_id text not null,      -- id_producto/EAN de SEPA
  name text not null,
  brand text,
  category text
);

create table sepa_chains (
  id serial primary key,
  name text not null unique       -- "Dia", "Coto", etc.
);

create table sepa_prices (
  id bigserial primary key,
  product_id int references sepa_products(id) not null,
  chain_id int references sepa_chains(id) not null,
  province text not null,
  sucursal_address text not null,
  sucursal_lat numeric,
  sucursal_lng numeric,
  list_price int not null,        -- centavos
  promo_price int,
  reported_date date not null,
  synced_at timestamptz not null default now()
);

create table sepa_synced_provinces (
  province text primary key,
  last_synced_at timestamptz,
  last_requested_at timestamptz not null default now()
);
```

## El punto flojo: cruzar el catálogo propio con los nombres de SEPA
Tu catálogo dice "Leche entera 1L". SEPA reporta el nombre tal cual lo carga cada supermercado
("LA SERENISIMA LECHE ENT SACHET 1LT" o similar), sin estandarizar. Esto necesita un matching
por palabras clave/categoría, nunca va a ser 100% exacto. Para el arranque: matching flexible
por categoría + palabras clave del nombre, mostrando "puede no ser exacto" cuando la confianza
del match es baja — mismo criterio de honestidad que ya usamos con `DataSourceBanner`.

## Estado actual del código
✅ Implementado y conectado a Supabase (ya no genera JSON estático en GitHub):
- `scripts/sync-sepa-prices.ts` — escribe en `sepa_products` / `sepa_chains` / `sepa_prices` /
  `sepa_synced_provinces`, con el mecanismo de sync bajo demanda por provincia ya funcionando.
- `hooks/use-sepa-products.ts` — lee directo de Supabase (lectura pública, sin RLS en las
  tablas `sepa_*`), y "pide" una provincia nueva automáticamente la primera vez que hace falta.
- `.github/workflows/sync-sepa-prices.yml` — sigue corriendo 1 vez/día gratis en GitHub
  Actions, ahora escribe en la base en vez de commitear archivos.

**Pendiente:** cargar `EXPO_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` como *Secrets*
del repositorio de GitHub (Settings → Secrets and variables → Actions → New repository
secret) - el workflow los necesita para poder escribir en la base. Sin esto, el sync diario
va a fallar apenas se corra.

## Advertencia honesta
No pude confirmar el nombre exacto de las columnas del CSV de SEPA (no tengo acceso a
internet desde donde escribo este código). El script busca las columnas por palabras clave en
el encabezado, no por posición fija, así que debería auto-ajustarse — pero si falla, el log
de la corrida va a mostrar el encabezado real recibido para poder corregirlo en dos minutos.
Conviene correrlo manualmente una vez para confirmar que funciona, antes de dejarlo en
automático.
