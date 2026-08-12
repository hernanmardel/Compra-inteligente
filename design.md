# CompraInteligente - Plan de Diseño de Interfaz Móvil

## Filosofía de Diseño

Basado en la investigación de mercado, la app debe ser **ultra-simple, ultra-rápida y ultra-práctica**. El público latinoamericano está cansado de desorganización y busca practicidad, comodidad y control. La interfaz debe reflejar **ligereza y control** sin abrumar.

**Principios clave:**
- Mínima fricción (3 taps máximo para cualquier acción principal)
- Información clara y visual sobre ahorros
- Lenguaje simple y directo en español latinoamericano
- Diseño limpio tipo first-party iOS app

## Paleta de Colores

| Token | Color | Uso |
|-------|-------|-----|
| `primary` | `#0A9543` (verde esmeralda) | Ahorro, acciones principales, marca |
| `background` | `#FAFBFC` (blanco roto) | Fondo de pantallas |
| `surface` | `#FFFFFF` (blanco puro) | Tarjetas y superficies elevadas |
| `foreground` | `#1A1D1F` (negro suave) | Texto principal |
| `muted` | `#8B9499` (gris medio) | Texto secundario |
| `border` | `#E8ECED` (gris claro) | Bordes y divisores |
| `success` | `#0A9543` (verde) | Ahorros, precios bajos |
| `warning` | `#F59E0B` (ámbar) | Ofertas por tiempo limitado |
| `error` | `#EF4444` (rojo) | Precios altos, alertas |
| `accent` | `#FF6B35` (naranja vibrante) | Ofertas destacadas, badges |

## Lista de Pantallas

### 1. Inicio (Home)
**Contenido principal:**
- Saludo personalizado + resumen de ahorro semanal
- Tarjeta de ahorro total estimado ("Has ahorrado $X esta semana")
- Acceso rápido: "Crear lista" (botón grande, centrado)
- Ofertas cercanas destacadas (3-4 cards horizontales)
- Productos que compras frecuentemente con oferta activa

**Funcionalidad:**
- Tap en oferta → ver detalle
- Tap en "Crear lista" → ir a Lista de Compras
- Pull to refresh para actualizar ofertas

### 2. Lista de Compras (Shopping List)
**Contenido principal:**
- Input superior para agregar producto rápidamente
- Lista de productos con checkbox, nombre, cantidad, precio estimado
- Total estimado en la parte inferior
- Botón "Ver ofertas cercanas" que conecta con mapa
- Categorías automáticas (frutas, lácteos, limpieza, etc.)

**Funcionalidad:**
- Agregar producto con input rápido
- Marcar como comprado (checkbox con animación)
- Editar cantidad con stepper
- Eliminar con swipe
- Ver total estimado en tiempo real
- Comparar precios entre supermercados

### 3. Ofertas Cerca (Nearby Offers)
**Contenido principal:**
- Lista de supermercados cercanos con distancia
- Ofertas activas por supermercado
- Filtros por categoría
- Badge de "Oferta del día"
- Comparación de precios entre tiendas

**Funcionalidad:**
- Ver ofertas por supermercado
- Filtrar por categoría
- Agregar oferta directamente a lista
- Ver distancia y tiempo estimado

### 4. Mapa (Map)
**Contenido principal:**
- Mapa con marcadores de supermercados cercanos
- Badges de ofertas activas en cada marcador
- Lista inferior deslizable con supermercados
- Filtro de ofertas por producto

**Funcionalidad:**
- Tap en marcador → ver ofertas del supermercado
- Tap en supermercado en lista → centrar mapa
- Activar ubicación real del usuario

### 5. Ahorros / Historial (Savings)
**Contenido principal:**
- Resumen de ahorros: semanal, mensual, total
- Gráfico simple de tendencia de ahorro
- Historial de compras realizadas
- Productos más comprados
- Comparación: precio normal vs. precio con oferta

**Funcionalidad:**
- Ver desglose de ahorros
- Filtrar por período
- Ver historial de listas compradas

## Flujos de Usuario Principales

### Flujo 1: Compra Rápida
1. Usuario abre app → ve Inicio
2. Tap "Crear lista" → va a Lista de Compras
3. Escribe productos rápidamente → se agregan con autosugerencia
4. Ve total estimado en tiempo real
5. Tap "Ver ofertas cercanas" → ve supermercados con mejores precios
6. Selecciona supermercado → ve ofertas específicas
7. Marca productos como comprados

### Flujo 2: Descubrir Ofertas
1. Usuario abre app → ve Inicio
2. Ve ofertas cercanas destacadas en cards
3. Tap en oferta → ve detalle con precio comparado
4. Tap "Agregar a lista" → se agrega a lista actual
5. Va al mapa para ver dónde está el supermercado

### Flujo 3: Revisar Ahorros
1. Usuario abre app → tap tab "Ahorros"
2. Ve resumen visual de cuánto ahorró
3. Explora historial de compras
4. Ve qué productos compró con oferta

## Navegación

**Tab Bar (5 tabs):**
1. Inicio (icono casa)
2. Lista (icono lista de compras)
3. Ofertas (icono etiqueta/precio)
4. Mapa (icono mapa)
5. Ahorros (icono gráfico)

## Tipografía

- **Títulos grandes:** 28px, bold
- **Títulos de sección:** 20px, semibold
- **Texto de cuerpo:** 16px, regular
- **Texto secundario:** 14px, regular
- **Números de ahorro:** 32px, bold, color success
- **Precios:** 18px, semibold

## Componentes Clave

1. **OfferCard:** Tarjeta de oferta con producto, precio normal vs oferta, supermercado, distancia
2. **ProductRow:** Fila de producto en lista con checkbox, nombre, cantidad, precio
3. **SavingsBadge:** Badge circular con monto ahorrado
4. **SupermarketCard:** Tarjeta de supermercado con ofertas activas y distancia
5. **QuickAddBar:** Barra inferior para agregar productos rápidamente
6. **TotalCounter:** Contador de total en lista de compras
