# Frontend

Interfaz para `spotify-to-ytmusic`. Habla con el backend FastAPI vía HTTP +
WebSocket bajo el prefijo `/api`. Se empaqueta como app de escritorio con
Tauri 2.

## Stack

- **Vite 8** + **React 19** + **TypeScript**
- **react-router-dom 7** (rutas reales: `/connect`, `/library`,
  `/migrate`, `/reports`, `/reports/:id`)
- **Tauri 2** (desktop: sidecar + webview nativo)
- **TanStack Query 5** para estado HTTP
- **TailwindCSS 3** con tema oscuro forzado y color primario morado
- **MSW 2** para mockear el backend (modo offline/testing)
- **Vitest** + **Testing Library** para tests
- WebSocket nativo con reconexión exponencial

## Inicio rápido

```bash
pnpm install
pnpm dev
```

Abre http://localhost:5173. Por defecto la app arranca contra los
mocks de MSW — verás la UI completamente funcional contra fixtures.

> **Importante:** usa `pnpm`, no `npm`. `pnpm-lock.yaml` es la fuente
> de verdad. Algunos paquetes (`msw`) provocan crashes en npm 11.x.

## Scripts

| Script | Propósito |
| ------ | -------- |
| `pnpm dev` | Servidor de desarrollo con HMR |
| `pnpm build` | `tsc -b && vite build` |
| `pnpm lint` | ESLint |
| `pnpm format` / `format:check` | Prettier |
| `pnpm test` | Vitest en watch mode |
| `pnpm test:run` | Vitest una pasada (lo que corre CI) |
| `pnpm gen:api` | Genera `src/types/api.gen.ts` desde el OpenAPI del backend |
| `pnpm gen:api:check` | CI check: falla si el generado no coincide con el commiteado |

## Modos de desarrollo

La app puede correr en dos modos:

### Modo MSW (offline, por defecto)

Todo el tráfico `*/api/*` lo intercepta MSW con fixtures. No necesitas
el backend corriendo.

```bash
# .env.development tiene VITE_USE_MSW=true por defecto
pnpm dev
```

### Modo backend real

Las peticiones se envían al backend FastAPI a través del proxy de Vite
(`localhost:8000`).

```bash
# 1. Arranca el backend
cd ../backend && python -m spotify_to_ytmusic.api.server

# 2. En otra terminal, desactiva MSW y arranca el frontend
cd frontend
echo 'VITE_USE_MSW=false' > .env.development.local
pnpm dev
```

O edita `.env.development` y pon `VITE_USE_MSW=false` directamente.

El proxy de Vite (`vite.config.ts`) redirige:
- `/api` → `http://localhost:8000` (HTTP)
- `/api/migrate` → `http://localhost:8000` con WebSocket

### Generar tipos desde OpenAPI

Los tipos TS se generan automáticamente desde el schema OpenAPI del
backend:

```bash
# Con el backend corriendo en localhost:8000
pnpm gen:api
```

Esto actualiza `src/types/api.gen.ts` (commiteado). El archivo
`src/types/api.ts` re-exporta los tipos generados y mantiene manualmente
sólo los tipos de eventos WebSocket que OpenAPI no cubre.

## Arquitectura

```
src/
├── main.tsx              # MSW (conditional) + ErrorBoundary + BrowserRouter + QueryClient
├── App.tsx               # <Routes> dentro de <SelectionProvider>
├── pages/                # Una carpeta por ruta top-level
│   ├── Connect/          # Spotify + YT Music
│   ├── Library/          # Tabs Playlists/Albums + selección
│   ├── Migrate/          # Confirmación + EventLog en vivo
│   └── Reports/          # List + Detail con deep-link a /reports/:id
├── components/
│   ├── layout/           # AppShell, Header (NavLink), Footer, ErrorBoundary, ConnectionStatus
│   ├── ui/               # Button, Toast, Card, Input, Skeleton, Spinner, FieldError, …
│   ├── library/          # Tabs, SelectionSummary
│   └── migrate/          # PlaylistProgress, AlbumProgress, NotFound, CompletionSummary, ConnectionBanner
├── features/             # TanStack Query hooks por dominio
│   ├── auth/             # useSpotifyAuth, useYTMusicAuth, useHealth
│   ├── library/          # usePlaylists, useAlbums, useSelection (delega en SelectionContext)
│   ├── migrate/          # useStartMigration, useMigrationSelection, derivaciones del log
│   └── reports/          # useReports, useReport
├── contexts/             # SelectionContext (lookup de selección entre páginas)
├── hooks/
│   ├── useMigrationEvents.ts    # WS + reducer incremental
│   ├── useAutoFocusHeading.ts   # Focus management por página (a11y)
│   └── useFocusTrap.ts          # Trap para diálogos (Reports/Detail)
├── lib/
│   ├── http.ts           # fetch wrapper con AbortSignal.timeout (15s default)
│   ├── ws.ts             # WsConnection con backoff y short-circuit en cierres limpios
│   ├── query-client.ts   # TanStack Query client
│   ├── download.ts       # Descarga blob → JSON
│   └── ToastContext.tsx
├── types/
│   ├── api.gen.ts        # Generado desde OpenAPI (pnpm gen:api)
│   └── api.ts            # Re-exporta api.gen.ts + tipos manuales de eventos WS
└── test/
    ├── setup.ts          # Vitest + MSW lifecycle
    └── msw/              # handlers, fixtures, server (Node), browser (worker)
```

