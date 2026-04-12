#!/bin/sh
set -e

echo "================================================"
echo " Dragon Services Bot - Starting up"
echo "================================================"

# Push schema using drizzle (creates all tables if missing, safe to run every time)
echo "[1/3] Setting up database schema..."
npm run db:push 2>&1 | tail -5 || echo "     Schema already up to date"

# Import data using psql (migration SQL uses ON CONFLICT DO NOTHING - safe to run every time)
if [ -f "/app/dragon-services-migration.sql" ]; then
  echo "[2/3] Importing data (skips duplicates)..."
  psql "$DATABASE_URL" -f /app/dragon-services-migration.sql -q && echo "     Done!"
else
  echo "[2/3] No migration file found - skipping data import"
fi

echo "[3/3] Starting bot..."
exec node dist/index.js
