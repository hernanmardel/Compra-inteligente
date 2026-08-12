# CompraInteligente — Guía de continuación

Este paquete contiene el código fuente y la configuración necesaria para continuar el desarrollo de la aplicación móvil **CompraInteligente** en otro entorno o con otra herramienta de IA.

## Contenido incluido

- Aplicación Expo/React Native: `app/`, `components/`, `constants/`, `hooks/` y `lib/`.
- Recursos visuales: `assets/`.
- Servidor de integración y tipos compartidos: `server/` y `shared/`.
- Configuración y dependencias: `package.json`, `pnpm-lock.yaml`, `app.config.ts`, `tsconfig.json`, configuraciones de Expo, NativeWind y TypeScript.
- Scripts, migraciones y pruebas existentes: `scripts/`, `drizzle/` y `tests/`.

## Contenido excluido por seguridad o porque se regenera

- Credenciales, claves API y archivos `.env`.
- `node_modules/`, cachés de Expo, registros, artefactos de compilación y el historial interno de Git.

## Requisitos

Usar Node.js 22 o superior y pnpm 9. En la carpeta del proyecto, instalar dependencias mediante:

```bash
pnpm install
```

Para iniciar el entorno de desarrollo:

```bash
pnpm dev
```

Para comprobar TypeScript:

```bash
pnpm check
```

## Variables de entorno

La búsqueda de comercios cercanos usa Google Places en el servidor. Para habilitarla fuera de este entorno, crear un archivo `.env` local con una clave propia:

```env
GOOGLE_PLACES_API_KEY=tu_clave_de_google_places
```

No incluir esa clave en repositorios públicos ni en solicitudes enviadas a otras herramientas de IA.

## Punto de partida recomendado

La pantalla principal está en `app/(tabs)/index.tsx`. La lista compartida está en `constants/shopping-list-store.ts`, y la lógica de comercios cercanos está en `hooks/use-google-places.ts` junto con `server/_core/google-places.ts`.
