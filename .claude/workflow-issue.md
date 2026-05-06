# Workflow: Resolver Issues del Proyecto

## Pasos realizados para issues #12, #13, #14

### 1. Leer las issues

```bash
# Ver issues en el repo
gh issue view 12 --repo vsrd-sftw/spotify-to-ytmusic
gh issue view 13 --repo vsrd-sftw/spotify-to-ytmusic
gh issue view 14 --repo vsrd-sftw/spotify-to-ytmusic
```

### 2. Analizar lo que hay que hacer

- Leer CLAUDE.md para entender el proyecto
- Revisar código existente para seguir convenciones
- Identificar dependencias entre issues
- Verificar estado limpio: `cd frontend; pnpm lint && pnpm build && pnpm test:run`

### 3. Crear rama de trabajo

```bash
git checkout -b feat/<nombre-rama>
```

### 4. Implementar

Seguir la Definition of Done del proyecto:
- Criterios de aceptación de la issue
- SOLID + clean code
- Tests existentes y passando
- Arquitectural fit (no print desde core/, reuse clientes existentes, etc.)

### 5. Verificar CI localmente

Antes de crear PR, ejecutar para confirmar que el CI pasará:
```bash
cd frontend
pnpm lint && pnpm build && pnpm test:run
```

### 6. Commit y PR

```bash
# Stage archivos
git add <archivos>

# Commit con mensaje Conventional Commits
git commit -m "feat(<scope>): descripción

- descripción del cambio 1
- descripción del cambio 2"

# Push rama
git push -u origin feat/<nombre-rama>

# Crear PR con campo Fix para cerrar issues automáticamente
gh pr create --title "feat(<scope>): descripción" --body "## Summary
- Fix #XX: descripción de la issue
- Fix #YY: descripción de otra issue
## Changes
- archivos/modificaciones
## Verification
- pnpm lint passes
- pnpm build passes
- pnpm test:run passes"
```

**Importante**: Usar `Fix #XX` en el cuerpo de la PR para que las issues se marquen como cerradas automáticamente en el proyecto.

## Gotchas encontradas

- **Fast Refresh**: No exportar hooks y providers en el mismo archivo. Separar:
  - `*ContextValue.ts`: solo el createContext
  - `*Context.tsx`: solo el Provider
  - `use*.ts`: el hook
- **pnpm**: Usar `pnpm` no `npm` según CLAUDE.md
- **Tests**: Ejecutar antes de commit con `pnpm test:run`
- **Build**: Verificar con `pnpm build` antes de push