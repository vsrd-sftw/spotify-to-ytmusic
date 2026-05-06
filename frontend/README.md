# Frontend

Interfaz web para `spotify-to-ytmusic`. Se comunica con el backend FastAPI en `../backend` via HTTP + WebSockets.

## Stack recomendado

- **Vite** + **React** + **TypeScript**
- **TailwindCSS** para estilos
- **TanStack Query** para estado HTTP
- WebSocket nativo para progreso en vivo de migraciones

## Inicio rápido

```bash
pnpm install
pnpm dev
```

Abre http://localhost:5173 en tu navegador.

## Scripts

| Script | Propósito |
| ------ | -------- |
| `pnpm dev` | Servidor de desarrollo con HMR |
| `pnpm build` | Build de producción |
| `pnpm lint` | Lint con ESLint |
| `pnpm format` | Format con Prettier |
| `pnpm format:check` | Verifica formato sin modificar |
| `pnpm test` | Tests en modo watch |
| `pnpm test:run` | Tests una vez |

## Mocks (MSW)

El proyecto usa **MSW** para mockear el backend durante desarrollo. Los mocks están en `src/test/msw/`.

### Cómo funcionan

En `src/main.tsx`, `enableMocking()` inicia el Service Worker solo en entorno de desarrollo:

```tsx
async function enableMocking() {
  if (!import.meta.env.DEV) return
  const { worker } = await import('@/test/msw/browser')
  await worker.start({ onUnhandledRequest: 'bypass' })
}
```

### Desactivar mocks

Cuando el backend FastAPI esté disponible, comenta o elimina la llamada a `enableMocking()` en `src/main.tsx`:

```tsx
// Desactivar cuando haya backend real:
// enableMocking().then(() => { ... })

// Mientras tanto:
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
)
```

### Cambiar el endpoint

Edita los handlers en `src/test/msw/handlers.ts` para apuntar al backend real cuando lo necesites.

## Tests

Ejecuta con:

```bash
pnpm test        # watch mode
pnpm test:run    # una vez
```

Los tests usan **Vitest** + **Testing Library**. Ver `src/test/setup.ts` para la configuración.

## Contrato con el backend

| Method | Path | Propósito |
| ------ | ---- | -------- |
| `GET` | `/api/health` | Liveness probe |
| `POST` | `/api/auth/spotify` | Trigger Spotify OAuth |
| `POST` | `/api/auth/ytmusic` | Submit browser headers |
| `GET` | `/api/playlists` | List playlists de Spotify |
| `GET` | `/api/albums` | List albums guardados |
| `POST` | `/api/migrate` | Iniciar migración |
| `WS` | `/api/migrate/{job_id}/events` | Stream de eventos |
| `GET` | `/api/reports` | List reportes |
| `GET` | `/api/reports/{id}` | Ver reporte |

El backend emite eventos tipados via `on_event` callback — el endpoint WebSocket los reenvía como JSON.