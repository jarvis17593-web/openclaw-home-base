-- Agents table
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  status TEXT CHECK(status IN ('running', 'idle', 'error')) DEFAULT 'idle',
  pid INTEGER,
  last_activity_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Costs table (immutable, append-only)
CREATE TABLE IF NOT EXISTS costs (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  agent_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens_in INTEGER,
  tokens_out INTEGER,
  cost_usd REAL,
  checksum TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Requests table
CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  agent_id TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  latency_ms INTEGER,
  cost_usd REAL,
  status TEXT CHECK(status IN ('success', 'error', 'timeout')) DEFAULT 'success',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Resource snapshots table
CREATE TABLE IF NOT EXISTS resource_snapshots (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  agent_id TEXT NOT NULL,
  cpu_percent REAL,
  memory_rss INTEGER,
  memory_percent REAL,
  open_fds INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Audit logs table (encrypted)
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  before TEXT,
  after TEXT,
  created_at INTEGER NOT NULL
);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  severity TEXT CHECK(severity IN ('info','warning','error','critical')) DEFAULT 'info',
  type TEXT NOT NULL,
  agent_id TEXT,
  message TEXT NOT NULL,
  acknowledged BOOLEAN DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Health checks table
CREATE TABLE IF NOT EXISTS health_checks (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  component TEXT NOT NULL,
  status TEXT CHECK(status IN ('healthy','degraded','down')) DEFAULT 'healthy',
  latency_ms INTEGER,
  created_at INTEGER NOT NULL
);

-- Error tracking table
CREATE TABLE IF NOT EXISTS error_tracking (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  agent_id TEXT NOT NULL,
  error_type TEXT NOT NULL,
  error_code TEXT,
  error_message TEXT NOT NULL,
  request_id TEXT,
  retry_count INTEGER DEFAULT 0,
  resolved BOOLEAN DEFAULT 0,
  resolution_notes TEXT,
  created_at INTEGER NOT NULL,
  resolved_at INTEGER,
  FOREIGN KEY (agent_id) REFERENCES agents(id),
  FOREIGN KEY (request_id) REFERENCES requests(id)
);

-- Create indexes for common queries
-- Costs table indexes
CREATE INDEX IF NOT EXISTS idx_costs_timestamp ON costs(timestamp);
CREATE INDEX IF NOT EXISTS idx_costs_agent_id ON costs(agent_id);
CREATE INDEX IF NOT EXISTS idx_costs_agent_timestamp ON costs(agent_id, timestamp DESC);

-- Requests table indexes
CREATE INDEX IF NOT EXISTS idx_requests_timestamp ON requests(timestamp);
CREATE INDEX IF NOT EXISTS idx_requests_agent_id ON requests(agent_id);
CREATE INDEX IF NOT EXISTS idx_requests_agent_timestamp ON requests(agent_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);

-- Resource snapshots indexes
CREATE INDEX IF NOT EXISTS idx_resource_snapshots_timestamp ON resource_snapshots(timestamp);
CREATE INDEX IF NOT EXISTS idx_resource_snapshots_agent_id ON resource_snapshots(agent_id);
CREATE INDEX IF NOT EXISTS idx_resource_snapshots_agent_timestamp ON resource_snapshots(agent_id, timestamp DESC);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource);

-- Alerts indexes
CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp);
CREATE INDEX IF NOT EXISTS idx_alerts_agent_id ON alerts(agent_id);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);

-- Health checks indexes
CREATE INDEX IF NOT EXISTS idx_health_checks_timestamp ON health_checks(timestamp);
CREATE INDEX IF NOT EXISTS idx_health_checks_component ON health_checks(component);

-- Error tracking indexes
CREATE INDEX IF NOT EXISTS idx_error_tracking_timestamp ON error_tracking(timestamp);
CREATE INDEX IF NOT EXISTS idx_error_tracking_agent_id ON error_tracking(agent_id);
CREATE INDEX IF NOT EXISTS idx_error_tracking_error_type ON error_tracking(error_type);
CREATE INDEX IF NOT EXISTS idx_error_tracking_resolved ON error_tracking(resolved);
CREATE INDEX IF NOT EXISTS idx_error_tracking_agent_timestamp ON error_tracking(agent_id, timestamp DESC);
