#!/bin/bash
# Dragon Services - Automatic Database Backup Script
# Saves daily backups, keeps last 7 days

BACKUP_DIR="/opt/dragon-services/backups"
COMPOSE_DIR="/opt/dragon-services"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/dragon_services_$TIMESTAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

# Find the db container name
DB_CONTAINER=$(docker ps --filter "name=dragon-services-db" --format "{{.Names}}" | head -1)

if [ -z "$DB_CONTAINER" ]; then
  echo "[$(date)] ERROR: DB container not found - is the bot running?"
  exit 1
fi

# Dump and compress
docker exec "$DB_CONTAINER" pg_dump -U dragonbot dragon_services | gzip > "$BACKUP_FILE"

SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "[$(date)] Backup saved: $BACKUP_FILE ($SIZE)"

# Keep only last 7 backups
DELETED=$(ls -t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | tail -n +8)
if [ -n "$DELETED" ]; then
  echo "$DELETED" | xargs rm
  echo "[$(date)] Old backups removed"
fi
