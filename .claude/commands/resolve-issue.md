Sigue este procedimiento exacto para resolver las issues $ARGUMENTS del repositorio vsrd-sftw/spotify-to-ytmusic.

**Antes de empezar:** lee `CLAUDE.md` y `CONTRIBUTING.md` si no los tienes en contexto. La sección "Roadmap state" de `CLAUDE.md` y los gotchas son obligatorios — son el resultado de auditorías y cambios que hicimos en sprints anteriores y siguen siendo el contrato del proyecto.

## 1. Entrar en plan mode

Usa la herramienta EnterPlanMode antes de hacer cualquier otra cosa. Si vas a tocar varios bloques (frontend + backend, varias áreas), prefiere planificar todo junto antes de implementar — ahorra rondas de revisión.

## 2. Leer las issues

Para cada número en $ARGUMENTS:

```
gh issue view <número> --repo vsrd-sftw/spotify-to-ytmusic
```

Y, si la issue cita dependencias (`Dependencias: #N`), léelas también — aunque ya estén cerradas, suelen documentar decisiones que afectan al diseño actual. La existencia de un campo no significa que esté implementado: verifica en el código antes de asumir.

## 3. Verificar el estado real del repo

Las issues describen lo que **debería** existir, no lo que existe. Antes de planificar, comprueba:

- Issues vecinas ya cerradas en el área que tocas (`gh issue list --state closed --limit 20 --json number,title --search "<area>"`).
- Archivos que la issue dice que vas a crear: si ya existen, alguien empezó — entiende qué hay antes de pisarlo.
- `git log -20 --oneline` y `git log --grep="<scope>" --oneline` para ver si hay commits recientes relacionados.

Esta verificación evita reescribir trabajo ya hecho y detecta drift entre la issue y la realidad.

## 4. Generar un plan

Dentro del plan mode, elabora un plan detallado:

- **Archivos a crear/modificar** con paths concretos.
- **Tests**: para feature, tests unitarios del happy path + casos límite. Para fix, test de regresión que falle antes y pase después.
- **Encaje arquitectónico** según `CLAUDE.md`:
  - Backend `core/` no hace `print()` — emite `MigrationEvent`.
  - Reusa `SpotifyClient` / `YTMusicClient` / `TrackCache`. Nada de `spotipy`/`ytmusicapi` directos en código nuevo.
  - Tunables en `core/config.py`.
  - Frontend: selección via `SelectionContext`, navegación via react-router-dom, focus via `useAutoFocusHeading`, fetch via `lib/http.ts`.
  - **No bootstrappees** `api/` (FastAPI) ni el frontend salvo que la issue lo pida.
- **Gotchas relevantes**: revisa la sección de `CLAUDE.md` y comprueba si tu cambio toca alguna (forma del payload de Spotify, `duplicates=True`, retry-on-empty-body, MSW path patterns, cierre limpio de WS, taxonomía de errores YT, etc.).
- **Orden de implementación**: si una issue depende de otra y vas a hacer ambas, decide qué se hace antes y por qué.

Sal del plan mode con ExitPlanMode y **pide confirmación** al usuario antes de continuar. No empieces a tocar archivos hasta que confirme.

## 5. Crear rama

Patrón obligatorio:

- `feat/<scope>-<descripción-corta>` para features
- `fix/<scope>-<descripción-corta>` para bugs
- `chore/<scope>-<descripción-corta>` para chores
- `refactor/<scope>-<descripción-corta>` para refactors

Si vas a resolver varias issues en una sola PR (acumular hardening, completar un epic), usa `feat/<scope>-batch-<rangos>` (ej. `feat/frontend-batch-58-62`).

```
git checkout -b <nombre-rama>
```

Verifica que partes de `main` actualizado: `git fetch origin && git checkout main && git pull && git checkout -b …`.

## 6. Implementar

Trabaja issue a issue siguiendo el plan. Reglas innegociables:

- **Definition of Done** del CLAUDE.md / CONTRIBUTING.md aplica entero.
- **Strings de la CLI en español**, código y comentarios en inglés.
- **Conventional Commits con scope** (`feat(cli)`, `fix(ytmusic)`, `chore(frontend)`, …).
- **Sin comentarios que repiten el código**. Solo comentarios cuando expliquen un porqué no obvio (los gotchas de CLAUDE.md son el listón).
- **Sin abstracciones prematuras**. Tres líneas similares > una abstracción que aún no se necesita.

Si descubres algo que la issue no cubre pero es necesario para no dejar el código a medias, **dilo** (en la PR o en el chat) en vez de hacerlo silenciosamente.

