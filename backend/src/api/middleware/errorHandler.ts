/**
 * Error handling middleware
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../config/logger';

export interface ApiError extends Error {
  statusCode?: number;
  context?: Record<string, any>;
}

/**
 * Global error handler middleware
 */
export function errorHandler(
  error: ApiError | Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = (error as ApiError).statusCode || 500;
  const context = (error as ApiError).context || {};

  logger.error('Request error', {
    message: error.message,
    statusCode,
    ...context,
  });

  res.status(statusCode).json({
    error: {
      message: error.message,
      statusCode,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    },
  });
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Create typed error
 */
export function createError(
  message: string,
  statusCode: number = 500,
  context?: Record<string, any>
): ApiError {
  const error = new Error(message) as ApiError;
  error.statusCode = statusCode;
  error.context = context;
  return error;
}
