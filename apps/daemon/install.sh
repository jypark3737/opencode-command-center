#!/usr/bin/env bash
set -euo pipefail

# OpenCode Command Center — Agent Daemon Install Script
# Usage: curl -fsSL https://your-server/install.sh | bash
# Or with env vars:
# COMMAND_CENTER_URL=wss://... COMMAND_CENTER_API_KEY=... DEVICE_ID=... DEVICE_NAME=... bash install.sh

echo "🎯 OpenCode Command Center — Agent Daemon Installer"
echo ""

# Check for required env vars
if [ -z "${COMMAND_CENTER_URL:-}" ]; then
  read -p "Command Center URL (e.g. wss://your-app.railway.app/ws): " COMMAND_CENTER_URL
fi

if [ -z "${COMMAND_CENTER_API_KEY:-}" ]; then
  read -p "API Key: " COMMAND_CENTER_API_KEY
fi

if [ -z "${DEVICE_ID:-}" ]; then
  DEVICE_ID=$(cat /proc/sys/kernel/random/uuid 2>/dev/null || uuidgen 2>/dev/null || date +%s)
  echo "Generated Device ID: $DEVICE_ID"
fi

if [ -z "${DEVICE_NAME:-}" ]; then
  DEVICE_NAME=$(hostname)
  echo "Using hostname as device name: $DEVICE_NAME"
fi

# Check for bun
if ! command -v bun &> /dev/null; then
  echo "Installing Bun..."
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"
fi

# Create daemon directory
DAEMON_DIR="$HOME/.opencode-daemon"
mkdir -p "$DAEMON_DIR"

# Write .env file
cat > "$DAEMON_DIR/.env" << EOF
COMMAND_CENTER_URL=$COMMAND_CENTER_URL
COMMAND_CENTER_API_KEY=$COMMAND_CENTER_API_KEY
DEVICE_ID=$DEVICE_ID
DEVICE_NAME=$DEVICE_NAME
PROJECTS=[]
EOF

echo ""
echo "✅ Configuration saved to $DAEMON_DIR/.env"
echo ""
echo "Edit $DAEMON_DIR/.env to add your projects:"
echo '  PROJECTS=[{"path":"/path/to/project","name":"My Project"}]'
echo ""
echo "To start the daemon:"
echo "  cd /path/to/opencode-command-center && DEVICE_ID=$DEVICE_ID bun run apps/daemon/src/index.ts"
echo ""
echo "Or with Docker:"
echo "  docker run -d --env-file $DAEMON_DIR/.env opencode-cc-daemon"
