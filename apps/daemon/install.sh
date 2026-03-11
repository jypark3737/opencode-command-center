#!/usr/bin/env bash
set -euo pipefail

# OpenCode Command Center — Agent Daemon Install Script with Supervisord Persistence
# Usage: curl -fsSL https://raw.githubusercontent.com/your-repo/install.sh | bash
# Or:    bash install.sh [--uninstall]

DAEMON_DIR="/opt/opencode-daemon"
SUPERVISOR_CONF="/etc/supervisor/conf.d/opencode-daemon.conf"
LOG_DIR="/var/log"
ENV_FILE="$DAEMON_DIR/.env"

# ─── Colors ──────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ─── Uninstall ───────────────────────────────────────────────────────
if [ "${1:-}" = "--uninstall" ]; then
  info "Uninstalling OpenCode Daemon..."
  
  if command -v supervisorctl &>/dev/null; then
    supervisorctl stop opencode-daemon 2>/dev/null || true
    rm -f "$SUPERVISOR_CONF"
    supervisorctl reread 2>/dev/null || true
    supervisorctl update 2>/dev/null || true
  fi

  rm -rf "$DAEMON_DIR"
  rm -f "$LOG_DIR/opencode-daemon.log" "$LOG_DIR/opencode-daemon-error.log"
  
  info "OpenCode Daemon uninstalled."
  exit 0
fi

# ─── Banner ──────────────────────────────────────────────────────────
echo ""
echo "  ╔══════════════════════════════════════════════════╗"
echo "  ║  OpenCode Command Center — Daemon Installer     ║"
echo "  ║  Persistent agent with supervisord              ║"
echo "  ╚══════════════════════════════════════════════════╝"
echo ""

# ─── Detect Environment ─────────────────────────────────────────────
IN_DOCKER=false
if [ -f "/.dockerenv" ] || grep -q 'docker\|containerd' /proc/1/cgroup 2>/dev/null; then
  IN_DOCKER=true
  info "Running inside Docker container"
else
  info "Running on host system"
fi

# ─── Check/Install Bun ───────────────────────────────────────────────
if ! command -v bun &>/dev/null; then
  info "Installing Bun..."
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"
  
  # Add to profile for persistence
  if [ -f "$HOME/.bashrc" ]; then
    grep -q '.bun/bin' "$HOME/.bashrc" || echo 'export PATH="$HOME/.bun/bin:$PATH"' >> "$HOME/.bashrc"
  fi
fi
info "Bun found: $(bun --version)"

# ─── Check/Install opencode ──────────────────────────────────────────
if ! command -v opencode &>/dev/null; then
  warn "opencode CLI not found. Please install it manually:"
  warn "  See: https://github.com/anthropics/opencode"
  warn "  Continuing anyway — daemon will fail to execute tasks without it."
fi

# ─── Check/Install Supervisord ────────────────────────────────────────
if ! command -v supervisord &>/dev/null; then
  info "Installing supervisord..."
  if command -v apt-get &>/dev/null; then
    apt-get update -qq && apt-get install -y -qq supervisor
  elif command -v apk &>/dev/null; then
    apk add --no-cache supervisor
  elif command -v yum &>/dev/null; then
    yum install -y supervisor
  else
    error "Could not install supervisord — no supported package manager found."
    error "Please install supervisord manually: pip install supervisor"
    exit 1
  fi
fi
info "supervisord found: $(supervisord --version 2>&1 | head -1)"

# ─── Create Daemon Directory ──────────────────────────────────────────
mkdir -p "$DAEMON_DIR"
info "Daemon directory: $DAEMON_DIR"

# ─── Collect Configuration ────────────────────────────────────────────
if [ -f "$ENV_FILE" ]; then
  info "Existing .env found at $ENV_FILE — preserving."
  # shellcheck source=/dev/null
  source "$ENV_FILE" 2>/dev/null || true
else
  info "Setting up configuration..."
  
  if [ -z "${COMMAND_CENTER_URL:-}" ]; then
    read -rp "  Command Center WebSocket URL (e.g. wss://your-app.railway.app/ws): " COMMAND_CENTER_URL
  fi

  if [ -z "${COMMAND_CENTER_API_KEY:-}" ]; then
    read -rp "  API Key: " COMMAND_CENTER_API_KEY
  fi

  if [ -z "${DEVICE_ID:-}" ]; then
    DEVICE_ID=$(cat /proc/sys/kernel/random/uuid 2>/dev/null || uuidgen 2>/dev/null || date +%s%N)
    info "Generated Device ID: $DEVICE_ID"
  fi

  if [ -z "${DEVICE_NAME:-}" ]; then
    DEVICE_NAME=$(hostname)
    info "Using hostname as device name: $DEVICE_NAME"
  fi

  cat > "$ENV_FILE" << ENVEOF
