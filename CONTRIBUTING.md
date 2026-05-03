# Cómo contribuir

Gracias por contribuir a `spotify-to-ytmusic`. Este documento describe las
reglas para que cualquier cambio — humano o asistido por IA — entre al
repo en condiciones.

Para contexto del proyecto y arquitectura, lee primero
[README.md](README.md), [backend/README.md](backend/README.md) y
[CLAUDE.md](CLAUDE.md) (este último es la guía corta que carga el agente,
y resume las mismas reglas que están aquí).

---

## Definition of Done

Una tarea **solo está hecha** cuando se cumplen **todas** las siguientes
condiciones. No hay excepciones silenciosas: si alguna no aplica, hay que
decirlo explícitamente en la PR.

### 1. Se cumplen los requisitos

- Cada criterio de aceptación de la issue está cubierto y verificado.
- Si la petición fue verbal, hay que reformular qué significa "hecho" y
  validar cada punto.
- No queda funcionalidad a medias ni TODOs sin issue asociada.

### 2. El código sigue principios SOLID y de clean code

- **Single Responsibility**: una clase o función hace una cosa. Si
  necesitas un "y" para describirla, divídela.
- **Open/Closed**: extensible sin modificar lo existente cuando tenga
  sentido — pero no inventes abstracciones por si acaso (YAGNI prima
  sobre OCP en código de aplicación).
- **Liskov / Interface Segregation / Dependency Inversion**: aplica
  cuando estés diseñando interfaces de verdad, no las fuerces.
- **Nombres**: claros, pronunciables, sin abreviaturas crípticas. Mejor
  `playlist_track_count` que `pltc`.
- **Funciones**: cortas, con un nivel de abstracción coherente. Si una
  función mezcla "leer config", "llamar API" y "formatear respuesta",
  extrae.
- **Sin código muerto**: nada de imports sin usar, variables huérfanas,
  ramas inalcanzables.
- **Sin comentarios que repiten el código**. Los comentarios solo se
  añaden cuando explican el **por qué**, no el **qué** (las gotchas en
  [CLAUDE.md](CLAUDE.md) son el ejemplo del nivel correcto).
- **Sin abstracciones prematuras**. Tres líneas similares son mejores
  que una abstracción que aún no necesitas.

### 3. El código tiene tests

- **Funcionalidad nueva**: tests unitarios que cubran el camino feliz y
  los casos límite relevantes.
- **Bug fix**: un test de regresión que **falle antes** del fix y pase
  después. Esto demuestra que el bug existía y que el fix lo arregla.
- **Cambios en `core/`**: tests aislados (mockear `spotipy` y
  `ytmusicapi`, no llamar a las APIs reales).
- **Comando para verificar** (desde `backend/`):

  ```bash
  pytest
  ```

  Debe estar en verde antes de marcar la tarea como hecha.
- **Cuándo es aceptable no añadir tests**: scripts de un solo uso, cambios
  puramente de docs, refactors mecánicos cubiertos ya por tests
  existentes. En cualquiera de esos casos, dilo en la descripción de la
  PR.
- **Frontend**: cuando el frontend tenga lógica testable (componentes con
  estado, hooks propios, utilidades), añadir tests con Vitest. Mientras
  sea solo scaffolding, no aplica.

### 4. El código respeta la arquitectura actual

La arquitectura está documentada en [CLAUDE.md](CLAUDE.md). En particular:

- **Capas separadas.** `core/` no hace `print()`. Emite un
  `MigrationEvent` ([core/events.py](backend/src/spotify_to_ytmusic/core/events.py))
  y deja que la CLI ([cli/__init__.py](backend/src/spotify_to_ytmusic/cli/__init__.py))
  lo renderice. Esto es lo que permitirá enchufar un transporte
  WebSocket más adelante sin tocar core.
- **Reutiliza los wrappers existentes.** `SpotifyClient`, `YTMusicClient`
  y `TrackCache` ya encapsulan retry/backoff, parsing y caché. No
  llames a `spotipy` o `ytmusicapi` directamente desde código nuevo.
- **Configuración centralizada.** Cualquier tunable (rate limits, paths,
  tamaños de chunk) va en
  [core/config.py](backend/src/spotify_to_ytmusic/core/config.py), no
  hardcodeado en el sitio donde se usa.
