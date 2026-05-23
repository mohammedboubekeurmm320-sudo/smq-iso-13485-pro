#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

echo "[QMS] Installing dependencies..."
bun install 2>/dev/null || npm install 2>/dev/null

echo "[QMS] Setting up database..."
bun run db:push 2>/dev/null || true

echo "[QMS] Starting Next.js dev server on port 3000..."
exec npx next dev -p 3000 -H 0.0.0.0
