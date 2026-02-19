# 🤖 OpenClaw Home Base

A security-hardened, production-grade dashboard for managing OpenClaw agents, monitoring API costs, tracking system health, and viewing request logs.

**Status:** Phase 1 MVP — Waves 1-4 Complete ✅ | Local Dev Ready ✅

## Features

- 📊 **Real-time Dashboard** — Agent status, cost tracking, system health in one view
- 💰 **Cost Tracking** — 24h, 7d, 30d cost summaries with trends and budget alerts
- 🔍 **Request Logs** — Full request history with filtering by status, agent, and model
- 📈 **Resource Monitoring** — CPU, memory, open file descriptors per agent
- 🚨 **Alerts** — Configurable thresholds for budget, resource usage, and health
- 🔐 **Security-First** — AES-256-GCM encryption, JWT auth, audit logging, zero secrets in code
- 🔄 **Real-Time Updates** — WebSocket for live agent status and cost updates
- 📱 **Responsive UI** — React + Tailwind CSS, works on desktop and mobile
- 🔑 **Authentication** — Login page with gateway URL + token. Optional in dev, required in prod
- 🌐 **Local & Remote** — Works on localhost, or remotely via Tailscale/VPN
- ⚡ **Hot Reload** — Backend and frontend both watch for changes during dev
- 🤖 **Dynamic Agent Discovery** — Automatically pulls agents from `~/.openclaw/openclaw.json`. No code changes needed when you add/remove agents!

## Quick Start

### Prerequisites
- Node.js 22+
- npm 10+
- OpenClaw running locally (`openclaw gateway start`) or accessible remotely

### Installation

```bash
# Clone the repo
git clone https://github.com/jarvis17593-web/openclaw-home-base
cd openclaw-home-base

# Install dependencies
npm install

# Copy environment template and configure
cp .env.example .env
nano .env  # Edit with your settings
```

### Local Development

```bash
# Start both backend (3000) and frontend (5173) in dev mode
npm run dev

# Open browser: http://localhost:5173
# You'll see the login page. Sign in with:
#   Gateway URL: http://127.0.0.1:18789 (or your remote instance)
#   Gateway Token: found via `openclaw status`

# In development mode:
# - Auth is optional (uses dev-user by default)
# - Rate limiting is disabled
# - Hot reload enabled for both backend and frontend
```

### Database Setup (if needed)

```bash
# Initialize encrypted database
npm run db:init

# Create backup
npm run db:backup
```

### Authentication

The dashboard includes a **login page** that accepts:
- **Gateway URL** — Where OpenClaw is running (local or remote)
- **Gateway Token** — Auth token from OpenClaw (`openclaw status`)

**Development Mode:**
- Auth is optional. Backend uses `dev-user` by default
- Credentials stored in browser's localStorage
- Great for testing without OpenClaw auth

**Production Mode:**
- Full JWT authentication required
- 15-minute access tokens, 7-day refresh tokens
- Invalid tokens trigger redirect to login
- Credentials never sent as query params or URL fragments

**To Get Your Gateway Token:**
```bash
$ openclaw status
# Look for: Gateway · auth token · Jarviss-Mini (192.168.0.107)
# Token format: Usually 32+ characters
```

### Production Build

```bash
# Build backend and frontend
npm run build

# Output in dist/
```

## Project Structure

```
openclaw-home-base/
├── backend/src/
│   ├── api/          # Express routes, middleware, controllers
│   ├── config/       # Environment validation, secrets
│   ├── db/           # Encrypted SQLite, repositories, schema
│   ├── services/     # Gateway client, cost tracker, resource monitor, alerts
│   ├── websocket/    # Real-time WebSocket handler
│   └── index.ts      # Entry point
│
├── frontend/src/
│   ├── components/   # React components (AgentList, CostTracker, etc.)
│   ├── hooks/        # Custom hooks (useAPI, useWebSocket, useAgents, etc.)
│   ├── pages/        # Dashboard, Settings, Logs
│   ├── services/     # API client, WebSocket client
│   ├── types/        # TypeScript interfaces
│   ├── App.tsx       # Router and main app
│   └── main.tsx      # Entry point
│
├── package.json      # Dependencies and scripts
├── tsconfig.json     # TypeScript config
├── ARCHITECTURE.md   # Full system design
├── DEPLOYMENT.md     # Setup and deployment guide
└── SECURITY.md       # Security hardening checklist
```

