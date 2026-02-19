// Set required environment variables BEFORE any module is imported.
// These must be top-level assignments so they run during setupFiles phase,
// before test file modules are resolved and env-validator runs.
process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-characters-long!!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-minimum-32-chars!!';
process.env.DATABASE_ENCRYPTION_KEY = 'a'.repeat(64); // valid 64-char hex string
process.env.GATEWAY_AUTH_TOKEN = 'test-gateway-auth-token';
process.env.GATEWAY_URL = 'https://localhost:18789';
process.env.DATABASE_PATH = './data/test.db';
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.RATE_LIMIT_WINDOW_MS = '900000';
process.env.RATE_LIMIT_MAX_REQUESTS = '100';
process.env.MONTHLY_BUDGET_USD = '3000';
process.env.LOG_LEVEL = 'error'; // suppress logs during tests
process.env.LOG_PATH = './logs';
process.env.ENABLE_AUDIT_LOGGING = 'false';
process.env.ENABLE_METRICS = 'false';
process.env.BUDGET_ALERT_THRESHOLD_50 = 'true';
process.env.BUDGET_ALERT_THRESHOLD_75 = 'true';

import { beforeAll, afterAll } from 'vitest';
import { join } from 'path';
import { unlink } from 'fs/promises';

// Setup test database
const testDbPath = join(process.cwd(), 'data', 'test.db');

beforeAll(() => {
  process.env.DATABASE_PATH = testDbPath;
});

afterAll(async () => {
  try {
    await unlink(testDbPath);
  } catch {
    // File may not exist
  }
});
