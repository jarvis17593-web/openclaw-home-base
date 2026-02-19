# 🏛️ OPENCLAW HOME BASE - SECURITY-HARDENED ARCHITECTURE

**Project:** Unified dashboard for managing OpenClaw agents, monitoring API costs, tracking requests, and viewing system health.

**Status:** Approved 2026-02-18 | Phase 1 in progress

---

## EXECUTIVE SUMMARY

A production-grade, security-first dashboard for managing OpenClaw agents, monitoring API costs, and tracking system health. Built with defense-in-depth principles, zero-trust architecture, and comprehensive audit trails.

---

## 1. SECURITY ARCHITECTURE

### 1.1 Security Boundaries & Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      SECURITY PERIMETER                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐         ┌────────────────────┐               │
│  │   Browser        │────────→│  Express API       │               │
│  │   (React UI)     │  HTTPS  │  (JWT Auth)        │               │
│  └──────────────────┘         └────────────────────┘               │
│         ↑                              ↓                             │
│         │                      ┌────────────────────┐               │
│         │                      │  Auth Middleware   │               │
│         │                      │  • JWT Validation  │               │
│         │                      │  • Rate Limiting   │               │
│         │                      │  • Input Validation│               │
│         │                      └────────────────────┘               │
│         │                              ↓                             │
│         │                      ┌────────────────────┐               │
│         └──────────────────────│  Service Layer     │               │
│                 WebSocket      │  • Gateway Client  │               │
│                                │  • Cost Tracker    │               │
│                                │  • Resource Mon.   │               │
│                                │  • Audit Logger    │               │
│                                └────────────────────┘               │
│                                        ↓                             │
│                                ┌────────────────────┐               │
│                                │  Encrypted SQLite  │               │
│                                │  AES-256-GCM       │               │
│                                └────────────────────┘               │
│                                        ↓                             │
│  ┌────────────────────────────────────────────────────────┐        │
│  │              EXTERNAL DEPENDENCIES                       │        │
│  │  ┌─────────────────┐    ┌──────────────────┐          │        │
│  │  │ OpenClaw        │    │ Anthropic API     │          │        │
│  │  │ Gateway         │    │ (Cost Data)       │          │        │
│  │  │ (Auth Token)    │    │ (API Key)         │          │        │
│  │  └─────────────────┘    └──────────────────┘          │        │
│  │         ↑                        ↑                      │        │
│  │         └────────────────────────┘                      │        │
│  │              Secrets via ENV                            │        │
│  └────────────────────────────────────────────────────────┘        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Core Security Principles

1. **Zero Secrets in Code** — All credentials via environment variables
2. **Strict .gitignore** — Secrets, node_modules, build artifacts, logs
3. **Secret Scanning** — Pre-commit hooks block credential commits
4. **Audit Trail** — Every config change logged
5. **Rate Limiting** — Protect dashboard API from brute force
6. **CORS** — Locked to localhost in dev, explicit origins in prod
7. **Input Validation** — All user input validated/sanitized (zod)
8. **Dependency Scanning** — npm audit in CI, snyk for vulnerabilities
9. **Secret Rotation** — Alerts when API keys are stale (>90 days)
10. **Encrypted Storage** — Cost data encrypted at rest (SQLite cipher)

---

## 2. TECH STACK

- **Backend:** Node.js + Express
- **Frontend:** React + TypeScript + Vite
- **Database:** SQLite (AES-256-GCM encryption)
- **Real-time:** WebSocket
- **Auth:** JWT (15min access, 7d refresh)
- **Testing:** Vitest (unit + integration)
- **Deployment:** Local machine (Phase 1), optional Vercel (Phase 3+)

---

## 3. MVP FEATURES (PHASE 1)

**Must-Have:**
- ✅ Agent list + status (running/idle/error)
- ✅ Real-time API cost tracking (24h, 7d, 30d)
- ✅ Request history (timestamp, model, tokens, cost)
- ✅ Resource metrics (CPU, memory) per agent
- ✅ Budget alerts (50%, 75%, 100%)
- ✅ Health checks (gateway, API providers, database)
- ✅ Secure config (env vars, pre-commit hooks)
- ✅ Audit logging (config/agent changes)
- ✅ React dashboard with WebSocket updates

**Phase 2+ (Later):**
- Error tracking with retry history
- Budget forecasting
- Secret rotation UI
- Backup/restore
- Performance profiling

---

## 4. FOLDER STRUCTURE

```
openclaw-home-base/
├── .env.example                    # Template (committed)
├── .env                            # [GITIGNORE] Real secrets
├── .gitignore
├── .husky/pre-commit               # Security checks
├── .secretlintrc.json
├── package.json
├── tsconfig.json
├── vitest.config.ts
│
├── backend/
│   ├── src/
│   │   ├── index.ts
│   │   ├── config/
│   │   │   ├── env-validator.ts
│   │   │   └── secrets.ts
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   ├── middleware/
│   │   │   └── controllers/
│   │   ├── services/
│   │   │   ├── gatewayClient.ts
│   │   │   ├── costTracker.ts
│   │   │   ├── resourceMonitor.ts
│   │   │   ├── alertEngine.ts
│   │   │   └── auditLogger.ts
│   │   ├── db/
│   │   │   ├── schema.sql
│   │   │   ├── encrypted.ts
│   │   │   └── repositories/
│   │   └── websocket/
│   └── __tests__/
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── services/
│   └── __tests__/
│
├── docs/
├── scripts/
└── .github/workflows/
```

---

## 5. AGENT LOADING & CONFIGURATION

### 5.1 Dynamic Agent Discovery (New Feature)

Agents are discovered **dynamically from OpenClaw's configuration file** (`~/.openclaw/openclaw.json`), not hardcoded.

