# Cronograma de lanzamiento — CompraInteligente

## Modelo de negocio confirmado
App 100% gratis para el usuario que compra, siempre. Los comercios pagan por destacar sus
ofertas/visibilidad (modelo tipo Mercado Libre - "Product Ads"). El cobro a comercios se
activa recién en la Fase 4, no antes.

## Restricción nueva de Google Play (desde junio 2026)
Las cuentas de desarrollador personales (no organización) creadas después del 13/11/2023
deben pasar una prueba cerrada con **mínimo 12 testers reales durante 14 días continuos**
antes de poder pedir acceso a producción. Esto hay que arrancarlo lo antes posible, en
paralelo a todo lo demás, porque son 14 días que no se pueden acortar.

## Fase 0 — Ya, sin esperar al 1° de septiembre
- Crear cuenta de Google Play Console (U$S25 único) y arrancar la verificación de identidad
  (puede tardar hasta 7 días)
- Reclutar los 12 testers para la prueba cerrada (amigos/conocidos con Android)
- Buscar los primeros 10-20 comercios de Mar del Plata para el portal (piloto en una sola
  ciudad, como recomendaba también el FODA de Manus)
- Migrar el backend a Supabase y conectar el portal de comercios de verdad (para que lo que
  carguen esos comercios quede guardado y visible, no solo local en su celular)

## Fase 1 — 1° de septiembre (se libera el cupo de EAS Build)
- Compilar el APK real
- Arrancar la prueba cerrada con los 12 testers (corren los 14 días mínimo)

## Fase 2 — Durante los 14 días de prueba (en paralelo)
- Terminar de cargar los comercios ya reclutados
- Preparar ficha de Play Store: capturas, ícono, descripción, política de privacidad
  (obligatoria), cuestionario de clasificación de contenido (IARC)
- Publicar la landing (Vercel/Netlify, gratis)
- Dejar lista la campaña de video UGC

## Fase 3 — Pasado el día 15, acceso a producción
- Pedir el pase a producción con los 14 días ya cumplidos
- Revisión de Google (24hs a unos días)
- Publicación real en Play Store, con comercios reales ya cargados desde el día 1

## Fase 4 — Lanzamiento al público y, recién ahí, monetización
- Activar la campaña (video UGC, landing, redes)
- El cobro a comercios por destacarse se prende cuando haya volumen real de usuarios
  mirando la app - no antes, porque antes de eso "destacarse" no vale nada todavía
- Necesita medio de cobro (MercadoPago) - pieza técnica a sumar en este momento, no antes

## Campaña de difusión (fusionada con la propuesta sin UGC de Manus)
Ver `notes/Plan_Lanzamiento_y_Campana_CompraInteligente.pdf` para el plan completo de
campaña: piezas estáticas (sin necesidad de video), guía visual, calendario de 4 semanas,
activación territorial con comercios, y medición mínima por canal.

**Ajuste hecho al fusionar:** el calendario de 4 semanas de la campaña arranca recién en la
Fase 4 de este documento (cuando la app ya es públicamente descargable en Play Store), no
desde el día que se compila el APK — la campaña original asumía descarga pública inmediata,
que acá no aplica por los 14 días de prueba cerrada obligatorios de Google.

El video UGC que se venía preparando en paralelo no es requisito para lanzar - se suma
después, una vez que haya usuarios activos y evidencia de qué mensaje funciona mejor.
