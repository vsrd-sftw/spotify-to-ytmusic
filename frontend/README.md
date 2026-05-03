# Frontend

Web UI for `spotify-to-ytmusic`. Talks to the FastAPI backend in `../backend` over HTTP + WebSockets.

## Recommended stack

- **Vite** + **React** + **TypeScript**
- **TailwindCSS** for styling
- **TanStack Query** for HTTP state
- Native WebSocket for live migration progress

## Bootstrap (when you're ready)

```bash
cd frontend
npm create vite@latest . -- --template react-ts
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

## Backend contract (planned)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Liveness probe |
| `POST` | `/api/auth/spotify` | Trigger Spotify OAuth |
| `POST` | `/api/auth/ytmusic` | Submit pasted browser headers |
| `GET` | `/api/playlists` | List user's Spotify playlists |
| `GET` | `/api/albums` | List user's saved Spotify albums |
| `POST` | `/api/migrate` | Start migration (returns job id) |
| `WS` | `/api/migrate/{job_id}/events` | Stream `MigrationEvent`s |
| `GET` | `/api/reports` | List previous reports |
| `GET` | `/api/reports/{id}` | Fetch a report |

The backend's `Migrator` already emits typed events via `on_event` callback — the WebSocket endpoint just forwards them as JSON.