**How it Works:**

1. Frontend calls `/api/agents` endpoint on dashboard load
2. Backend `GatewayClient.getAgents()` reads `~/.openclaw/openclaw.json`
3. Parses `agents.list` and maps to `Agent` interface
4. Returns all configured agents (main, dev-1/2/3, personal-assistant, professional-assistant, devops-agent, researcher, content-creator)
5. Frontend renders agents dynamically — no code changes needed when config changes
6. WebSocket updates propagate agent status changes in real-time

**Configuration Mapping:**

```json
// ~/.openclaw/openclaw.json (agents.list section)
{
  "agents": {
    "list": [
      { "id": "main", "default": true, "workspace": "/Users/jarvis/.openclaw/workspace" },
      { "id": "dev-1", "workspace": "/Users/jarvis/.openclaw/workspace/agents/dev-1" },
      { "id": "dev-2", "workspace": "/Users/jarvis/.openclaw/workspace/agents/dev-2" },
      // ... more agents
    ]
  }
}
```

**Backend Implementation (gatewayClient.ts):**

```typescript
private loadAgentsFromConfig(): Agent[] {
  const configPath = join(homedir(), '.openclaw', 'openclaw.json');
  const config = JSON.parse(readFileSync(configPath, 'utf-8'));
  
  return config.agents.list.map((agentConfig) => ({
    id: agentConfig.id,
    name: agentConfig.id,
    status: 'running', // Assume running (real status from Gateway)
    createdAt: Date.now() - 86400000,
  }));
}
```

**Fallback Behavior:**
- If config file is missing/unreadable → returns mock agents (`main`, `dev-1`)
- Errors logged but don't crash the dashboard
- Dashboard remains functional even without OpenClaw config

**Benefits:**
- ✅ No dashboard code changes when agents are added/removed
- ✅ Single source of truth (OpenClaw config)
- ✅ Seamless integration with multi-agent architecture
- ✅ Production-ready: config file always available on the machine

---

## 6. DATABASE SCHEMA

```sql
-- agents table
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  status TEXT CHECK(status IN ('running', 'idle', 'error')),
  pid INTEGER,
  last_activity_at INTEGER,
  created_at INTEGER
);

-- costs table (immutable, append-only)
CREATE TABLE costs (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  agent_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens_in INTEGER,
  tokens_out INTEGER,
  cost_usd REAL,
  checksum TEXT NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- requests table
CREATE TABLE requests (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  agent_id TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  latency_ms INTEGER,
  cost_usd REAL,
  status TEXT CHECK(status IN ('success', 'error', 'timeout'))
);

-- resource_snapshots table
CREATE TABLE resource_snapshots (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  agent_id TEXT NOT NULL,
  cpu_percent REAL,
  memory_rss INTEGER,
  memory_percent REAL,
  open_fds INTEGER
);

-- audit_logs table (encrypted)
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  before TEXT,
  after TEXT
);

-- alerts table
CREATE TABLE alerts (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  severity TEXT CHECK(severity IN ('info','warning','error','critical')),
  type TEXT NOT NULL,
  agent_id TEXT,
  message TEXT NOT NULL,
  acknowledged BOOLEAN DEFAULT 0
);

-- health_checks table
CREATE TABLE health_checks (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  component TEXT NOT NULL,
  status TEXT CHECK(status IN ('healthy','degraded','down')),
  latency_ms INTEGER
);
```

---

## 7. SECURITY CHECKLIST

**Pre-Commit:**
- [ ] secretlint passes
- [ ] Type check passes
- [ ] Linting passes
- [ ] Unit tests pass

**Pre-Deployment:**
- [ ] npm audit: 0 high/critical vulnerabilities
- [ ] .env.example matches .env keys
- [ ] Database encryption key is 32 bytes
- [ ] JWT secrets are 32+ characters
- [ ] No hardcoded credentials in code
- [ ] CORS locked to specific origins
- [ ] Rate limiting configured
- [ ] Audit logging enabled

---

## 8. RESOURCE MONITORING

**Metrics per Agent:**
- CPU usage (% of one core)
- Memory (RSS, heap, external)
- Disk I/O (read/write rates)
- Network I/O (rx/tx rates)
- Open file descriptors
- Thread count

**Alert Thresholds:**
- CPU > 80%
- Memory > 75%
- Disk write > 50 MB/s
- Open FDs > 1000

---

## 9. EXECUTION WAVES (GSD)

**Wave 1:** Backend scaffold + database + env validation
**Wave 2:** Gateway client + cost tracker + resource monitor
**Wave 3:** API routes + middleware + WebSocket
**Wave 4:** React UI + components + hooks
**Wave 5:** Tests + docs + setup scripts

---

## 10. DEPLOYMENT

**Local Setup:**
```bash
git clone https://github.com/[username]/openclaw-home-base
cd openclaw-home-base
npm run setup      # Creates .env, installs deps, initializes DB
npm run dev        # Starts backend (3000) + frontend (5173)
```

**Production:**
- Backend: Node.js server (PM2 or systemd)
- Frontend: Static build served by Nginx or Vercel
- Database: Encrypted SQLite with daily backups

---

## 11. CONTACTS & REFERENCES

**Project Owner:** Cole (John Greenway)
**Agent:** Jarvis
**Started:** 2026-02-18
**Repo:** TBD (will create during execution)

**Key Docs:**
- [GSD Methodology](https://github.com/gsd-build/get-shit-done)
- [OpenClaw Docs](https://docs.openclaw.ai)
- [OpenClaw Gateway API](http://localhost:18789/docs)

---

_This architecture is approved and locked for Phase 1. Changes require explicit approval._
