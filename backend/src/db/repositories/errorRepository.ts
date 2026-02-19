/**
 * Error Repository
 * Data access layer for error tracking records
 */

import { logger } from '../../config/logger';

type Database = any;

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

/**
 * ErrorRepository manages error record persistence
 */
export class ErrorRepository {
  constructor(private db: Database) {}

  /**
   * Insert a new error record
   */
  insert(
    agentId: string,
    errorType: string,
    errorMessage: string,
    errorCode?: string,
    requestId?: string
  ): string {
    const id = `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    try {
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

      logger.debug('Error recorded', {
        errorId: id,
        agentId,
        errorType,
      });

      return id;
    } catch (error) {
      logger.error('Failed to insert error record', {
        error,
        agentId,
        errorType,
      });
      throw error;
    }
  }

  /**
   * Get errors for time range
   */
  getRange(
    startTime: number,
    endTime: number,
    agentId?: string,
    errorType?: string,
    limit: number = 1000
  ): ErrorRecord[] {
    try {
      let query = `
        SELECT * FROM error_tracking
        WHERE timestamp BETWEEN ? AND ?
      `;
      const params: any[] = [startTime, endTime];

      if (agentId) {
        query += ` AND agent_id = ?`;
        params.push(agentId);
      }

      if (errorType) {
        query += ` AND error_type = ?`;
        params.push(errorType);
      }

      query += ` ORDER BY timestamp DESC LIMIT ?`;
      params.push(limit);

      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params) as any[];

      return rows.map((row) => this.mapRow(row));
    } catch (error) {
      logger.error('Failed to fetch errors', {
        error,
        startTime,
        endTime,
        agentId,
        errorType,
      });
      throw error;
    }
  }

  /**
   * Get unresolved errors
   */
  getUnresolved(limit: number = 100): ErrorRecord[] {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM error_tracking
        WHERE resolved = 0
        ORDER BY timestamp DESC
        LIMIT ?
      `);

      const rows = stmt.all(limit) as any[];
      return rows.map((row) => this.mapRow(row));
    } catch (error) {
      logger.error('Failed to fetch unresolved errors', { error });
      throw error;
    }
  }

  /**
   * Get error statistics
   */
  getStats(startTime: number, endTime: number, agentId?: string) {
    try {
      let query = `
        SELECT
          COUNT(*) as total_errors,
          SUM(CASE WHEN resolved = 1 THEN 1 ELSE 0 END) as resolved,
          SUM(CASE WHEN resolved = 0 THEN 1 ELSE 0 END) as unresolved,
          COUNT(DISTINCT error_type) as error_types,
          AVG(retry_count) as avg_retries,
          AVG(CASE WHEN resolved = 1 THEN (resolved_at - created_at) ELSE NULL END) as avg_resolution_time
        FROM error_tracking
        WHERE timestamp BETWEEN ? AND ?
      `;
      const params: any[] = [startTime, endTime];

      if (agentId) {
        query += ` AND agent_id = ?`;
        params.push(agentId);
      }

      const stmt = this.db.prepare(query);
      const row = stmt.get(...params) as any;

      return {
        totalErrors: row?.total_errors || 0,
        resolved: row?.resolved || 0,
        unresolved: row?.unresolved || 0,
        errorTypes: row?.error_types || 0,
        avgRetries: Math.round(row?.avg_retries || 0),
        avgResolutionTimeMs: Math.round(row?.avg_resolution_time || 0),
        resolutionRate:
          row?.total_errors > 0
            ? ((row.resolved / row.total_errors) * 100).toFixed(2)
            : 0,
      };
    } catch (error) {
      logger.error('Failed to calculate error stats', {
        error,
        startTime,
        endTime,
        agentId,
      });
      throw error;
    }
  }

  /**
   * Get error trends over time
   */
  getTrends(
    startTime: number,
    endTime: number,
    bucketSizeMs: number = 30 * 60 * 1000
  ): Array<{ timestamp: number; count: number; errorType: string }> {
    try {
      const stmt = this.db.prepare(`
        SELECT
          CAST(CAST((timestamp - ?) / ? AS INTEGER) * ? AS INTEGER) + ? as bucket_time,
          error_type,
          COUNT(*) as count
        FROM error_tracking
        WHERE timestamp BETWEEN ? AND ?
        GROUP BY bucket_time, error_type
        ORDER BY bucket_time DESC
      `);

      const rows = stmt.all(
        startTime,
        bucketSizeMs,
        bucketSizeMs,
        startTime,
        startTime,
        endTime
      ) as any[];

      return rows.map((row) => ({
        timestamp: row.bucket_time,
        count: row.count,
        errorType: row.error_type,
      }));
    } catch (error) {
      logger.error('Failed to fetch error trends', {
        error,
        startTime,
        endTime,
      });
      throw error;
    }
  }

  /**
   * Get error type distribution
   */
  getDistribution(
    startTime: number,
    endTime: number,
    agentId?: string
  ): Record<string, number> {
    try {
      let query = `
        SELECT error_type, COUNT(*) as count
        FROM error_tracking
        WHERE timestamp BETWEEN ? AND ?
      `;
      const params: any[] = [startTime, endTime];

      if (agentId) {
        query += ` AND agent_id = ?`;
        params.push(agentId);
      }

      query += ` GROUP BY error_type`;

      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params) as any[];

      const distribution: Record<string, number> = {};
      rows.forEach((row) => {
        distribution[row.error_type] = row.count;
      });

      return distribution;
    } catch (error) {
      logger.error('Failed to fetch error distribution', {
        error,
        startTime,
        endTime,
        agentId,
      });
      throw error;
    }
  }

  /**
   * Mark error as resolved
   */
  markResolved(errorId: string, resolutionNotes?: string): void {
    try {
      const now = Date.now();
      const stmt = this.db.prepare(`
        UPDATE error_tracking
        SET resolved = 1, resolution_notes = ?, resolved_at = ?
        WHERE id = ?
      `);

      stmt.run(resolutionNotes || null, now, errorId);

      logger.debug('Error marked resolved', { errorId });
    } catch (error) {
      logger.error('Failed to mark error resolved', { error, errorId });
      throw error;
    }
  }

  /**
   * Increment retry count
   */
  incrementRetryCount(errorId: string): void {
    try {
      const stmt = this.db.prepare(`
        UPDATE error_tracking
        SET retry_count = retry_count + 1
        WHERE id = ?
      `);

      stmt.run(errorId);
    } catch (error) {
      logger.error('Failed to increment retry count', { error, errorId });
      throw error;
    }
  }

  /**
   * Delete old errors
   */
  deleteOlderThan(timestamp: number): number {
    try {
      const stmt = this.db.prepare(`
        DELETE FROM error_tracking WHERE timestamp < ?
      `);

      const result = stmt.run(timestamp);
      logger.info('Old errors deleted', { count: result.changes });

      return result.changes;
    } catch (error) {
      logger.error('Failed to delete old errors', { error, timestamp });
      throw error;
    }
  }

  /**
   * Map database row to record
   */
  private mapRow(row: any): ErrorRecord {
    return {
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
    };
  }
}
