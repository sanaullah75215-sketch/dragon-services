#!/bin/bash
set -e

REPO_URL="https://github.com/sanaullah75215-sketch/dragon-services.git"
INSTALL_DIR="/opt/dragon-services"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║    Dragon Services Bot - VPS Installer   ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ─── STEP 1: Install Docker if missing ───────────────────────────────────────
if ! command -v docker &> /dev/null; then
  echo "📦 Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  echo "✅ Docker installed"
else
  echo "✅ Docker already installed ($(docker --version))"
fi

if ! docker compose version &> /dev/null 2>&1; then
  echo "📦 Installing Docker Compose plugin..."
  apt-get install -y docker-compose-plugin 2>/dev/null || true
fi

# ─── STEP 2: Install git if missing ──────────────────────────────────────────
if ! command -v git &> /dev/null; then
  echo "📦 Installing git..."
  apt-get install -y git 2>/dev/null || yum install -y git 2>/dev/null || true
fi

# ─── STEP 3: Backup database before doing anything (existing installs only) ───
if [ -d "$INSTALL_DIR/.git" ]; then
  echo ""
  echo "💾 Backing up database before update..."
  DB_CONTAINER=$(docker ps --filter "name=dragon-services-db" --format "{{.Names}}" | head -1)
  if [ -n "$DB_CONTAINER" ]; then
    mkdir -p "$INSTALL_DIR/backups"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$INSTALL_DIR/backups/dragon_services_$TIMESTAMP.sql.gz"
    docker exec "$DB_CONTAINER" pg_dump -U dragonbot dragon_services | gzip > "$BACKUP_FILE"
    SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
    echo "✅ Backup saved: $BACKUP_FILE ($SIZE)"
    echo "   (Restore with: gunzip -c $BACKUP_FILE | docker exec -i $DB_CONTAINER psql -U dragonbot dragon_services)"
  else
    echo "⚠️  Bot not running - skipping backup (no data to lose on first install)"
  fi
fi

# ─── STEP 4: Clone or update the repo ────────────────────────────────────────
echo ""
if [ -d "$INSTALL_DIR/.git" ]; then
  echo "📂 Updating existing installation in $INSTALL_DIR..."
  cd "$INSTALL_DIR"
  git pull origin main
else
  echo "📂 Downloading Dragon Services bot to $INSTALL_DIR..."
  git clone "$REPO_URL" "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi
echo "✅ Code ready"

# ─── STEP 4: Configuration ───────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ ! -f "$INSTALL_DIR/.env" ]; then
  # ── Fresh install: ask for everything ──────────────────────────────────────
  echo "Fresh install - need a few values to get started."
  echo ""

  echo "1) Discord Bot Token"
  echo "   (From: discord.com/developers → Your App → Bot → Token)"
  echo ""
  read -p "   Paste token here: " BOT_TOKEN < /dev/tty
  echo ""

  echo "2) Database Password"
  echo "   (Make up any strong password - only used internally)"
  echo ""
  read -p "   Enter a password: " DB_PASS < /dev/tty
  echo ""

  AUTO_SECRET=$(cat /proc/sys/kernel/random/uuid 2>/dev/null || echo "dragon-$(date +%s%N)")

  echo "3) Dashboard Password (RECOMMENDED)"
  echo "   Protects the web admin panel from unauthorized access."
  echo "   Leave blank to skip (not recommended)."
  echo ""
  read -p "   Dashboard password (or ENTER to skip): " DASH_PASS < /dev/tty
  echo ""

  cat > "$INSTALL_DIR/.env" <<EOF
DISCORD_BOT_TOKEN=${BOT_TOKEN}
DB_PASSWORD=${DB_PASS}
SESSION_SECRET=${AUTO_SECRET}
EOF

  if [ -n "$DASH_PASS" ]; then
    echo "DASHBOARD_PASSWORD=${DASH_PASS}" >> "$INSTALL_DIR/.env"
    echo "✅ Dashboard password set"
  fi

  echo "✅ Config saved"