## Environment Variables

All variables documented in `.env.example`. Key ones:

```bash
# Server
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# Database (generates during setup)
DATABASE_PATH=data/openclaw-home-base.db
DATABASE_ENCRYPTION_KEY=<64-char hex>

# JWT (generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=<32+ chars>
JWT_REFRESH_SECRET=<32+ chars>
JWT_EXPIRY_HOURS=24

# OpenClaw Gateway
GATEWAY_URL=http://localhost:18789
GATEWAY_API_KEY=<your-api-key>

# CORS
CORS_ORIGIN=http://localhost:5173
```

## Scripts

```bash
# Development
npm run dev            # Start backend + frontend dev servers
npm run dev:backend    # Backend only (port 3000)
npm run dev:frontend   # Frontend only (port 5173)

# Build
npm run build          # Build backend + frontend for production
npm run type-check     # Type-check without emitting

# Testing
npm test               # Run tests once
npm test:watch        # Watch mode

# Database
npm run db:init        # Initialize encrypted database
npm run db:backup      # Create encrypted backup

# Maintenance
npm run lint           # Fix linting issues
npm run setup          # Full setup (install + db:init)
```

## Architecture Highlights

### Security

- **Zero Secrets in Code** — All credentials via `.env`
- **Encrypted Storage** — SQLite with AES-256-GCM at rest
- **JWT Auth** — 15-min access tokens, 7-day refresh tokens
- **Rate Limiting** — Protect against brute force attacks
- **Audit Logging** — Every config/agent change logged
- **CORS** — Locked to specific origins (not `*`)
- **Input Validation** — Zod schemas on all inputs
- **Pre-commit Hooks** — Prevent secret commits via secretlint

### Tech Stack

| Layer | Tech | Purpose |
|-------|------|---------|
| **Backend** | Node.js + Express | API server |
| **Database** | SQLite + cipher | Encrypted storage |
| **Frontend** | React 18 + Vite | Dashboard UI |
| **Styling** | Tailwind CSS | Responsive design |
| **Real-time** | WebSocket | Live updates |
| **Auth** | JWT | Stateless auth |
| **Types** | TypeScript | Type safety |
| **Testing** | Vitest | Unit + integration tests |

### Data Flow

```
Browser (React UI)
    ↓
    ├─→ HTTPS/REST ──→ Express API
    │                    ↓
    │              Middleware (auth, rate limit)
    │                    ↓
    │              Routes + Controllers
    │                    ↓
    │              Services (business logic)
    │                    ↓
    │              SQLite (encrypted)
    │                    ↓
    └─← WebSocket ←── Real-time events
         (bi-directional)
```

## Recent Improvements (Wave 5 - Local Dev Setup)

### Bug Fixes

| Issue | Fix | Details |
|-------|-----|---------|
| **Tailwind CSS Missing** | Added root-level `tailwind.config.js` + `postcss.config.js` | CSS now includes full Tailwind utilities (5KB → 13KB) |
| **HTTP Gateway Not Supported** | Modified `gatewayClient.ts` to detect protocol | Now supports both `http://` and `https://` gateway URLs |
| **Infinite API Loop** | Refactored `useAPI.ts` hook with `useEffect` | Fixed render-in-render issue causing rapid refreshes |
| **Rate Limiting in Dev** | Disabled limiter in `NODE_ENV=development` | Dev mode now unlimited; production still protected |
| **Auth Required in Dev** | Skip JWT in dev mode, require in prod | Login optional for local testing |
| **ESM Compatibility** | Changed `require.main === module` to `import.meta.url` | Proper ES module support in `server.ts` |

