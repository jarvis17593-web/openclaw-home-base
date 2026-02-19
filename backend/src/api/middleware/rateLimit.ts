/**
 * Rate limiting middleware
 */

import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env-validator';
import { logger } from '../../config/logger';

interface RateLimitStore {
  count: number;
  resetAt: number;
}

/**
 * Simple in-memory rate limiter
 */
class RateLimiter {
  private store: Map<string, RateLimitStore> = new Map();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number = env.RATE_LIMIT_WINDOW_MS, maxRequests: number = env.RATE_LIMIT_MAX_REQUESTS) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Cleanup old entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Check if request should be allowed
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now >= entry.resetAt) {
      this.store.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }

    entry.count++;

    if (entry.count > this.maxRequests) {
      return false;
    }

    return true;
  }

  /**
   * Get remaining requests for key
   */
  getRemaining(key: string): number {
    const entry = this.store.get(key);
    if (!entry) return this.maxRequests;
    return Math.max(0, this.maxRequests - entry.count);
  }

  /**
   * Cleanup old entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetAt) {
        this.store.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('Rate limit cleanup', { cleaned });
    }
  }
}

const limiter = new RateLimiter();

/**
 * Rate limit middleware
 */
export function rateLimit(req: Request, res: Response, next: NextFunction): void {
  const key = req.ip || 'unknown';

  if (!limiter.isAllowed(key)) {
    logger.warn('Rate limit exceeded', { ip: key });
    res.status(429).json({
      error: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil(env.RATE_LIMIT_WINDOW_MS / 1000),
    });
    return;
  }

  res.setHeader('X-RateLimit-Remaining', limiter.getRemaining(key));
  next();
}
