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

# ─── STEP 3: Clone or update the repo ────────────────────────────────────────
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

# ─── STEP 4: Ask for the 3 required values ───────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  3 values needed to run your bot:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

SKIP_CONFIG=false
if [ -f "$INSTALL_DIR/.env" ]; then
  read -p "⚠️  Bot is already configured. Reconfigure? (y/N): " RECONFIG < /dev/tty
  if [[ "$RECONFIG" != "y" && "$RECONFIG" != "Y" ]]; then
    SKIP_CONFIG=true
    echo "Keeping existing config - updating bot..."
  fi
fi

if [ "$SKIP_CONFIG" = false ]; then
  echo "1) Discord Bot Token"
  echo "   (From: discord.com/developers → Your App → Bot → Token)"
  echo ""
  read -p "   Paste token here: " BOT_TOKEN < /dev/tty
  echo ""

  echo "2) Database Password"
  echo "   (Make up any password - only used internally)"
  echo ""
  read -p "   Enter a password: " DB_PASS < /dev/tty
  echo ""

  echo "3) Session Secret"
  echo "   (Press ENTER to auto-generate)"
  echo ""
  AUTO_SECRET=$(cat /proc/sys/kernel/random/uuid 2>/dev/null || echo "dragon-$(date +%s%N)")
  read -p "   Secret (ENTER to auto-generate): " SESSION_SECRET < /dev/tty
  if [ -z "$SESSION_SECRET" ]; then
    SESSION_SECRET="$AUTO_SECRET"
    echo "   Generated: $SESSION_SECRET"
  fi
  echo ""

  cat > "$INSTALL_DIR/.env" <<EOF
DISCORD_BOT_TOKEN=${BOT_TOKEN}
DB_PASSWORD=${DB_PASS}
SESSION_SECRET=${SESSION_SECRET}
EOF
  echo "✅ Config saved"
fi

# ─── STEP 5: Stop old containers, rebuild and start ──────────────────────────
echo ""
echo "🛑 Stopping any old containers..."
docker compose down --remove-orphans 2>/dev/null || true

echo ""
echo "🔨 Building and starting (takes ~2 min the first time)..."
echo ""
docker compose up -d --build --remove-orphans

# ─── STEP 6: Wait and confirm ────────────────────────────────────────────────
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
echo ""
echo "  Web dashboard:  http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo 'your-vps-ip'):5000"
echo ""

docker compose logs --tail=20 app
