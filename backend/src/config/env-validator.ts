import { z } from 'zod';

const envSchema = z.object({
  // Server
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Security
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  DATABASE_ENCRYPTION_KEY: z.string().regex(/^[a-f0-9]{64}$/, 'DATABASE_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)'),

  // OpenClaw Gateway
  GATEWAY_URL: z.string().url('GATEWAY_URL must be a valid URL'),
  GATEWAY_API_KEY: z.string().min(1, 'GATEWAY_API_KEY is required'),

  // Database
  DATABASE_PATH: z.string().default('./data/openclaw-home-base.db'),
  DATABASE_BACKUP_PATH: z.string().default('./data/backups'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_PATH: z.string().default('./logs'),

  // Features
  ENABLE_AUDIT_LOGGING: z.enum(['true', 'false']).default('true').transform(v => v === 'true'),
  ENABLE_METRICS: z.enum(['true', 'false']).default('true').transform(v => v === 'true'),
});

export type Environment = z.infer<typeof envSchema>;

export function validateEnv(): Environment {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('\n');
      throw new Error(`Environment validation failed:\n${issues}`);
    }
    throw error;
  }
}
