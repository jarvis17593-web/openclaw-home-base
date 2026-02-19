/**
 * Error Tracking Service
 * Categorizes, tracks, and analyzes API errors
 */

import { randomUUID } from 'crypto';
import { logger } from '../config/logger';

export interface ErrorRecord {
  id: string;
  timestamp: number;
  agentId: string;
  errorType: string;
  errorCode?: string;
  errorMessage: string;
  requestId?: string;
  retryCount: number;
  resolved: boolean;
  resolutionNotes?: string;
  createdAt: number;
  resolvedAt?: number;
}

export interface ErrorSummary {
  total: number;
  byType: Record<string, number>;
  byAgent: Record<string, number>;
  unresolved: number;
  timeToResolution: number; // average ms
}

export interface ErrorTrend {
  timestamp: number;
  count: number;
  errorType: string;
}

export class ErrorTracker {
  private db: any;

  constructor(db: any) {
    this.db = db;
  }

  /**
   * Categorize error type from error details
   */
  categorizeError(
    errorCode?: string,
    errorMessage?: string
  ): string {
    if (!errorCode && !errorMessage) {
      return 'unknown';
    }

    const code = errorCode?.toString() || '';
    const message = (errorMessage || '').toLowerCase();

    // HTTP status codes
    if (code === '429' || message.includes('rate limit')) {
      return 'rate_limit';
    }
    if (code === '401' || code === '403' || message.includes('unauthorized')) {
      return 'auth_error';
    }
    if (code === '400' || code === '422' || message.includes('invalid')) {
      return 'invalid_input';
    }
    if (code === '500' || code === '502' || code === '503' || code === '504') {
      return 'server_error';
    }
    if (code === '408' || message.includes('timeout')) {
      return 'timeout';
    }
    if (code === '404' || message.includes('not found')) {
      return 'not_found';
    }

    // Network errors
    if (message.includes('econnrefused') || message.includes('connection refused')) {
      return 'connection_error';
    }
    if (message.includes('enotfound') || message.includes('dns')) {
      return 'dns_error';
    }

    // Default
    return 'api_error';
  }

  /**
   * Record a new error
   */
  async recordError(
    agentId: string,
    errorType: string,
    errorMessage: string,
    errorCode?: string,
    requestId?: string
  ): Promise<ErrorRecord> {
    const id = randomUUID();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO error_tracking (
        id, timestamp, agent_id, error_type, error_code,
        error_message, request_id, retry_count, resolved, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      now,
      agentId,
      errorType,
      errorCode || null,
      errorMessage,
      requestId || null,
      0,
      0,
      now
    );

    logger.info('Error recorded', {
      errorId: id,
      agentId,
      errorType,
      errorCode,
    });

    return {
      id,
      timestamp: now,
      agentId,
      errorType,
      errorCode,
      errorMessage,
      requestId,
      retryCount: 0,
      resolved: false,
      createdAt: now,
    };
  }

