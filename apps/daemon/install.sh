#!/usr/bin/env bash
set -euo pipefail

# OpenCode Command Center — Agent Daemon Install Script with Supervisord Persistence
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/jypark3737/opencode-command-center/master/apps/daemon/install.sh | sudo bash
#   Or: sudo bash install.sh [--uninstall]
#
# You can pre-set env vars to skip prompts:
#   COMMAND_CENTER_URL=wss://... COMMAND_CENTER_API_KEY=... DEVICE_NAME=... sudo -E bash install.sh

REPO_URL="https://github.com/jypark3737/opencode-command-center.git"
DAEMON_DIR="/opt/opencode-daemon"
SUPERVISOR_CONF="/etc/supervisor/conf.d/opencode-daemon.conf"
LOG_DIR="/var/log"
ENV_FILE="$DAEMON_DIR/.env"

# ─── Defaults ─────────────────────────────────────────────────────────
DEFAULT_WS_URL="wss://web-production-bc782.up.railway.app/ws"
DEFAULT_API_KEY="b07474ef81cddf62d99c46cfd87718c9a74b24e7409c90fc9e92d6dc412bdb80"

# ─── Colors ──────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ─── Prompt helper (works with curl | bash via /dev/tty) ──────────────
ask() {
  local prompt="$1"
  local default="$2"
  local varname="$3"
  local show_default="$default"
  
  # Mask API key display
  if [[ "$varname" == "COMMAND_CENTER_API_KEY" ]] && [[ -n "$default" ]]; then
    show_default="${default:0:8}...${default: -4}"
  fi

  if [[ -n "$show_default" ]]; then
    prompt="${prompt} ${CYAN}[${show_default}]${NC}"
  fi
  prompt="${prompt}: "

  # Try reading from /dev/tty (works even in curl | bash)
  if [ -t 0 ] || [ -e /dev/tty ]; then
    echo -en "  $prompt" >/dev/tty 2>/dev/null || echo -en "  $prompt"
    local answer
    read -r answer </dev/tty 2>/dev/null || read -r answer || answer=""
    answer="${answer:-$default}"
    eval "$varname=\"$answer\""
  else
    # Non-interactive — use default
    eval "$varname=\"$default\""
  fi
}

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

# ─── Detect real user (when run with sudo) ──────────────────────────
REAL_USER="${SUDO_USER:-$(whoami)}"
REAL_HOME=$(eval echo "~$REAL_USER")
if [ "$REAL_USER" != "root" ]; then
  info "Detected real user: $REAL_USER (home: $REAL_HOME)"
else
  REAL_HOME="${HOME:-/root}"
fi

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

# ─── Clone/Update Repo ───────────────────────────────────────────────
if [ -d "$DAEMON_DIR/repo/.git" ]; then
  info "Updating existing repo..."
  cd "$DAEMON_DIR/repo" && git pull --ff-only 2>/dev/null || warn "Git pull failed — using existing code"
else
  info "Cloning repository..."
  rm -rf "$DAEMON_DIR/repo"
  git clone --depth 1 "$REPO_URL" "$DAEMON_DIR/repo"
fi

# Install dependencies
info "Installing dependencies..."
cd "$DAEMON_DIR/repo" && bun install --frozen-lockfile 2>/dev/null || bun install

# ─── Collect Configuration ────────────────────────────────────────────
echo ""
echo -e "  ${BOLD}Configuration${NC} (press Enter to accept defaults)"
echo ""

if [ -f "$ENV_FILE" ]; then
  info "Existing .env found — loading as defaults."
  # shellcheck source=/dev/null
  source "$ENV_FILE" 2>/dev/null || true
fi

# WebSocket URL
ask "Command Center WebSocket URL" "${COMMAND_CENTER_URL:-$DEFAULT_WS_URL}" COMMAND_CENTER_URL

# API Key
ask "API Key" "${COMMAND_CENTER_API_KEY:-$DEFAULT_API_KEY}" COMMAND_CENTER_API_KEY

# Device Name
ask "Device Name" "${DEVICE_NAME:-$(hostname)}" DEVICE_NAME

# Device ID (auto-generate, don't ask)
if [ -z "${DEVICE_ID:-}" ]; then
  DEVICE_ID=$(cat /proc/sys/kernel/random/uuid 2>/dev/null || uuidgen 2>/dev/null || date +%s%N)
fi

: "${XDG_DATA_HOME:=$REAL_HOME/.local/share}"
: "${XDG_CONFIG_HOME:=$REAL_HOME/.config}"
: "${XDG_STATE_HOME:=$REAL_HOME/.local/state}"
: "${XDG_CACHE_HOME:=$REAL_HOME/.cache}"
: "${OPENCODE_HOME:=$XDG_DATA_HOME/opencode}"
: "${OPENCODE_DB_PATH:=$OPENCODE_HOME/opencode.db}"
: "${OPENCODE_BIN:=opencode}"

# Write .env
cat > "$ENV_FILE" << ENVEOF
COMMAND_CENTER_URL=${COMMAND_CENTER_URL}
COMMAND_CENTER_API_KEY=${COMMAND_CENTER_API_KEY}
DEVICE_ID=${DEVICE_ID}
DEVICE_NAME=${DEVICE_NAME}
PROJECTS=${PROJECTS:-[]}
OPENCODE_BIN=${OPENCODE_BIN}
OPENCODE_HOME=${OPENCODE_HOME}
OPENCODE_DB_PATH=${OPENCODE_DB_PATH}
XDG_DATA_HOME=${XDG_DATA_HOME}
XDG_CONFIG_HOME=${XDG_CONFIG_HOME}
XDG_STATE_HOME=${XDG_STATE_HOME}
XDG_CACHE_HOME=${XDG_CACHE_HOME}
ENVEOF

echo ""
info "Configuration saved to $ENV_FILE"
info "  URL:    $COMMAND_CENTER_URL"
info "  Device: $DEVICE_NAME ($DEVICE_ID)"

# ─── Normalize daemon state paths ───────────────────────────────────────────
mkdir -p "$(dirname "$OPENCODE_DB_PATH")"

SUPERVISOR_PATH="$REAL_HOME/.bun/bin:/usr/local/bin:/usr/bin:/bin"
SUPERVISOR_USER="$REAL_USER"

# ─── Create Supervisord Config ────────────────────────────────────────
mkdir -p "$(dirname "$SUPERVISOR_CONF")"

cat > "$SUPERVISOR_CONF" << SUPEOF
[program:opencode-daemon]
command=bun run ${DAEMON_DIR}/repo/apps/daemon/src/index.ts
directory=${DAEMON_DIR}/repo
user=${SUPERVISOR_USER}
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
environment=HOME="$REAL_HOME",PATH="$SUPERVISOR_PATH",COMMAND_CENTER_URL="$COMMAND_CENTER_URL",COMMAND_CENTER_API_KEY="$COMMAND_CENTER_API_KEY",DEVICE_ID="$DEVICE_ID",DEVICE_NAME="$DEVICE_NAME",OPENCODE_BIN="$OPENCODE_BIN",OPENCODE_HOME="$OPENCODE_HOME",OPENCODE_DB_PATH="$OPENCODE_DB_PATH",XDG_DATA_HOME="$XDG_DATA_HOME",XDG_CONFIG_HOME="$XDG_CONFIG_HOME",XDG_STATE_HOME="$XDG_STATE_HOME",XDG_CACHE_HOME="$XDG_CACHE_HOME"
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
  supervisorctl restart opencode-daemon 2>/dev/null || true
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
