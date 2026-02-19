/**
 * Resource Repository
 * Data access layer for resource metrics
 */

import { Database } from 'better-sqlite3';
import { logger } from '../../config/logger';

export interface ResourceSnapshot {
  id: string;
  timestamp: number;
  agentId: string;
  cpuPercent: number;
  memoryRss: number;
  memoryPercent: number;
  openFds: number;
}

/**
 * ResourceRepository manages resource metric persistence
 */
export class ResourceRepository {
  constructor(private db: Database) {}

  /**
   * Insert a resource snapshot
   */
  insert(snapshot: Omit<ResourceSnapshot, 'id'>): string {
    const id = `resource-${snapshot.agentId}-${snapshot.timestamp}`;

    try {
      const stmt = this.db.prepare(`
        INSERT INTO resource_snapshots (
          id, timestamp, agent_id, cpu_percent,
          memory_rss, memory_percent, open_fds
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        snapshot.timestamp,
        snapshot.agentId,
        snapshot.cpuPercent,
        snapshot.memoryRss,
        snapshot.memoryPercent,
        snapshot.openFds
      );

      return id;
    } catch (error) {
      logger.error('Failed to insert resource snapshot', { error, agentId: snapshot.agentId });
      throw error;
    }
  }

  /**
   * Get resource metrics for time range
   */
  getRange(
    startTime: number,
    endTime: number,
    agentId?: string,
    limit: number = 1000
  ): ResourceSnapshot[] {
    try {
      let query = `
        SELECT * FROM resource_snapshots
        WHERE timestamp BETWEEN ? AND ?
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
      logger.error('Failed to fetch resource metrics', { error, startTime, endTime, agentId });
      throw error;
    }
  }

  /**
   * Get latest snapshot for an agent
   */
  getLatest(agentId: string): ResourceSnapshot | null {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM resource_snapshots
        WHERE agent_id = ?
        ORDER BY timestamp DESC
        LIMIT 1
      `);

      const row = stmt.get(agentId) as any;
      return row ? this.mapRow(row) : null;
    } catch (error) {
      logger.error('Failed to fetch latest resource snapshot', { error, agentId });
      throw error;
    }
  }

  /**
   * Get average metrics for time range
   */
  getAverage(
    startTime: number,
    endTime: number,
    agentId?: string
  ): {
    avgCpuPercent: number;
    avgMemoryPercent: number;
    peakCpuPercent: number;
    peakMemoryPercent: number;
  } | null {
    try {
      let query = `
        SELECT
          AVG(cpu_percent) as avg_cpu,
          AVG(memory_percent) as avg_mem,
          MAX(cpu_percent) as peak_cpu,
          MAX(memory_percent) as peak_mem
        FROM resource_snapshots
        WHERE timestamp BETWEEN ? AND ?
      `;
      const params: any[] = [startTime, endTime];

      if (agentId) {
        query += ` AND agent_id = ?`;
        params.push(agentId);
      }

      const stmt = this.db.prepare(query);
      const row = stmt.get(...params) as any;

      if (!row) return null;

      return {
        avgCpuPercent: row.avg_cpu || 0,
        avgMemoryPercent: row.avg_mem || 0,
        peakCpuPercent: row.peak_cpu || 0,
        peakMemoryPercent: row.peak_mem || 0,
      };
    } catch (error) {
      logger.error('Failed to calculate average metrics', { error, startTime, endTime, agentId });
      throw error;
    }
  }

  /**
   * Delete old snapshots
   */
  deleteOlderThan(timestamp: number): number {
    try {
      const stmt = this.db.prepare(`
        DELETE FROM resource_snapshots WHERE timestamp < ?
      `);

      const result = stmt.run(timestamp);
      logger.info('Old resource snapshots deleted', { count: result.changes });

      return result.changes;
    } catch (error) {
      logger.error('Failed to delete old snapshots', { error, timestamp });
      throw error;
    }
  }

  /**
   * Map database row to snapshot
   */
  private mapRow(row: any): ResourceSnapshot {
    return {
      id: row.id,
      timestamp: row.timestamp,
      agentId: row.agent_id,
      cpuPercent: row.cpu_percent,
      memoryRss: row.memory_rss,
      memoryPercent: row.memory_percent,
      openFds: row.open_fds,
    };
  }
}
