# Sistema de puntos y ranking de usuarios — Diseño

## Objetivo
Motivar a que los usuarios carguen ofertas por foto y confirmen vigencia (ver
notes/ofertas-comunidad-fotos.md), con un componente social/competitivo — sin pedirle nada
nuevo, solo puntuar lo que ya se diseñó.

## Qué suma puntos, y cuánto (borrador, ajustable)
No todo aporte vale lo mismo, y el orden de cuándo se otorgan los puntos importa para evitar
trampa:

- **Cargar una oferta que después se confirma vigente** (primer "sí" de otro usuario) → el
  aporte más valioso. Los puntos se otorgan recién en ese momento, NO al momento de cargar la
  foto — si se otorgaran al cargar, cualquiera podría subir ofertas falsas/inventadas solo
  para juntar puntos, sin que nadie las valide nunca.
- **Confirmar con "sí" que una oferta de otro sigue vigente** → aporte más chico, pero es lo
  que mantiene viva la base de precios día a día.
- **Marcar "no" cuando una oferta ya no está** → también suma (poco), porque es información
  útil igual - pero con el mismo límite de proximidad y anti-abuso que ya se diseñó para el
  sistema de vigencia, para que no se preste a bajar puntos ajenos maliciosamente.
- Un usuario no puede votar su propia oferta cargada (ni sumar puntos votándose a sí mismo).

## Anti-abuso
Mismo criterio que ya aplicamos en ofertas-comunidad-fotos.md: límite de cuántas
acciones puntuables puede hacer un mismo usuario por día. Sin este límite, alguien podría
inflar su puntaje a fuerza de volumen en vez de aportes genuinos.

## Dónde se muestra en la app
No conviene un sexto tab en la barra de navegación (ya hay 5: Inicio, Lista, Ofertas, Mapa,
Ahorros) - se agrega como una sección accesible desde una pantalla existente (por ejemplo, una
tarjeta en Inicio o dentro de Ofertas: "Ranking de la comunidad"), no como ítem de navegación
propio.

**Arrancar por ciudad, no nacional.** Con pocos usuarios activos, un ranking nacional se ve
vacío o siempre con los mismos 3 nombres — el mismo problema de "se ve vacío/falso" que ya
resolvimos en Ahorros. Mejor un ranking por ciudad: cada comunidad local compite entre gente
real de su zona, tiene más sentido y se llena antes.

**Nombre público, opcional.** Mostrar el nombre real de alguien en un ranking público expone
cuánto usa la app - eso lo tiene que elegir el usuario (un apodo, o directamente no aparecer
en el ranking), no ser automático.

**El copy del premio futuro:**
> "En un futuro, los usuarios con más puntos podrán recibir un premio."

Redactado en futuro y sin especificar mecánica (no dice monto, ni cómo se entrega, ni cada
cuánto) - genera expectativa sin comprometer nada concreto todavía. Cuando haya un premio real
definido, conviene revisar antes si necesita registrarse como promoción/concurso ante la
autoridad correspondiente (varía según cómo se arme - no es un tema para resolver con código).

## Tablas nuevas (Supabase/Postgres)

```sql
create table user_points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  points int not null,
  reason text not null,              -- 'oferta_confirmada' | 'voto_confirmacion' | 'voto_baja'
  related_offer_id uuid references community_offers(id),
  city text,                         -- para el ranking por ciudad
  created_at timestamptz not null default now()
);

create table user_ranking_prefs (
  user_id uuid references auth.users(id) primary key,
  display_name text,                 -- null = no aparece en el ranking público
  show_in_ranking boolean not null default false
);
```

Usar un ledger (una fila por evento que suma puntos) en vez de un simple contador en la tabla
de usuarios - permite auditar de dónde salió cada punto si en algún momento hay que revisar un
puntaje sospechoso, y recalcular el ranking por ciudad/período sin recontar todo a mano.

## Dónde encaja en el roadmap
Se apoya en lo mismo que ofertas-comunidad-fotos.md (Supabase, tabla `community_offers` y
`community_offer_votes` ya diseñadas) - este sistema de puntos es una capa fina arriba de esas
mismas acciones, no un componente aparte. Se implementa en el mismo momento.
