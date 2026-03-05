

# Plan: Convertir la App a PWA (Progressive Web App)

## Qué se hará

Convertir la aplicación en una PWA instalable desde el navegador, permitiendo a los usuarios agregarla a su pantalla de inicio como si fuera una app nativa.

## Cambios

### 1. Instalar `vite-plugin-pwa`
- Agregar dependencia `vite-plugin-pwa`

### 2. Configurar `vite.config.ts`
- Agregar plugin `VitePWA` con:
  - Manifest (nombre, íconos, colores, tema)
  - Service worker con `navigateFallbackDenylist: [/^\/~oauth/]`
  - Estrategia de caché para funcionamiento offline

### 3. Actualizar `index.html`
- Agregar meta tags para móvil: `apple-mobile-web-app-capable`, `theme-color`, `apple-touch-icon`

### 4. Crear íconos PWA
- Generar `pwa-192x192.png` y `pwa-512x512.png` en `/public` basados en el favicon existente

### 5. Crear página `/install`
- Página dedicada con instrucciones para instalar la app y botón que dispara el prompt de instalación del navegador (`beforeinstallprompt`)

### 6. Agregar ruta en `App.tsx`
- Ruta `/install` apuntando a la nueva página

## Resultado
Los usuarios podrán instalar la app desde el navegador (Compartir → Agregar a inicio en iPhone, o menú del navegador en Android). Funcionará offline y se sentirá como una app nativa.

