# CompraInteligente — Informe de Investigación y Entrega de Mini App

## Resumen Ejecutivo

Este documento presenta los resultados de una investigación profunda de mercado sobre una mini app de lista de compras con ofertas por ubicación dirigida al público latinoamericano, seguida del desarrollo de la aplicación móvil funcional basada en los hallazgos obtenidos.

La investigación se realizó siguiendo un marco de 7 fases que incluyó identificación de comunidades online, análisis de productos competidores, investigación profunda del público objetivo, archivo de swipes con citas textuales reales, y un informe de oportunidad de producto. Posteriormente, se construyó una app móvil con 5 pantallas funcionales que reflejan los insights descubiertos.

---

## Hallazgos Clave de la Investigación

### El Mercado: Saturado en PDFs, Vacío en Apps

El mercado latinoamericano de listas de compras y ahorro está dominado por **guías estáticas en PDF y plantillas Excel**. Los productos ganadores en Hotmart —como "Lista de Compras Ahorro Inteligente" y "DESPENSA INTELIGENTE"— son todos documentos estáticos que prometen "secretos" de ahorro pero no ofrecen datos en tiempo real ni geolocalización. **No existe una app móvil nativa** que combine lista de compras inteligente con ofertas en tiempo real y ubicación geográfica, lo que representa una oportunidad masiva y clara.

### El Público: Desesperado por Control

El público objetivo —personas de 20 a 45 años en zonas urbanas de Argentina, México, Brasil y Colombia— experimenta un dolor constante: **57% de la Generación Z en Latinoamérica realiza compras impulsivas** [1], y **78% de los latinoamericanos presta más atención a los precios desde la pandemia** [2]. Las personas han intentado listas en papel, apps genéricas, guías PDF y apps de descuentos fragmentadas, pero nada funciona. El punto de ruptura financiero es real: el cansancio por la desorganización y la culpa por gastar sin control son disparadores poderosos.

### La Oportunidad: Información Correcta en el Momento Correcto

La falsa creencia central que la app debe atacar es: *"Ahorrar requiere disciplina extrema y sacrificio"*. La realidad es que **ahorrar es automático si se tiene la información correcta en el momento correcto**. La app debe ser ultra-simple, ultra-rápida y ultra-práctica: qué comprar, dónde comprarlo más barato, cuánto se ahorra. Sin fricción, sin complejidad.

---

## La App: CompraInteligente

### Pantallas Implementadas

| Pantalla | Funcionalidad Principal |
|----------|------------------------|
| **Inicio** | Resumen de ahorro semanal, ofertas destacadas cercanas, supermercados cercanos, tip del día |
| **Lista de Compras** | Agregar productos con autosugerencia, marcar como comprados, editar cantidades, ver total estimado, acceder a ofertas cercanas |
| **Ofertas Cerca** | Lista de ofertas activas con filtros por categoría, tarjetas de supermercados, ahorro calculado por oferta |
| **Mapa** | Lista de supermercados cercanos con distancia, ofertas activas por tienda, botón de navegación |
| **Ahorros** | Resumen de ahorro por período (semana/mes/total), gráfico de tendencia, historial de compras, estadísticas |

### Decisiones de Diseño Basadas en Investigación

**Paleta de colores:** Verde esmeralda (`#0A9543`) como color primario, asociado con ahorro y crecimiento. Naranja vibrante (`#FF6B35`) como acento para ofertas destacadas. Fondo claro y limpio para transmitir ligereza y control.

**Navegación:** 5 tabs en la barra inferior, siguiendo el estándar de apps iOS first-party. Cada tab tiene un icono claro y una etiqueta concisa.

**Lenguaje:** Español latinoamericano natural y cercano. Sin lenguaje corporativo ni promesas exageradas. Frases como "Vamos a ahorrar en tus compras de hoy" en lugar de "Optimice su experiencia de compra".

**Fricción mínima:** Agregar un producto toma 3 taps. Ver ofertas cercanas toma 1 tap desde la lista. El total estimado se actualiza en tiempo real.

---

## Cómo Usar la App

1. **Abrir la app** — Se muestra la pantalla de Inicio con un resumen de ahorro semanal y ofertas destacadas cerca de tu ubicación.
2. **Crear una lista** — Tocar "Crear lista de compras" para ir a la pantalla de Lista. Escribir el nombre del producto y seleccionarlo de las sugerencias.
3. **Marcar productos como comprados** — Tocar el círculo junto a cada producto para marcarlo como comprado.
4. **Ver ofertas cercanas** — Desde la Lista, tocar "Ver ofertas cercanas" para comparar precios entre supermercados.
5. **Explorar el mapa** — Tocar la tab "Mapa" para ver supermercados cercanos con ofertas activas y distancia.
6. **Revisar ahorros** — Tocar la tab "Ahorros" para ver cuánto has ahorrado, tu tendencia semanal y el historial de compras.

---

## Próximos Pasos Sugeridos

1. **Integrar API de precios reales** — Conectar con supermercados reales (Día, Carrefour, Coto, Chango Mas) para mostrar ofertas en tiempo real en lugar de datos mock.
2. **Implementar geolocalización real** — Usar `expo-location` para detectar la ubicación del usuario y mostrar supermercados cercanos reales con `expo-maps`.
3. **Sincronización entre dispositivos** — Permitir compartir listas con familiares usando el backend incluido (PostgreSQL + tRPC) para que múltiples personas puedan editar la misma lista.

---

## References

[1] AmericasMI, "7 tendencias de consumo entre la generación Z de América Latina," Nov 2025. [Online]. Available: https://americasmi.com/insights/tendencias-consumidor-z-america-latina/

[2] Pacto Global Colombia, "Así cambiaron los hábitos de consumo en Latinoamérica tras la pandemia del COVID-19," 2020. [Online]. Available: https://www.pactoglobal-colombia.org/news/asi-cambiaron-los-habitos-de-consumo-en-latinoamerica-tras-la-pandemia-del-covid-19.html
