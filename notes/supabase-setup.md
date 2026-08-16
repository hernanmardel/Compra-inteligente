# Configuración de Supabase — Estado y próximos pasos

## Ya hecho (código)
- `supabase/migrations/0001_initial_schema.sql` — schema completo: comercios/catálogo/ofertas
  del portal, SEPA, ofertas comunitarias por foto, y puntos/ranking. Unifica las 4 notas de
  diseño (sepa-precios-claros-integracion.md, ofertas-comunidad-fotos.md,
  puntos-ranking-usuarios.md, más las tablas de comercios que hoy solo viven en
  `constants/merchant-portal-store.ts` con AsyncStorage).
- `lib/supabase-client.ts` — cliente listo, con aviso claro si todavía faltan las claves
  (no rompe la app si no está configurado: SEPA vía JSON estático y Google Places siguen
  funcionando igual mientras tanto).
- `.env.example` — plantilla de las 3 variables que hacen falta.
- `package.json` — sumadas `@supabase/supabase-js` y su polyfill.

## Pendiente (acción del usuario)
1. Crear el proyecto en supabase.com (ver pasos en el chat) — región São Paulo.
2. Correr `supabase/migrations/0001_initial_schema.sql` completo en el SQL Editor del proyecto.
3. Copiar `.env.example` a `.env` y completar:
   - `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` → Project Settings → API
   - `SUPABASE_SERVICE_ROLE_KEY` → misma pantalla, la clave "service_role" (nunca compartir,
     nunca subir a ningún repositorio - solo la usan los scripts de servidor)
4. `npm install` para bajar las dos dependencias nuevas.
5. Habilitar el login anónimo: Authentication → Settings → activar "Allow anonymous sign-ins".
   El portal de comercios lo necesita para saber qué comercio le pertenece a cada dispositivo,
   sin pedirle usuario/contraseña a nadie (mismo criterio de "sin fricción" del diseño original).

## Pendiente (código, próximos pasos - todavía no implementado)
Una vez que el proyecto esté creado y conectado, falta migrar cada pieza de lo local/estático
a Supabase de verdad:
- ✅ `constants/merchant-portal-store.ts` → migrado a Supabase (stores/store_catalog_items/
  store_offers), con login anónimo automático. `app/portal-comercios.tsx` no necesitó cambios.
- ✅ `scripts/sync-sepa-prices.ts` y `hooks/use-sepa-products.ts` → migrados a Supabase con
  sync bajo demanda por provincia. Pendiente: cargar los Secrets del repo de GitHub
  (`EXPO_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) para que el workflow diario pueda
  escribir en la base.
- `scripts/sync-sepa-prices.ts` → hoy genera JSON estático para GitHub. Migrar a escribir en
  `sepa_products` / `sepa_chains` / `sepa_prices`, con el mecanismo de sync bajo demanda por
  provincia descripto en notes/sepa-precios-claros-integracion.md.
- Sistema de ofertas comunitarias (foto + OCR) y puntos/ranking: implementación nueva completa,
  todavía no existe código de esto, solo el diseño en las notas correspondientes.
- Autenticación de usuarios comunes (no comerciantes): la app hoy tiene un login OAuth propio
  (lib/_core/auth.ts, heredado de Manus) además del login anónimo que ya usa el portal de
  comercios - hay que decidir si conviene unificar todo bajo Supabase Auth.
