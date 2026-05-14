#!/bin/sh
set -e

echo "================================================"
echo " Dragon Services Bot - Starting up"
echo "================================================"

# Initial schema setup (first run only)
echo "[1/3] Setting up database schema..."
TABLE_EXISTS=$(psql "$DATABASE_URL" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'gp_rates')" 2>/dev/null | tr -d ' \n')

if [ "$TABLE_EXISTS" = "t" ]; then
  echo "     Tables found - applying safe schema patches..."

  # Patch: make quests.category nullable (was NOT NULL in earlier versions)
  psql "$DATABASE_URL" -c "
    DO \$\$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'quests' AND column_name = 'category' AND is_nullable = 'NO'
      ) THEN
        ALTER TABLE quests ALTER COLUMN category DROP NOT NULL;
        RAISE NOTICE 'Patched: quests.category is now nullable';
      END IF;
    END \$\$;
  " 2>&1 | grep -v "^$" || true

  # Patch: widen quest_pricing.price to numeric(20,2) to support billions of GP
  psql "$DATABASE_URL" -c "
    DO \$\$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'quest_pricing' AND column_name = 'price' AND numeric_precision = 10
      ) THEN
        ALTER TABLE quest_pricing ALTER COLUMN price TYPE numeric(20, 2);
        RAISE NOTICE 'Patched: quest_pricing.price widened to numeric(20,2)';
      END IF;
    END \$\$;
  " 2>&1 | grep -v "^$" || true

  # Patch: create tickets table if missing
  psql "$DATABASE_URL" -c "
    CREATE TABLE IF NOT EXISTS tickets (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_number integer,
      channel_id text NOT NULL UNIQUE,
      guild_id text NOT NULL,
      opened_by_user_id text NOT NULL,
      opened_by_username text NOT NULL,
      topic text,
      status text NOT NULL DEFAULT 'open',
      closed_by_user_id text,
      closed_by_username text,
      closed_at timestamp,
      scheduled_delete_at timestamp,
      channel_deleted boolean NOT NULL DEFAULT false,
      created_at timestamp NOT NULL DEFAULT now()
    );
  " 2>&1 | grep -v "^$" || true

  # Patch: add ticket_number column to existing tickets table
  psql "$DATABASE_URL" -c "
    ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ticket_number integer;
  " 2>&1 | grep -v "^$" || true

  echo "     Schema patches done!"
else
  echo "     First run - creating tables..."
  psql "$DATABASE_URL" -f /app/migrations/0000_init.sql 2>&1 | grep -v "^$" || true
  # Ensure quest_pricing.price starts wide enough
  psql "$DATABASE_URL" -c "ALTER TABLE quest_pricing ALTER COLUMN price TYPE numeric(20, 2);" 2>/dev/null || true
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
