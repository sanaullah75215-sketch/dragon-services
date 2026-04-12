#!/bin/bash
set -e

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
  apt-get install -y docker-compose-plugin 2>/dev/null || \
  curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m)" \
    -o /usr/local/bin/docker-compose && chmod +x /usr/local/bin/docker-compose
fi

# ─── STEP 2: Ask for the 3 required values ───────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  3 values needed to run your bot:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# If .env already exists, ask if they want to reconfigure
if [ -f ".env" ]; then
  read -p "⚠️  .env file already exists. Reconfigure? (y/N): " RECONFIG
  if [[ "$RECONFIG" != "y" && "$RECONFIG" != "Y" ]]; then
    echo "Keeping existing .env - skipping to startup..."
    BOT_TOKEN="skip"
  fi
fi

if [ -z "$BOT_TOKEN" ]; then
  echo "1) Discord Bot Token"
  echo "   (From: https://discord.com/developers/applications → Your App → Bot → Token)"
  echo ""
  read -p "   Paste token here: " BOT_TOKEN
  echo ""

  echo "2) Database Password"
  echo "   (Make up any password - it's only used internally)"
  echo ""
  read -p "   Enter password: " DB_PASS
  echo ""

  echo "3) Session Secret"
  echo "   (Make up any long random string - used for security)"
  echo ""
  # Auto-generate one if they just press enter
  AUTO_SECRET=$(cat /proc/sys/kernel/random/uuid 2>/dev/null || echo "dragon-secret-$(date +%s)-$(whoami)")
  read -p "   Press ENTER to auto-generate, or type your own: " SESSION_SECRET
  if [ -z "$SESSION_SECRET" ]; then
    SESSION_SECRET="$AUTO_SECRET"
    echo "   Generated: $SESSION_SECRET"
  fi
  echo ""

  # ─── STEP 3: Write the .env file ─────────────────────────────────────────
  cat > .env <<EOF
DISCORD_BOT_TOKEN=${BOT_TOKEN}
DB_PASSWORD=${DB_PASS}
SESSION_SECRET=${SESSION_SECRET}
EOF
  echo "✅ .env file created"
fi

# ─── STEP 4: Stop any old containers cleanly ─────────────────────────────────
echo ""
echo "🛑 Stopping any existing containers..."
docker compose down 2>/dev/null || true

# ─── STEP 5: Build and start everything ──────────────────────────────────────
echo ""
echo "🔨 Building and starting (this takes ~2 minutes the first time)..."
echo ""
docker compose up -d --build

# ─── STEP 6: Wait for bot to come online ─────────────────────────────────────
echo ""
echo "⏳ Waiting for bot to start..."
sleep 10

# ─── DONE ────────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║           ✅ Bot is running!             ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  Useful commands:"
echo "  • View logs:    docker compose logs -f"
echo "  • Stop bot:     docker compose down"
echo "  • Restart bot:  docker compose restart app"
echo "  • Update bot:   git pull && docker compose up -d --build"
echo ""
echo "  Web dashboard:  http://$(hostname -I | awk '{print $1}'):5000"
echo ""

docker compose logs --tail=20 app