- **Modelos de dominio**: usa los dataclasses de
  [core/models.py](backend/src/spotify_to_ytmusic/core/models.py)
  (`Track`, `Playlist`, …) en vez de pasar dicts crudos de la API.
- **No bootstrappees** el frontend ni el módulo `api/` (FastAPI) salvo
  que la tarea lo pida explícitamente. El proyecto es CLI-only hoy.

---

## Reglas de proceso

### Issues

- Toda tarea no trivial empieza con una issue. Una sola fuente de verdad
  para qué hay que hacer y qué cuenta como hecho.
- Las issues llevan **criterios de aceptación** en formato checklist —
  ese checklist es lo que comprobará el Definition of Done.
- Etiquetas habituales: `area:backend`, `area:frontend`, `bug`, `feat`,
  `chore`, `scaffolding`, `ui`.

### Branches

- Trabajo directo en `main` aceptable solo para arreglos triviales
  (typos, comentarios, `chore` de dependencias menores).
- Cualquier cosa con lógica va en una rama: `feat/<slug>`, `fix/<slug>`,
  `chore/<slug>`. Mergear vía PR.

### Commits

- **Conventional Commits con scope**, igual que el historial actual:
  `feat(cli)`, `fix(ytmusic)`, `feat(cache)`, `feat(migrator)`,
  `chore(frontend)`, `docs`, etc.
- Mensaje en **inglés**, conciso, en imperativo: `add Prettier and
  integrate with ESLint`. El cuerpo (opcional) explica el **porqué**, no
  el qué.
- Un commit = un cambio coherente. Si tu PR mezcla refactor + feature +
  fix, sepáralos en commits.
- **Cierra issues desde el commit/PR**: `Closes #N`. Si una PR cierra
  varias, una línea por cada una.
- **No** añadas a Claude (ni a ninguna otra IA) como `Co-Authored-By`.

### Pull Requests

- Título: el mismo formato que un commit Conventional.
- Descripción mínima: **qué** cambia, **por qué**, y **cómo verificarlo**
  (comandos concretos: `pytest`, `pnpm lint`, etc.).
- Enlaza la(s) issue(s) que cierra.
- Antes de pedir review:
  - `pytest` en verde (cuando haya tests aplicables).
  - Si tocaste frontend: `pnpm lint`, `pnpm format:check`, `pnpm build`
    en verde.
  - Si tocaste backend: `ruff check backend/` sin errores nuevos.
- No mergees PRs con CI roja (cuando haya CI) ni con criterios de
  aceptación sin marcar.

### Force-push

- `--force-with-lease` solamente, nunca `--force`.
- Reescribir historia compartida (`main`) requiere acuerdo previo.

---

## Estilo y tono

- **Strings de la CLI en español.** Es intencional, mantén el tono.
  Mensajes de log internos / excepciones pueden ir en inglés.
- **Código y comentarios técnicos en inglés.** Los nombres de
  funciones/variables, docstrings y comentarios siguen la convención
  Python estándar (inglés).
- **Documentación de usuario** (READMEs, este archivo) en español si va
  dirigida al equipo; los READMEs técnicos del backend pueden ir en
  inglés si es lo que ya existe.

---

## Setup local rápido

```bash
# Backend (Python 3.11+)
pip install -e backend[dev]

# Auth de YT Music (la primera vez o cuando expira browser.json)
cd backend && python setup_ytmusic.py

# Tests
cd backend && pytest

# Frontend (cuando exista contenido real)
cd frontend && pnpm install
pnpm dev
```

Variables de entorno relevantes:

- `SPOTIFY_TO_YTMUSIC_DATA_DIR` — dónde vive `browser.json`, `.cache` y
  `track_cache.json` si no quieres depender del cwd.
- Credenciales de Spotify: ver [backend/README.md](backend/README.md).

---

## Cuando algo no encaja

Si una regla de este documento te impide hacer algo que tiene sentido,
**no la rompas en silencio**. Abre una issue (`chore: revisar regla X
en CONTRIBUTING.md`) y discútelo. El proceso se actualiza con el
proyecto.
