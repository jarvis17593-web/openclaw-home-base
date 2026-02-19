import { validateEnv, type Environment } from './env-validator.js';

let config: Environment | null = null;

/**
 * Load and validate environment variables on startup
 * Throws if validation fails
 */
export function initializeSecrets(): void {
  if (config) return;
  
  config = validateEnv();
  
  // Ensure sensitive values aren't logged
  const safeConfig = { ...config };
  Object.keys(safeConfig).forEach(key => {
    if (key.includes('SECRET') || key.includes('KEY') || key.includes('PASSWORD') || key.includes('API_KEY')) {
      (safeConfig as Record<string, unknown>)[key] = '***REDACTED***';
    }
  });
  
  console.log('[SECRETS] Configuration loaded and validated', safeConfig);
}

/**
 * Get loaded configuration
 */
export function getConfig(): Environment {
  if (!config) {
    throw new Error('Secrets not initialized. Call initializeSecrets() first.');
  }
  return config;
}

/**
 * Safe getter for secrets without logging
 */
export function getSecret<K extends keyof Environment>(key: K): Environment[K] {
  const cfg = getConfig();
  return cfg[key];
}