## 7. Comprobar tests

Antes de commitear, **todo verde**:

- **Backend** (si tocaste backend):
  ```bash
  cd backend && pytest
  ```
- **Frontend** (si tocaste frontend):
  ```bash
  cd frontend && pnpm test:run
  ```
- **Lint y format frontend** (CI los corre):
  ```bash
  cd frontend && pnpm lint && pnpm format:check
  ```
- **Build frontend** (asegura que el `tsc -b` pasa):
  ```bash
  cd frontend && pnpm build
  ```

Si hay rojo, **no continues**. Diagnostica y arregla. No pongas `// @ts-ignore`, no comentes tests, no uses `--no-verify` en commits.

## 8. Comprobar el CI manualmente

```
gh workflow list --repo vsrd-sftw/spotify-to-ytmusic
```

Identifica el workflow del área tocada (frontend/backend). Si lo que el workflow corre no coincide con lo que has corrido tú localmente, replícalo. Es más barato fallar local que ver el rojo en GitHub.

## 9. Commit y push

Un commit por issue cuando estén bien delimitadas; un commit por bloque coherente cuando varias issues vayan juntas (ej. "frontend hardening batch"). **Mensaje en inglés, en imperativo**:

```bash
git add <archivos específicos>     # nunca "git add ."
git commit -m "feat(<scope>): <descripción corta en imperativo>

<cuerpo opcional explicando el porqué>"
git push -u origin <nombre-rama>
```

Si el cuerpo es multilínea, usa heredoc:

```bash
git commit -m "$(cat <<'EOF'
feat(scope): short summary

Why this change exists, not what it does. Reference the issue if useful.
Mention any decisions you made that diverge from the issue's plan.
EOF
)"
```

**Nunca** uses `Co-Authored-By: Claude` ni menciones IA en el commit/PR.

## 10. Crear PR

```
gh pr create --title "<tipo>(<scope>): <descripción>" --body "..."
```

El body sigue **exactamente** esta estructura:

```markdown
## Summary

- Bullet por cambio relevante (qué cambia, no cómo)
- Si hay decisiones de diseño que diverjan de la issue, anótalas aquí

## Closes

Closes #<n1>, Closes #<n2>

## Test plan

- [ ] `pytest` desde `backend/` en verde (si tocó backend)
- [ ] `pnpm test:run` en `frontend/` en verde (si tocó frontend)
- [ ] `pnpm lint && pnpm format:check && pnpm build` en `frontend/` en verde
- [ ] Verificación manual: <comando o pasos concretos para probarlo>
```

Cada `Closes #N` cierra la issue automáticamente al mergear. **Una línea por issue cerrada**, no las metas en una sola línea con comas.

No menciones a Claude ni a herramientas de IA en el PR.

## 11. Tras crear la PR

1. Devuelve la URL de la PR al usuario.
2. Si CI falla, **investígalo y arréglalo en la misma rama** — no abras una PR nueva.
3. Si los criterios de aceptación de la issue requieren verificación manual con el backend real, déjalo claro en el "Test plan" como bloqueante hasta que el server FastAPI exista (issues #67–#70).

## Cuándo escalar / parar

Para y consulta antes de continuar si:

- La issue contradice la arquitectura actual (`CLAUDE.md`) y no estás seguro de cuál tiene razón.
- Encuentras un bug grave fuera del scope que bloquea la issue. Documéntalo y pregunta antes de mezclar fixes.
- El alcance real de la issue resulta ser mucho mayor de lo que el body sugería. Mejor abrir una segunda issue que entregar algo a medias.

## Anti-patrones que ya nos hemos encontrado

No los repitas:

- `except Exception: return None` en `ytmusic_client.py` — ya hubo una issue (#63) específica para arrancar eso. Si caes en la tentación, pregúntate si lo que tienes delante es transient o fatal.
- `useState(new Set())` para selección en una página — la selección vive en `SelectionContext` (#58). Crear nuevo estado local rompe el flujo Library → Migrate.
- `useEffect(() => { document.querySelector('h2')?.focus() })` global en `App.tsx` — el focus va por página con `useAutoFocusHeading` (#60).
- WebSocket que reconecta en cualquier `onclose` — el cierre limpio (1000/1005/wasClean) se considera final. Reconectar en cierre limpio causó un bucle infinito en migración con MSW.
- Importar `fetch` directamente desde un feature — ve por `lib/http.ts` para heredar el timeout de 15 s.
- Crear archivos de planificación / docs intermedios sin que el usuario los pida — trabaja desde el chat y los archivos de código.
