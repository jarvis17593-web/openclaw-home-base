# Test Plan: openclaw-home-base

Date: 2026-02-19
Owner: Engineering

## Goals
- Achieve **85% overall code coverage** (lines/branches) across backend and frontend.
- Achieve **100% coverage of critical paths**, defined as:
  - Authenticated API flows for `agents` and `costs` routes.
  - WebSocket connection, message handling, and broadcast paths.
  - Encryption/decryption for persisted sensitive data.
  - Cost tracking and resource monitoring calculations.
  - Dashboard data rendering (costs, resources, alerts).

## Scope Overview
- Backend: `backend/src`
- Frontend: `frontend/src`
- Tests: `__tests__` (mirrors backend/frontend structures)

## Test File Structure
Mirror the backend and frontend folder structure under `__tests__`:

- `__tests__/backend/api/routes/health.test.ts`
- `__tests__/backend/api/routes/agents.test.ts`
- `__tests__/backend/api/routes/costs.test.ts`
- `__tests__/backend/api/middleware/auth.test.ts`
- `__tests__/backend/api/middleware/rateLimit.test.ts`
- `__tests__/backend/api/middleware/errorHandler.test.ts`
- `__tests__/backend/services/costTracker.test.ts`
- `__tests__/backend/services/resourceMonitor.test.ts`
- `__tests__/backend/services/gatewayClient.test.ts`
- `__tests__/backend/services/alertEngine.test.ts`
- `__tests__/backend/db/encrypted.test.ts`
- `__tests__/backend/db/repositories/costRepository.test.ts`
- `__tests__/backend/db/repositories/resourceRepository.test.ts`
- `__tests__/backend/db/repositories/requestRepository.test.ts`
- `__tests__/backend/db/repositories/auditRepository.test.ts`
- `__tests__/backend/websocket/handler.test.ts`
- `__tests__/frontend/components/CostTracker.test.tsx`
- `__tests__/frontend/components/ResourceMonitor.test.tsx`
- `__tests__/frontend/components/AlertPanel.test.tsx`
- `__tests__/frontend/components/HealthStatus.test.tsx`
- `__tests__/frontend/components/layout/Header.test.tsx`
- `__tests__/frontend/components/layout/Sidebar.test.tsx`
- `__tests__/frontend/components/layout/MainLayout.test.tsx`
- `__tests__/frontend/pages/Dashboard.test.tsx`
- `__tests__/frontend/pages/Settings.test.tsx`
- `__tests__/frontend/pages/Logs.test.tsx`
- `__tests__/frontend/hooks/useWebSocket.test.tsx`
- `__tests__/frontend/hooks/useAuth.test.tsx`
- `__tests__/frontend/hooks/useAPI.test.tsx`
- `__tests__/frontend/hooks/useAgents.test.tsx`
- `__tests__/frontend/hooks/useCosts.test.tsx`

Note: The request mentions `CostTable`, `AlertManager`, `SettingsForm`, `LineChart`, and `PieChart`. These are not present in `frontend/src` today. The plan below maps them to current components where possible and flags the rest as **future additions** once those components exist.

## Unit Tests

### Backend: Database
Files: `backend/src/db/encrypted.ts`, `backend/src/db/repositories/*`

Test cases:
- Encryption (`encrypted.ts`)
  - Encrypts/decrypts with AES-256-GCM roundtrip (happy path).
  - Fails on altered ciphertext (tamper detection).
  - Fails on invalid key length.
  - Handles empty/undefined payloads safely.
- Repository queries
  - `costRepository` CRUD: create, read, update, delete, pagination boundaries.
  - `resourceRepository` CRUD + aggregation per agent/time window.
  - `requestRepository` insert/query by `requestId`, time range.
  - `auditRepository` append-only behavior and ordering by timestamp.

### Backend: Services
Files: `backend/src/services/*`

Test cases:
- `CostTracker`
  - Correct cost calculations for token/usage inputs.
  - Aggregation across multiple agents.
  - Handles zero/negative/undefined inputs defensively.
- `ResourceMonitor`
  - Computes CPU/memory/disk deltas correctly.
  - Detects threshold breaches and raises alerts (via `alertEngine`).
- `GatewayClient`
  - Builds correct request payloads.
  - Retries on transient failure.
  - Fails fast on non-retryable errors.
- `AlertEngine`
  - Emits alerts when thresholds exceeded.
  - Debounces duplicate alerts.

### Backend: Utilities
Files: `backend/src/config/*`, `backend/src/api/middleware/*`

Test cases:
- Env validator rejects missing required variables.
- Logger configuration sets correct levels and formats.
- Secret loading and override behavior.