COMMAND_CENTER_URL=${COMMAND_CENTER_URL}
COMMAND_CENTER_API_KEY=${COMMAND_CENTER_API_KEY}
DEVICE_ID=${DEVICE_ID}
DEVICE_NAME=${DEVICE_NAME}
PROJECTS=${PROJECTS:-[]}
OPENCODE_BIN=${OPENCODE_BIN:-opencode}
ENVEOF

  info "Configuration saved to $ENV_FILE"
fi

# ─── Copy/Link Daemon Source ──────────────────────────────────────────
# If running from the repo, link source. Otherwise copy.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/src/index.ts" ]; then
  # Running from repo — symlink
  if [ ! -L "$DAEMON_DIR/src" ] && [ ! -d "$DAEMON_DIR/src" ]; then
    ln -sf "$SCRIPT_DIR/src" "$DAEMON_DIR/src"
    info "Linked daemon source from repo: $SCRIPT_DIR/src"
  fi
  # Copy package.json and tsconfig if not linked
  for f in package.json tsconfig.json; do
    if [ -f "$SCRIPT_DIR/$f" ] && [ ! -f "$DAEMON_DIR/$f" ]; then
      cp "$SCRIPT_DIR/$f" "$DAEMON_DIR/$f"
    fi
  done
  # Ensure node_modules exist
  if [ -d "$SCRIPT_DIR/../../node_modules" ] && [ ! -L "$DAEMON_DIR/node_modules" ]; then
    ln -sf "$SCRIPT_DIR/../../node_modules" "$DAEMON_DIR/node_modules"
  fi
else
  warn "Not running from repo. Ensure daemon source is at $DAEMON_DIR/src/index.ts"
fi

# ─── Create Supervisord Config ────────────────────────────────────────
mkdir -p "$(dirname "$SUPERVISOR_CONF")"

cat > "$SUPERVISOR_CONF" << SUPEOF
[program:opencode-daemon]
command=bun run ${DAEMON_DIR}/src/index.ts
directory=${DAEMON_DIR}
autostart=true
autorestart=true
startretries=10
startsecs=5
stopwaitsecs=30
stdout_logfile=${LOG_DIR}/opencode-daemon.log
stderr_logfile=${LOG_DIR}/opencode-daemon-error.log
stdout_logfile_maxbytes=10MB
stdout_logfile_backups=3
stderr_logfile_maxbytes=10MB
stderr_logfile_backups=3
environment=HOME="/root",PATH="/root/.bun/bin:/usr/local/bin:/usr/bin:/bin"
SUPEOF

info "Supervisord config written to $SUPERVISOR_CONF"

# ─── Start/Restart Supervisord ────────────────────────────────────────
# Ensure supervisord main config exists
if [ ! -f /etc/supervisor/supervisord.conf ]; then
  mkdir -p /etc/supervisor/conf.d
  cat > /etc/supervisor/supervisord.conf << MAINCONF
[supervisord]
nodaemon=false
logfile=/var/log/supervisord.log
pidfile=/var/run/supervisord.pid
user=root

[unix_http_server]
file=/var/run/supervisor.sock

[supervisorctl]
serverurl=unix:///var/run/supervisor.sock

[rpcinterface:supervisor]
supervisor.rpcinterface_factory = supervisor.rpcinterface:make_main_rpcinterface

[include]
files = /etc/supervisor/conf.d/*.conf
MAINCONF
  info "Created supervisord main config"
fi

# Start or reload supervisord
if pgrep -x supervisord >/dev/null 2>&1; then
  info "Reloading supervisord..."
  supervisorctl reread
  supervisorctl update
else
  info "Starting supervisord..."
  supervisord -c /etc/supervisor/supervisord.conf
  sleep 2
fi

# ─── Verify ──────────────────────────────────────────────────────────
sleep 3
if supervisorctl status opencode-daemon 2>/dev/null | grep -q "RUNNING"; then
  info "✅ OpenCode Daemon is RUNNING!"
else
  STATUS=$(supervisorctl status opencode-daemon 2>&1 || true)
  warn "Daemon status: $STATUS"
  warn "Check logs: tail -f $LOG_DIR/opencode-daemon.log"
fi

echo ""
echo "  ┌──────────────────────────────────────────────────┐"
echo "  │  Installation Complete!                          │"
echo "  │                                                  │"
echo "  │  Status:  supervisorctl status opencode-daemon   │"
echo "  │  Logs:    tail -f /var/log/opencode-daemon.log   │"
echo "  │  Config:  $ENV_FILE"
echo "  │  Uninstall: bash install.sh --uninstall          │"
echo "  │                                                  │"
echo "  │  The daemon will auto-restart on crash/reboot.   │"
echo "  └──────────────────────────────────────────────────┘"
echo ""
