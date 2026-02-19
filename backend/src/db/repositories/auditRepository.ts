/**
 * Audit Repository
 * Data access layer for audit logs
 */

// import { Database } from 'better-sqlite3';
import { logger } from '../../config/logger';

type Database = any;

export interface AuditLogRecord {
  id: string;
  timestamp: number;
  actor: string;
  action: string;
  resource: string;
  before?: string;
  after?: string;
}

/**
 * AuditRepository manages audit log persistence
 */
export class AuditRepository {
  constructor(private db: Database) {}

  /**
   * Insert a new audit log
   */
  insert(record: Omit<AuditLogRecord, 'id'>): string {
    const id = `audit-${record.actor}-${record.timestamp}`;

    try {
      const stmt = this.db.prepare(`
        INSERT INTO audit_logs (
          id, timestamp, actor, action, resource, before, after
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        record.timestamp,
        record.actor,
        record.action,
        record.resource,
        record.before || null,
        record.after || null
      );

      logger.info('Audit log created', {
        actor: record.actor,
        action: record.action,
        resource: record.resource,
      });

      return id;
    } catch (error) {
      logger.error('Failed to insert audit log', { error, record });
      throw error;
    }
  }

  /**
   * Get audit logs for time range
   */
  getRange(
    startTime: number,
    endTime: number,
    actor?: string,
    action?: string,
    limit: number = 1000
  ): AuditLogRecord[] {
    try {
      let query = `
        SELECT * FROM audit_logs
        WHERE timestamp BETWEEN ? AND ?
      `;
      const params: any[] = [startTime, endTime];

      if (actor) {
        query += ` AND actor = ?`;
        params.push(actor);
      }

      if (action) {
        query += ` AND action = ?`;
        params.push(action);
      }

      query += ` ORDER BY timestamp DESC LIMIT ?`;
      params.push(limit);

      const stmt = this.db.prepare(query);
      const rows = stmt.all(...params) as any[];

      return rows.map((row) => this.mapRow(row));
    } catch (error) {
      logger.error('Failed to fetch audit logs', { error, startTime, endTime, actor, action });
      throw error;
    }
  }

  /**
   * Get logs for a specific resource
   */
  getByResource(resource: string, limit: number = 100): AuditLogRecord[] {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM audit_logs
        WHERE resource = ?
        ORDER BY timestamp DESC
        LIMIT ?
      `);

      const rows = stmt.all(resource, limit) as any[];
      return rows.map((row) => this.mapRow(row));
    } catch (error) {
      logger.error('Failed to fetch resource audit logs', { error, resource });
      throw error;
    }
  }

  /**
   * Get logs for a specific actor
   */
  getByActor(actor: string, limit: number = 100): AuditLogRecord[] {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM audit_logs
        WHERE actor = ?
        ORDER BY timestamp DESC
        LIMIT ?
      `);

      const rows = stmt.all(actor, limit) as any[];
      return rows.map((row) => this.mapRow(row));
    } catch (error) {
      logger.error('Failed to fetch actor audit logs', { error, actor });
      throw error;
    }
  }

  /**
   * Delete old audit logs (retention policy)
   */
  deleteOlderThan(timestamp: number): number {
    try {
      const stmt = this.db.prepare(`
        DELETE FROM audit_logs WHERE timestamp < ?
      `);

      const result = stmt.run(timestamp);
      logger.info('Old audit logs deleted', { count: result.changes });

      return result.changes;
    } catch (error) {
      logger.error('Failed to delete old audit logs', { error, timestamp });
      throw error;
    }
  }

  /**
   * Map database row to record
   */
  private mapRow(row: any): AuditLogRecord {
    return {
      id: row.id,
      timestamp: row.timestamp,
      actor: row.actor,
      action: row.action,
      resource: row.resource,
      before: row.before,
      after: row.after,
    };
  }
}
