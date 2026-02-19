/**
 * Request Repository
 * Data access layer for API request records
 */

import { Database } from 'better-sqlite3';
import { logger } from '../../config/logger';

export interface RequestRecord {
  id: string;
  timestamp: number;
  agentId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  costUsd: number;
  status: 'success' | 'error' | 'timeout';
}

/**
 * RequestRepository manages request record persistence
 */
export class RequestRepository {
  constructor(private db: Database) {}

  /**
   * Insert a new request record
   */
  insert(record: Omit<RequestRecord, 'id'>): string {
    const id = `req-${record.agentId}-${record.timestamp}`;

    try {
      const stmt = this.db.prepare(`
        INSERT INTO requests (
          id, timestamp, agent_id, model, prompt_tokens,
          completion_tokens, latency_ms, cost_usd, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        record.timestamp,
        record.agentId,
        record.model,
        record.promptTokens,
        record.completionTokens,
        record.latencyMs,
        record.costUsd,
        record.status
      );

      return id;
    } catch (error) {
      logger.error('Failed to insert request record', { error, agentId: record.agentId });
      throw error;
    }
  }

  /**
   * Get requests for time range
   */
  getRange(
    startTime: number,
    endTime: number,
    agentId?: string,
    status?: string,
    limit: number = 1000
  ): RequestRecord[] {
    try {
      let query = `
        SELECT * FROM requests
        WHERE timestamp BETWEEN ? AND ?
      `;
      const params: any[] = [startTime, endTime];

      if (agentId) {
        query += ` AND agent_id = ?`;
        params.push(agentId);
      }

      if (status) {
        query += ` AND status = ?`;
        params.push(status);
      }

      query += ` ORDER BY timestamp DESC LIMIT ?`;
      params.push(limit);

      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params) as any[];

      return rows.map((row) => this.mapRow(row));
    } catch (error) {
      logger.error('Failed to fetch requests', { error, startTime, endTime, agentId, status });
      throw error;
    }
  }

  /**
   * Get request statistics for time range
   */
  getStats(startTime: number, endTime: number, agentId?: string) {
    try {
      let query = `
        SELECT
          COUNT(*) as total_requests,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
          SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors,
          SUM(CASE WHEN status = 'timeout' THEN 1 ELSE 0 END) as timeouts,
          AVG(latency_ms) as avg_latency,
          MAX(latency_ms) as max_latency,
          SUM(prompt_tokens) as total_prompt_tokens,
          SUM(completion_tokens) as total_completion_tokens,
          SUM(cost_usd) as total_cost
        FROM requests
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
        totalRequests: row?.total_requests || 0,
        successful: row?.successful || 0,
        errors: row?.errors || 0,
        timeouts: row?.timeouts || 0,
        avgLatencyMs: row?.avg_latency || 0,
        maxLatencyMs: row?.max_latency || 0,
        totalPromptTokens: row?.total_prompt_tokens || 0,
        totalCompletionTokens: row?.total_completion_tokens || 0,
        totalCostUsd: row?.total_cost || 0,
        successRate: row?.total_requests
          ? ((row.successful / row.total_requests) * 100).toFixed(2)
          : 0,
      };
    } catch (error) {
      logger.error('Failed to calculate request stats', { error, startTime, endTime, agentId });
      throw error;
    }
  }

  /**
   * Get error requests
   */
  getErrors(startTime: number, endTime: number, agentId?: string, limit: number = 100) {
    try {
      let query = `
        SELECT * FROM requests
        WHERE timestamp BETWEEN ? AND ?
        AND status IN ('error', 'timeout')
      `;
      const params: any[] = [startTime, endTime];

      if (agentId) {
        query += ` AND agent_id = ?`;
        params.push(agentId);
      }

      query += ` ORDER BY timestamp DESC LIMIT ?`;
      params.push(limit);

      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params) as any[];

      return rows.map((row) => this.mapRow(row));
    } catch (error) {
      logger.error('Failed to fetch error requests', { error, startTime, endTime, agentId });
      throw error;
    }
  }

  /**
   * Delete old requests
   */
  deleteOlderThan(timestamp: number): number {
    try {
      const stmt = this.db.prepare(`
        DELETE FROM requests WHERE timestamp < ?
      `);

      const result = stmt.run(timestamp);
      logger.info('Old requests deleted', { count: result.changes });

      return result.changes;
    } catch (error) {
      logger.error('Failed to delete old requests', { error, timestamp });
      throw error;
    }
  }

  /**
   * Map database row to record
   */
  private mapRow(row: any): RequestRecord {
    return {
      id: row.id,
      timestamp: row.timestamp,
      agentId: row.agent_id,
      model: row.model,
      promptTokens: row.prompt_tokens,
      completionTokens: row.completion_tokens,
      latencyMs: row.latency_ms,
      costUsd: row.cost_usd,
      status: row.status,
    };
  }
}
