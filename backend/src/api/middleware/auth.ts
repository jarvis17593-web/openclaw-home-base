/**
 * JWT Authentication middleware
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../../config/logger';
import { env } from '../../config/env-validator';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    iat: number;
  };
}

/**
 * JWT verification middleware
 */
export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  // Skip auth in development mode
  if (env.NODE_ENV === 'development') {
    req.user = { id: 'dev-user', iat: Math.floor(Date.now() / 1000) };
    next();
    return;
  }

  try {
    const token = extractToken(req);

    if (!token) {
      res.status(401).json({ error: 'Missing authorization token' });
      return;
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string; iat: number };
    req.user = decoded;

    next();
  } catch (error) {
    logger.warn('Authentication failed', {
      error: (error as Error).message,
      ip: req.ip,
    });

    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Extract JWT from Authorization header
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice(7);
}

/**
 * Generate JWT tokens
 */
export function generateTokens(userId: string): {
  accessToken: string;
  refreshToken: string;
} {
  const accessToken = jwt.sign({ id: userId }, env.JWT_SECRET, {
    expiresIn: '15m',
  });

  const refreshToken = jwt.sign({ id: userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: '7d',
  });

  return { accessToken, refreshToken };
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): { id: string } | null {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as { id: string };
  } catch {
    return null;
  }
}
