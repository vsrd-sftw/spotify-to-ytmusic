#!/bin/bash
# Skill: Resolver issue del proyecto
# Uso: /resolve-issue <numero_issue> [numeros...]

if [ -z "$1" ]; then
  echo "Usage: resolve-issue <issue_number> [issue_numbers...]"
  exit 1
fi

REPO="vsrd-sftw/spotify-to-ytmusic"

# 1. Leer las issues
echo "=== Leyendo issues ==="
for issue in "$@"; do
  gh issue view "$issue" --repo "$REPO"
  echo "---"
done

# 2. Analizar - preguntar al usuario qué hacer
echo ""
echo "=== Analizado. Qué implementación propones? ==="