### New Features

- ✅ **Login Page** (`/frontend/src/pages/Login.tsx`) — Gateway URL + token form
- ✅ **Protected Routes** — Automatic redirect to `/login` for unauthenticated users
- ✅ **Logout Button** — Sign out from sidebar
- ✅ **Persistent Credentials** — localStorage for seamless reconnects
- ✅ **Hot Reload** — Both backend and frontend watch changes

### Files Changed
```
backend/src/
├── api/middleware/auth.ts          ← Skip JWT in dev
├── api/middleware/rateLimit.ts     ← Disable in dev
├── server.ts                       ← ESM fix
└── services/gatewayClient.ts       ← HTTP support

frontend/src/
├── pages/Login.tsx                 ← NEW login page
├── hooks/useAPI.ts                 ← Fixed infinite loop
├── hooks/useAuth.ts                ← Persist creds
├── App.tsx                         ← Protected routes
├── services/api.ts                 ← Conditional 401
└── components/layout/Sidebar.tsx   ← Logout button

root/
├── tailwind.config.js              ← NEW
├── postcss.config.js               ← NEW
└── .env                            ← NEW local dev config
```

## API Endpoints

### Agents
- `GET /api/agents` — List all agents with status
- `GET /api/agents/:id` — Get agent details

### Costs
- `GET /api/costs` — List cost records
- `GET /api/costs/summary?period=24h|7d|30d` — Cost summary

### Requests
- `GET /api/requests` — List API requests with filtering
- `GET /api/requests?agentId=X&limit=100` — Agent-specific requests

### Resources
- `GET /api/resources/:agentId` — CPU/memory snapshots

### Health
- `GET /api/health` — System health checks

### Alerts
- `GET /api/alerts` — Unacknowledged alerts
- `POST /api/alerts/:id/acknowledge` — Mark alert as read

## Roadmap (Phase 2+)

**Phase 2:** Error tracking, budget forecasting, secret rotation UI, backup/restore
**Phase 3:** Cloud deployment (Vercel), dashboard sharing, API key management
**Phase 4:** Mobile app, advanced analytics, automated remediation

## Security Checklist

Before production:

- [ ] All `.env` secrets are 32+ characters
- [ ] Database encryption key is 64-char hex
- [ ] `npm audit` shows zero high/critical vulns
- [ ] CORS origin is set to your domain (not `*`)
- [ ] HTTPS is enabled (reverse proxy)
- [ ] Rate limiting is configured
- [ ] Audit logging is enabled
- [ ] Database backups are automated
- [ ] Log rotation is configured
- [ ] Secrets are in Secrets Manager (not `.env`)

## Troubleshooting

**Frontend doesn't load?**
- Check browser console for errors
- Ensure `npm run dev:backend` is running on port 3000
- Clear browser cache and reload

**WebSocket connection fails?**
- Check `CORS_ORIGIN` in `.env` matches your frontend URL
- Ensure firewall allows WebSocket on port 3000

**Database errors?**
- Check that `DATABASE_ENCRYPTION_KEY` is 64-char hex
- Try `rm data/*.db-wal data/*.db-shm` to fix WAL issues
- Re-initialize: `npm run db:init`

**Secrets validation fails?**
- Ensure all keys from `.env.example` are in `.env`
- No trailing whitespace on secret values

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/xyz`)
3. Commit with conventional messages (`feat:`, `fix:`, etc.)
4. Push and open a PR

## License

MIT — See LICENSE file

## Support

- **Docs:** [Full Architecture](ARCHITECTURE.md) | [Deployment](DEPLOYMENT.md) | [Security](SECURITY.md)
- **Issues:** GitHub Issues
- **OpenClaw:** [https://openclaw.ai](https://openclaw.ai)

---

**Built with 🔐 security-first approach | 🚀 GSD methodology | ❤️ by Jarvis**