else
  # ── Existing install: NEVER touch DB_PASSWORD (would break the database) ───
  echo "✅ Existing config found - keeping all settings (data is safe)"
  echo ""

  # Offer to set/update dashboard password only
  CURRENT_DASH=$(grep "^DASHBOARD_PASSWORD=" "$INSTALL_DIR/.env" | cut -d= -f2- || true)
  if [ -n "$CURRENT_DASH" ]; then
    echo "   Dashboard password is currently SET."
    read -p "   Change dashboard password? (y/N): " CHANGE_DASH < /dev/tty
    if [[ "$CHANGE_DASH" == "y" || "$CHANGE_DASH" == "Y" ]]; then
      read -p "   New dashboard password: " DASH_PASS < /dev/tty
      # Remove old line and add new one
      sed -i '/^DASHBOARD_PASSWORD=/d' "$INSTALL_DIR/.env"
      echo "DASHBOARD_PASSWORD=${DASH_PASS}" >> "$INSTALL_DIR/.env"
      echo "✅ Dashboard password updated"
    fi
  else
    echo "   Dashboard password is NOT set (dashboard is open to anyone)."
    read -p "   Set a dashboard password now? (Y/n): " SET_DASH < /dev/tty
    if [[ "$SET_DASH" != "n" && "$SET_DASH" != "N" ]]; then
      read -p "   Dashboard password: " DASH_PASS < /dev/tty
      if [ -n "$DASH_PASS" ]; then
        echo "DASHBOARD_PASSWORD=${DASH_PASS}" >> "$INSTALL_DIR/.env"
        echo "✅ Dashboard password set"
      fi
    fi
  fi
fi

# ─── STEP 5: Firewall setup (UFW) ────────────────────────────────────────────
echo ""
echo "🔒 Checking firewall..."
if command -v ufw &> /dev/null; then
  # Allow SSH so we don't lock ourselves out
  ufw allow 22/tcp > /dev/null 2>&1 || true
  # Allow the dashboard port
  ufw allow 5000/tcp > /dev/null 2>&1 || true
  # Enable if not already active
  if ! ufw status | grep -q "Status: active"; then
    echo "y" | ufw enable > /dev/null 2>&1 || true
    echo "✅ Firewall enabled (SSH + port 5000 allowed)"
  else
    echo "✅ Firewall already active"
  fi
else
  echo "⚠️  UFW not found - skipping firewall setup"
fi

# ─── STEP 6: Stop old containers, rebuild and start ──────────────────────────
echo ""
echo "🛑 Stopping any old containers..."
cd "$INSTALL_DIR"
docker compose down --remove-orphans 2>/dev/null || true

echo ""
echo "🔨 Building and starting (takes ~2 min the first time)..."
echo ""
docker compose up -d --build --remove-orphans

# ─── STEP 7: Set up automatic daily database backups ─────────────────────────
echo ""
echo "💾 Setting up automatic daily backups..."
BACKUP_SCRIPT="$INSTALL_DIR/backup.sh"
chmod +x "$BACKUP_SCRIPT" 2>/dev/null || true

CRON_LINE="0 3 * * * $BACKUP_SCRIPT >> /var/log/dragon-backup.log 2>&1"
# Add cron job only if it doesn't already exist
if ! crontab -l 2>/dev/null | grep -q "$BACKUP_SCRIPT"; then
  (crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
  echo "✅ Daily backup scheduled at 3:00 AM (keeps last 7 days)"
  echo "   Backup folder: $INSTALL_DIR/backups/"
  echo "   Backup log:    /var/log/dragon-backup.log"
else
  echo "✅ Backup cron job already set up"
fi

# ─── STEP 8: Wait and confirm ────────────────────────────────────────────────
echo ""
echo "⏳ Starting up..."
sleep 12

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║           ✅ Bot is running!             ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  Useful commands:"
echo "  • View logs:    docker compose -f $INSTALL_DIR/docker-compose.yml logs -f"
echo "  • Stop bot:     docker compose -f $INSTALL_DIR/docker-compose.yml down"
echo "  • Restart bot:  docker compose -f $INSTALL_DIR/docker-compose.yml restart app"
echo "  • Update bot:   curl -fsSL https://raw.githubusercontent.com/sanaullah75215-sketch/dragon-services/main/install.sh | bash"
echo "  • Manual backup: $INSTALL_DIR/backup.sh"
echo ""
echo "  Web dashboard:  http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo 'your-vps-ip'):5000"
echo ""

docker compose logs --tail=20 app
