#!/bin/sh
set -e

echo "================================================"
echo " Dragon Services Bot - Starting up"
echo "================================================"

# Initial schema setup (first run only)
echo "[1/3] Setting up database schema..."
TABLE_EXISTS=$(psql "$DATABASE_URL" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'gp_rates')" 2>/dev/null | tr -d ' \n')

if [ "$TABLE_EXISTS" = "t" ]; then
  echo "     Tables found - syncing schema changes..."
  npx drizzle-kit push --force 2>&1 | tail -5 || true
  echo "     Schema sync done!"
else
  echo "     First run - creating tables..."
  psql "$DATABASE_URL" -f /app/migrations/0000_init.sql 2>&1 | grep -v "^$" || true
  npx drizzle-kit push --force 2>&1 | tail -5 || true
  echo "     Done!"
fi

# Import data using psql (migration SQL uses ON CONFLICT DO NOTHING - safe to run every time)
if [ -f "/app/dragon-services-migration.sql" ]; then
  echo "[2/3] Importing data (skips duplicates)..."
  psql "$DATABASE_URL" -f /app/dragon-services-migration.sql -q && echo "     Done!"
else
  echo "[2/3] No migration file found - skipping data import"
fi

echo "[3/3] Starting bot..."
exec node dist/index.js