  /**
   * Increment retry count for an error
   */
  async incrementRetryCount(errorId: string): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE error_tracking
      SET retry_count = retry_count + 1
      WHERE id = ?
    `);

    stmt.run(errorId);
  }

  /**
   * Mark error as resolved
   */
  async markResolved(errorId: string, resolutionNotes?: string): Promise<void> {
    const now = Date.now();
    const stmt = this.db.prepare(`
      UPDATE error_tracking
      SET resolved = 1, resolution_notes = ?, resolved_at = ?
      WHERE id = ?
    `);

    stmt.run(resolutionNotes || null, now, errorId);

    logger.info('Error marked resolved', { errorId });
  }

  /**
   * Get errors by agent within time range
   */
  async getErrorsByAgent(
    agentId: string,
    hoursBack: number = 24
  ): Promise<ErrorRecord[]> {
    const sinceTime = Date.now() - hoursBack * 60 * 60 * 1000;

    const stmt = this.db.prepare(`
      SELECT 
        id, timestamp, agent_id, error_type, error_code,
        error_message, request_id, retry_count, resolved,
        resolution_notes, created_at, resolved_at
      FROM error_tracking
      WHERE agent_id = ? AND timestamp >= ?
      ORDER BY timestamp DESC
    `);

    const rows = stmt.all(agentId, sinceTime);

    return rows.map((row: any) => ({
      id: row.id,
      timestamp: row.timestamp,
      agentId: row.agent_id,
      errorType: row.error_type,
      errorCode: row.error_code,
      errorMessage: row.error_message,
      requestId: row.request_id,
      retryCount: row.retry_count,
      resolved: Boolean(row.resolved),
      resolutionNotes: row.resolution_notes,
      createdAt: row.created_at,
      resolvedAt: row.resolved_at,
    }));
  }

  /**
   * Get errors by type within time range
   */
  async getErrorsByType(hoursBack: number = 24): Promise<ErrorRecord[]> {
    const sinceTime = Date.now() - hoursBack * 60 * 60 * 1000;

    const stmt = this.db.prepare(`
      SELECT 
        id, timestamp, agent_id, error_type, error_code,
        error_message, request_id, retry_count, resolved,
        resolution_notes, created_at, resolved_at
      FROM error_tracking
      WHERE timestamp >= ? AND resolved = 0
      ORDER BY timestamp DESC
    `);

    return stmt.all(sinceTime);
  }

  /**
   * Get error summary
   */
  async getSummary(hoursBack: number = 24): Promise<ErrorSummary> {
    const sinceTime = Date.now() - hoursBack * 60 * 60 * 1000;

    // Total errors
    const totalStmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM error_tracking
      WHERE timestamp >= ?
    `);
    const totalResult = totalStmt.get(sinceTime) as any;
    const total = totalResult?.count || 0;

    // Unresolved errors
    const unresolvedStmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM error_tracking
      WHERE timestamp >= ? AND resolved = 0
    `);
    const unresolvedResult = unresolvedStmt.get(sinceTime) as any;
    const unresolved = unresolvedResult?.count || 0;

    // By type
    const byTypeStmt = this.db.prepare(`
      SELECT error_type, COUNT(*) as count
      FROM error_tracking
      WHERE timestamp >= ?
      GROUP BY error_type
    `);
    const byTypeRows = byTypeStmt.all(sinceTime) as any[];
    const byType: Record<string, number> = {};
    byTypeRows.forEach((row) => {
      byType[row.error_type] = row.count;
    });

    // By agent
    const byAgentStmt = this.db.prepare(`
      SELECT agent_id, COUNT(*) as count
      FROM error_tracking
      WHERE timestamp >= ?
      GROUP BY agent_id
    `);
    const byAgentRows = byAgentStmt.all(sinceTime) as any[];
    const byAgent: Record<string, number> = {};
    byAgentRows.forEach((row) => {
      byAgent[row.agent_id] = row.count;
    });

    // Average time to resolution
    const resolutionStmt = this.db.prepare(`
      SELECT AVG(resolved_at - created_at) as avg_time
      FROM error_tracking
      WHERE timestamp >= ? AND resolved = 1
    `);
    const resolutionResult = resolutionStmt.get(sinceTime) as any;
    const timeToResolution = resolutionResult?.avg_time || 0;

    return {
      total,
      byType,
      byAgent,
      unresolved,
      timeToResolution: Math.round(timeToResolution),
    };
  }

  /**
   * Get error trends over time
   */
  async getTrends(hoursBack: number = 24, bucketSizeMin: number = 30): Promise<ErrorTrend[]> {
    const sinceTime = Date.now() - hoursBack * 60 * 60 * 1000;
    const bucketSizeMs = bucketSizeMin * 60 * 1000;

    const stmt = this.db.prepare(`
      SELECT 
        CAST(CAST((timestamp - ?) / ? AS INTEGER) * ? AS INTEGER) + ? as bucket_time,
        error_type,
        COUNT(*) as count
      FROM error_tracking
      WHERE timestamp >= ?
      GROUP BY bucket_time, error_type
      ORDER BY bucket_time DESC
    `);

    const rows = stmt.all(sinceTime, bucketSizeMs, bucketSizeMs, sinceTime, sinceTime) as any[];

    return rows.map((row) => ({
      timestamp: row.bucket_time,
      count: row.count,
      errorType: row.error_type,
    }));
  }

  /**
   * Get detailed error report
   */
  async getDetailedReport(limit: number = 50): Promise<ErrorRecord[]> {
    const stmt = this.db.prepare(`
      SELECT 
        id, timestamp, agent_id, error_type, error_code,
        error_message, request_id, retry_count, resolved,
        resolution_notes, created_at, resolved_at
      FROM error_tracking
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    const rows = stmt.all(limit) as any[];

    return rows.map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      agentId: row.agent_id,
      errorType: row.error_type,
      errorCode: row.error_code,
      errorMessage: row.error_message,
      requestId: row.request_id,
      retryCount: row.retry_count,
      resolved: Boolean(row.resolved),
      resolutionNotes: row.resolution_notes,
      createdAt: row.created_at,
      resolvedAt: row.resolved_at,
    }));
  }
}

let errorTrackerInstance: ErrorTracker | null = null;

export function initializeErrorTracker(db: any): ErrorTracker {
  errorTrackerInstance = new ErrorTracker(db);
  return errorTrackerInstance;
}

export function getErrorTracker(): ErrorTracker {
  if (!errorTrackerInstance) {
    throw new Error('ErrorTracker not initialized');
  }
  return errorTrackerInstance;
}
