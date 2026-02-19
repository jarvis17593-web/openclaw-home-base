/**
 * Cost Repository
 * Data access layer for cost records
 */

// import { Database } from 'better-sqlite3';
import { logger } from '../../config/logger';

type Database = any;

export interface CostRecord {
  id: string;
  timestamp: number;
  agentId: string;
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  checksum: string;
}

/**
 * CostRepository manages cost data persistence
 */
export class CostRepository {
  constructor(private db: Database) {}

  /**
   * Insert a new cost record
   */
  insert(record: Omit<CostRecord, 'id'>): string {
    const id = `cost-${record.agentId}-${record.timestamp}`;

    try {
      const stmt = this.db.prepare(`
        INSERT INTO costs (
          id, timestamp, agent_id, provider, model,
          tokens_in, tokens_out, cost_usd, checksum
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        record.timestamp,
        record.agentId,
        record.provider,
        record.model,
        record.tokensIn,
        record.tokensOut,
        record.costUsd,
        record.checksum
      );

      logger.info('Cost record inserted', { agentId: record.agentId, costUsd: record.costUsd });
      return id;
    } catch (error) {
      logger.error('Failed to insert cost record', { error, record });
      throw error;
    }
  }

  /**
   * Get costs for a time range
   */
  getRange(startTime: number, endTime: number, agentId?: string): CostRecord[] {
    try {
      let query = `
        SELECT * FROM costs
        WHERE timestamp BETWEEN ? AND ?
      `;
      const params: any[] = [startTime, endTime];

      if (agentId) {
        query += ` AND agent_id = ?`;
        params.push(agentId);
      }

      query += ` ORDER BY timestamp DESC`;

      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params) as any[];

      return rows.map((row) => this.mapRow(row));
    } catch (error) {
      logger.error('Failed to fetch costs', { error, startTime, endTime, agentId });
      throw error;
    }
  }

  /**
   * Get latest costs for agents
   */
  getLatestByAgent(agentId: string, limit: number = 100): CostRecord[] {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM costs
        WHERE agent_id = ?
        ORDER BY timestamp DESC
        LIMIT ?
      `);

      const rows = stmt.all(agentId, limit) as any[];
      return rows.map((row) => this.mapRow(row));
    } catch (error) {
      logger.error('Failed to fetch agent costs', { error, agentId });
      throw error;
    }
  }

  /**
   * Get total cost for time window
   */
  getTotalCost(startTime: number, endTime: number, agentId?: string): number {
    try {
      let query = `
        SELECT SUM(cost_usd) as total FROM costs
        WHERE timestamp BETWEEN ? AND ?
      `;
      const params: any[] = [startTime, endTime];

      if (agentId) {
        query += ` AND agent_id = ?`;
        params.push(agentId);
      }

      const stmt = this.db.prepare(query);
      const result = stmt.get(...params) as any;

      return result?.total || 0;
    } catch (error) {
      logger.error('Failed to calculate total cost', { error, startTime, endTime, agentId });
      throw error;
    }
  }

  /**
   * Count records for time window
   */
  count(startTime: number, endTime: number, agentId?: string): number {
    try {
      let query = `
        SELECT COUNT(*) as count FROM costs
        WHERE timestamp BETWEEN ? AND ?
      `;
      const params: any[] = [startTime, endTime];

      if (agentId) {
        query += ` AND agent_id = ?`;
        params.push(agentId);
      }

      const stmt = this.db.prepare(query);
      const result = stmt.get(...params) as any;

      return result?.count || 0;
    } catch (error) {
      logger.error('Failed to count costs', { error, startTime, endTime, agentId });
      throw error;
    }
  }

  /**
   * Delete old cost records (for cleanup)
   */
  deleteOlderThan(timestamp: number): number {
    try {
      const stmt = this.db.prepare(`
        DELETE FROM costs WHERE timestamp < ?
      `);

      const result = stmt.run(timestamp);
      logger.info('Old cost records deleted', { count: result.changes });

      return result.changes;
    } catch (error) {
      logger.error('Failed to delete old costs', { error, timestamp });
      throw error;
    }
  }

  /**
   * Map database row to record
   */
  private mapRow(row: any): CostRecord {
    return {
      id: row.id,
      timestamp: row.timestamp,
      agentId: row.agent_id,
      provider: row.provider,
      model: row.model,
      tokensIn: row.tokens_in,
      tokensOut: row.tokens_out,
      costUsd: row.cost_usd,
      checksum: row.checksum,
    };
  }
}