### Patrones que NO hay que romper

- **La selección vive en `SelectionContext`**, no en `useState` por página.
- **Las rutas se navegan con `<NavLink>` / `<Link>` / `useNavigate`**.
- **Cada página gestiona su propio focus** con `useAutoFocusHeading`.
- **Las llamadas HTTP pasan por `lib/http.ts`** para heredar el timeout de 15 s.
- **El WS reconecta solo en cierres anormales** (wasClean, 1000, 1005).
- **Dark mode forzado**: `class="dark"` en `<html>`, usar `text-gray-100/200/300`,
  `bg-gray-700/800/900`, `border-gray-600/700`. No colores claros.
- **Color primario**: morado (`primary-*`), no `blue-*`.
- **Migración bloquea navegación**: `useMigrationState` + dialog de confirmación.
- **Credenciales Spotify**: se guardan vía UI en `spotify_credentials.json`.
  El `.env` solo sirve para la CLI.

### Tauri (desktop)

```bash
# Desarrollo
pnpm tauri dev

# Producción
python ../backend/scripts/build_sidecar.py  # compila sidecar PyInstaller
pnpm tauri build                              # .msi / .exe
```

Ver [`PACKAGING.md`](../PACKAGING.md) para más detalles.

### Mocks (MSW)

MSW intercepta peticiones `/api/*` en modo test (`VITE_USE_MSW=true`).
Los handlers están en
[`src/test/msw/handlers.ts`](src/test/msw/handlers.ts) y las fixtures en
[`src/test/msw/fixtures.ts`](src/test/msw/fixtures.ts).

### Contrato con el backend

| Method | Path | Quién lo consume |
| ------ | ---- | ---------------- |
| `GET` | `/api/health` | `useHealth` (badge en header) |
| `GET/POST` | `/api/auth/spotify/setup` | `useSpotifySetup` (credenciales persistidas) |
| `POST` | `/api/auth/spotify` | `useSpotifyAuth` → redirige a `accounts.spotify.com` |
| `DELETE` | `/api/auth/spotify` | Botón desconectar en Connect |
| `POST` | `/api/auth/ytmusic` | `useYTMusicAuth` (envía headers pegados) |
| `DELETE` | `/api/auth/ytmusic` | Botón desconectar en Connect |
| `GET` | `/api/playlists` | `usePlaylists` |
| `GET` | `/api/albums` | `useAlbums` |
| `POST` | `/api/migrate` | `useStartMigration` (devuelve `{ jobId }`) |
| `WS` | `/api/migrate/{jobId}/events` | `useMigrationEvents` (eventos tipados → reducer) |
| `GET` | `/api/reports` | `useReports` |
| `GET` | `/api/reports/:id` | `useReport` |

Los tipos del backend se generan desde `/openapi.json` en
[`src/types/api.gen.ts`](src/types/api.gen.ts) via `pnpm gen:api`.
[`src/types/api.ts`](src/types/api.ts) re-exporta los generados y
mantiene a mano sólo los tipos de eventos WS.

## Tests

```bash
pnpm test:run
```

258+ tests en este momento (suite completa frontend). Los tests de hooks
con WebSocket usan un mock `MockWebSocket` definido en cada archivo —
mira `useMigrationEvents.test.tsx` como referencia.

## Accesibilidad

- Skip-link "Ir al contenido principal" en `AppShell`.
- `<main role="main">` con focus trap manejado por hooks dedicados.
- `aria-current="page"` en navegación, `aria-live="polite"` en el log
  de eventos, `role="tablist"` en Library con keyboard navigation
  (←/→ entre tabs).
- `ConnectionBadge` distingue estados con icono + color (no solo color)
  para cumplir WCAG 1.4.1.
