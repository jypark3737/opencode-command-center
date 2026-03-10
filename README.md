# OpenCode Command Center

Manage multiple OpenCode AI coding sessions across different devices from a single web dashboard.

## Architecture

- **Web Dashboard** (`apps/web`) — Next.js 15 app with real-time updates
- **Agent Daemon** (`apps/daemon`) — Runs on each device, connects to dashboard
- **Shared Types** (`packages/shared`) — TypeScript types and WebSocket protocol

## Quick Start

### 1. Deploy the Command Center

**Railway (recommended for first deploy):**
```bash
# Set environment variables in Railway dashboard:
# DATABASE_URL, COMMAND_CENTER_API_KEY, ANTHROPIC_API_KEY
railway up
```

**Docker Compose (for NAS/self-hosted):**
```bash
cp .env.example .env
# Edit .env with your values
docker-compose up -d
# Run migrations
docker-compose exec web bunx prisma migrate deploy
```

### 2. Install Agent Daemon on Each Device

```bash
# On each device that runs OpenCode:
COMMAND_CENTER_URL=wss://your-app.railway.app/ws \
COMMAND_CENTER_API_KEY=your-key \
DEVICE_ID=$(uuidgen) \
DEVICE_NAME=my-server \
bash apps/daemon/install.sh
```

Then start the daemon:
```bash
cd opencode-command-center
DEVICE_ID=your-device-id bun run apps/daemon/src/index.ts
```

### 3. Open the Dashboard

Navigate to your Command Center URL and start adding tasks!

## Development

```bash
# Install dependencies
bun install

# Start web app (with custom server for WebSocket support)
cd apps/web && bun run dev

# Start daemon (in another terminal)
cd apps/daemon && bun run dev
```

## Environment Variables

See `apps/web/.env.example` for all required variables.

## Migration to NAS

When your NAS is ready:
1. `docker-compose up -d` on the NAS
2. Update `COMMAND_CENTER_URL` in each daemon's `.env`
3. Restart daemons — they reconnect automatically
