#!/bin/sh
set -e
echo "[docker-start] Applying migrations..."
node dist/scripts/apply-pending-migrations.js || echo "[docker-start] Migration step failed — continuing startup"
echo "[docker-start] Starting server on port ${PORT:-3000}..."
exec node dist/_core/index.js
