Sigue este procedimiento exacto para resolver las issues $ARGUMENTS del repositorio vsrd-sftw/spotify-to-ytmusic:

## 1. Entrar en plan mode

Usa la herramienta EnterPlanMode antes de hacer cualquier otra cosa.

## 2. Leer las issues

Para cada número en $ARGUMENTS, ejecuta:
```
gh issue view <número> --repo vsrd-sftw/spotify-to-ytmusic
```

## 3. Generar un plan

Dentro del plan mode, analiza las issues y elabora un plan detallado:
- Qué archivos hay que crear o modificar
- Qué tests hay que escribir
- Cómo encaja con la arquitectura existente (CLAUDE.md)
- Orden de implementación

Sal del plan mode con ExitPlanMode y pide confirmación antes de continuar.

## 4. Crear rama

Crea una rama con nombre descriptivo siguiendo el patrón `feat/<scope>-<descripción-corta>` o `fix/<scope>-<descripción-corta>`:
```
git checkout -b <nombre-rama>
```

## 5. Implementar

Trabaja issue a issue siguiendo el plan. Respeta el Definition of Done del CLAUDE.md:
- Sin `print()` en `core/`, usar eventos
- Tests para todo comportamiento nuevo; tests de regresión para bugs
- Tunables en `config.py`, no hardcodeados
- No bootstrapear el servidor FastAPI ni el frontend salvo que la issue lo pida explícitamente

## 6. Comprobar tests

Ejecuta los tests y asegúrate de que todos pasan:
- Backend: `pytest` desde `backend/`
- Frontend: `pnpm exec vitest run` desde `frontend/` (si hay cambios en frontend)

No sigas si hay tests en rojo.

## 7. Comprobar si el CI pasaría

Revisa el workflow de CI ejecutando localmente lo que haría el pipeline:
```
gh workflow list --repo vsrd-sftw/spotify-to-ytmusic
```
Identifica los pasos (lint, type-check, tests) y ejecútalos. Si algo falla, corrígelo antes de continuar.

## 8. Commit y push

Agrupa los cambios en un commit por issue (o uno conjunto si están muy ligadas). Usa Conventional Commits con scope:
```
git add <archivos específicos>
git commit -m "feat(<scope>): <descripción corta>

<detalle si es necesario>"
git push -u origin <nombre-rama>
```

## 9. Crear PR

Crea la PR con:
```
gh pr create --title "<tipo>(<scope>): <descripción>" --body "..."
```

El body debe seguir exactamente esta estructura (sin mencionar Claude ni herramientas de IA):

```
## Summary

- Bullet point por cambio relevante

## Closes

Closes #<número1>, Closes #<número2>

## Test plan

- [ ] Ítem de verificación manual o automatizada
```

El campo `Closes #N` hace que GitHub cierre las issues automáticamente al mergear.
