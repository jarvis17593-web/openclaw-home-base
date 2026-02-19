# Changelog

All notable changes to OpenClaw Home Base will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-02-18 (Phase 1 MVP)

### Added

#### Wave 1 — Backend Scaffold + Database + Env Validation
- Express.js API server with middleware stack (CORS, auth, rate limiting, error handling)
- SQLite database with AES-256-GCM encryption at rest
- Environment variable validation with Zod
- Structured logger with log levels and color output
- Security configuration (CORS origin, JWT settings, rate limiting)
- Pre-commit hooks using husky + secretlint to prevent credential commits
- TypeScript strict mode throughout

#### Wave 2 — Gateway Client + Cost Tracker + Resource Monitor
- Gateway API client for fetching agent status and metrics
- Cost tracker service tracking API usage and costs per agent/model
- Resource monitor service tracking CPU, memory, and file descriptors
- Alert engine with configurable thresholds for budget and resources
- Audit logger tracking all config and agent changes
- Repositories pattern for data access abstraction

#### Wave 3 — API Routes + Middleware + WebSocket
- RESTful API endpoints for agents, costs, requests, resources, alerts, health
- JWT middleware for request authentication
- Rate limiting middleware with per-endpoint configuration
- Error handling middleware with standardized error responses
- WebSocket server for real-time updates to connected clients
- Health check service monitoring Gateway, database, and API availability

#### Wave 4 — React UI + Components + Hooks + WebSocket Integration
- React 18 frontend with Vite build tool and TypeScript
- Responsive UI with Tailwind CSS (no external component libraries)
- Dashboard page with cost summary, alerts, agent list, and health status
- Settings page for configuration and authentication
- Logs page with request history and filtering
- React Router for navigation between pages
- Custom hooks: useAPI, useWebSocket, useAgents, useCosts, useAuth
- API client service with JWT token management
- WebSocket client for real-time push updates
- Type-safe data structures and components

#### Documentation & Setup
- Comprehensive README with quick start guide
- ARCHITECTURE.md documenting full system design and security
- DEPLOYMENT.md with setup and production deployment instructions
- SECURITY.md with hardening checklist
- CONTRIBUTING.md for developers
- CHANGELOG.md (this file)
- setup.sh automation script for initial setup
- .env.example template with all required variables

### Technical Stack

**Backend:**
- Node.js 22+ with Express.js
- SQLite with cipher plugin (AES-256-GCM)
- WebSocket with ws library
- JWT for stateless authentication
- Zod for input validation

**Frontend:**
- React 18
- Vite (build tool)
- TypeScript
- Tailwind CSS
- React Router
- Vitest for testing

**Security:**
- JWT (15-min access, 7-day refresh tokens)
- Rate limiting (configurable per endpoint)
- CORS (locked to specific origins)
- Input validation (Zod schemas)
- Encrypted storage (AES-256-GCM)
- Audit logging (all changes tracked)
- Secret scanning (pre-commit hooks)
- No secrets in code

### Known Limitations (Phase 2+)

- No error tracking/remediation (Phase 2)
- No budget forecasting (Phase 2)
- No secret rotation UI (Phase 2)
- No backup/restore UI (Phase 2)
- No cloud deployment (Vercel, etc.) (Phase 3)
- No API key management (Phase 3)
- No advanced analytics (Phase 4)
- No mobile app (Phase 4)

### Files

- `backend/` — Node.js/Express server (25+ files)
- `frontend/` — React dashboard (20+ files)
- `__tests__/` — Unit and integration tests
- `docs/` — Architecture and deployment guides
- `scripts/` — Setup and maintenance scripts

---

## Unreleased (Phase 2)

### Planned

- [ ] Error tracking with retry history
- [ ] Budget forecasting (7d, 30d trends)
- [ ] Secret rotation reminders and UI
- [ ] Database backup/restore UI
- [ ] Advanced filtering in request logs
- [ ] Agent performance profiling
- [ ] Custom alert rules and thresholds
- [ ] Multi-user support with role-based access
- [ ] Integration tests (e2e with Playwright)
- [ ] Performance metrics (response times, throughput)

---

## Version History

### 1.0.0 (Current)
- **Phase 1 MVP** — Complete MVP with all core features
- **Status:** Ready for production use with security hardening
- **Lines of Code:** ~5,000+ (backend + frontend)
- **Test Coverage:** ~60% (increasing with Phase 2)

---

## How to Upgrade

### From earlier version

```bash
git pull origin main
npm install
npm run db:init  # Only if schema changed
npm run dev
```

### Breaking Changes

None in 1.0.0 (first release).

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to contribute.

---

## License

MIT — See LICENSE file

---

_Updated: 2026-02-18_
