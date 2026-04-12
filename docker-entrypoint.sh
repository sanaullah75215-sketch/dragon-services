#!/bin/sh
set -e

echo "================================================"
echo " Dragon Services Bot - Starting up"
echo "================================================"

# Push schema (safe to run every time - creates tables if missing)
echo "[1/3] Setting up database schema..."
npx drizzle-kit push --force 2>&1 | tail -5

# Import data using psql (migration SQL uses ON CONFLICT DO NOTHING - safe to run every time)
if [ -f "/app/dragon-services-migration.sql" ]; then
  echo "[2/3] Importing data (skips duplicates)..."
  psql "$DATABASE_URL" -f /app/dragon-services-migration.sql -q && echo "     Done!"
else
  echo "[2/3] No migration file found - skipping data import"
fi

echo "[3/3] Starting bot..."
exec node dist/index.js
