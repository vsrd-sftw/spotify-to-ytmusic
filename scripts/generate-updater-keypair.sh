#!/usr/bin/env bash
# Generate an Ed25519 keypair for the Tauri auto-updater.
#
# The private key must be stored in the repository secrets as
# ``TAURI_SIGNING_PRIVATE_KEY``. The public key must be copied into
# `frontend/src-tauri/tauri.conf.json` under `updater.pubkey`.
#
# Usage:
#   bash scripts/generate-updater-keypair.sh
#   bash scripts/generate-updater-keypair.sh -p password

set -euo pipefail

PASSWORD=""
while getopts "p:" opt; do
  case $opt in
    p) PASSWORD="$OPTARG" ;;
    *) echo "Usage: $0 [-p password]" >&2; exit 1 ;;
  esac
done

if command -v tauri >/dev/null 2>&1; then
  echo "TAURI_SIGNING_PRIVATE_KEY_PASSWORD=${PASSWORD:-}" tauri signer generate -f ~/.tauri/spotify-to-ytmusic.key
  cd frontend && pnpm tauri signer generate -p "${PASSWORD:-}"
else
  echo "Error: 'tauri' CLI not found. Install it with:"
  echo "  cargo install tauri-cli --version ^2"
  echo "Or use pnpm:"
  echo "  cd frontend && pnpm tauri signer generate"
  exit 1
fi

cat <<'EOF'

──────────────────────────────────────────────────────────────────────────────
  Paste this public key into frontend/src-tauri/tauri.conf.json:
    "updater.pubkey": "<public key here>"

  Add these secrets to your GitHub repository:
    TAURI_SIGNING_PRIVATE_KEY: <contents of the generated .key file>
    TAURI_SIGNING_PRIVATE_KEY_PASSWORD: <password used during generation, if any>
──────────────────────────────────────────────────────────────────────────────
EOF