### Frontend: Utilities
Files: `frontend/src/services/api.ts`, `frontend/src/services/websocket.ts`, `frontend/src/types/index.ts`

Test cases:
- API client builds base URL and headers correctly.
- API client handles 401 -> auth reset.
- WebSocket service reconnect logic with backoff.
- Type guards or transformations (if any) validate payload shape.

## Integration Tests

### API Routes
Files: `backend/src/api/routes/*`, `backend/src/api/app.ts`

Test cases:
- `GET /health` returns system status payload.
- `GET /agents` returns list with correct schema.
- `POST /agents` creates or updates agent.
- `GET /costs` returns aggregated costs by agent/time.
- `POST /costs` inserts cost record; validates required fields.
- `PUT /costs/:id` updates existing cost record.

### Middleware
Files: `backend/src/api/middleware/*`

Test cases:
- Auth middleware rejects missing/invalid JWT.
- Auth middleware attaches user/claims to request on success.
- Rate limiter blocks bursts and allows sustained low rate.
- Error handler returns consistent error shape and status codes.

### WebSocket Handlers
File: `backend/src/websocket/handler.ts`

Test cases:
- Client connects and receives initial state.
- Broadcast on cost updates and resource updates.
- Handles malformed messages gracefully (no crash, error response).

## Component Tests (React)

Files: `frontend/src/components/*`, `frontend/src/pages/*`

Test cases:
- `Dashboard` (maps to requested Dashboard)
  - Renders sections for costs, resources, alerts.
  - Shows loading and empty states.
  - Renders data from hooks.
- `CostTracker` (requested CostTable equivalent)
  - Renders row data and totals.
  - Displays currency formatting.
  - Handles empty list.
- `AlertPanel` (requested AlertManager equivalent)
  - Renders alert items with severity.
  - Dismisses/acknowledges alerts.
- `Settings` page (requested SettingsForm equivalent)
  - Renders configuration inputs.
  - Validates fields and saves changes.
- `ResourceMonitor`
  - Renders CPU/memory/disk charts or values.
  - Highlights threshold breaches.
- `HealthStatus`
  - Displays current system health.

Future component tests (once implemented):
- `LineChart` and `PieChart` rendering and tooltip behavior.

## Hook Tests

Files: `frontend/src/hooks/*`

Test cases:
- `useWebSocket`
  - Connects and updates state on messages.
  - Reconnects after disconnect with backoff.
  - Exposes send method and handles errors.
- `useAuth`
  - Stores token and updates auth state.
  - Clears on logout/401.
- `useRefresh` (not present; future hook)
  - Periodic refresh triggers fetches.
- `useAlerts` (not present; future hook)
  - Deduplicates alerts and honors severity ordering.

## Security Tests

### JWT Validation
- Rejects expired tokens.
- Rejects tokens with invalid signature or wrong audience/issuer.
- Accepts valid tokens and attaches claims.

### Rate Limiting
- Enforces per-IP limits.
- Resets after window expires.
- Allows whitelisted IPs (if configured).

### AES-256-GCM Encryption
- Ensures correct key length and IV size.
- Detects tampering (auth tag mismatch).
- Rotation: supports decrypting data with old key (if supported).

## E2E Tests

### Authentication Flows
- Login -> token stored -> authenticated routes accessible.
- Token expiry -> auto-logout and redirect.

### WebSocket Real-Time Flows
- Connect -> receive baseline state.
- Server pushes cost update -> UI reflects in Dashboard and CostTracker.
- Server pushes resource update -> UI reflects in ResourceMonitor.
- Client disconnect -> reconnect -> state resync.

## Mocking Strategy

- External HTTP APIs (GatewayClient) mocked with a request stub layer.
- Database repositories use in-memory DB or test containers when needed.
- WebSocket server mocked for frontend hooks/components.
- Date/time mocked for deterministic cost windows and rate-limits.
- Random/UUID generation mocked for predictable IDs.

## Performance Benchmarks

Critical operations and targets (local dev machine, single run):
- Encryption/decryption roundtrip: < 2ms per operation for 1KB payload.
- Cost aggregation for 10k records: < 200ms.
- Resource monitor update pipeline: < 100ms per tick.
- WebSocket broadcast fanout to 100 clients: < 250ms end-to-end.
- Dashboard render with 1k cost rows: < 300ms.

## Coverage Measurement
- Enforce 85% global and 100% critical-path coverage in CI.
- Exclude generated files in `dist/` and `schema.sql` from coverage.

## Notes and Gaps
- Chart components (`LineChart`, `PieChart`), `useRefresh`, and `useAlerts` are not present in the current codebase. Add tests when these are implemented.
- If new API routes or services are added, mirror them under `__tests__/backend/...` and update this plan.
