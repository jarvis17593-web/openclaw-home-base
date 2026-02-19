/**
 * Secret Repository
 * Data access layer for secret management
 */

import { logger } from '../../config/logger';

type Database = any;

export interface SecretRecord {
  id: string;
  name: string;
  description?: string;
  secretType: 'api_key' | 'token' | 'password' | 'certificate';
  encryptedValue: string;
  iv: string;
  authTag: string;
  rotationFrequencyDays: number;
  lastRotatedAt?: number;
  nextRotationDueAt: number;
  status: 'active' | 'expiring_soon' | 'expired';
  tags?: string;
  createdAt: number;
  updatedAt: number;
}

export interface SecretInput {
  name: string;
  description?: string;
  secretType: 'api_key' | 'token' | 'password' | 'certificate';
  encryptedValue: string;
  iv: string;
  authTag: string;
  rotationFrequencyDays: 30 | 60 | 90;
  tags?: string;
}

/**
 * SecretRepository manages secret data persistence
 */
export class SecretRepository {
  constructor(private db: Database) {}

  /**
   * Insert a new secret
   */
  insert(record: SecretInput, nextRotationDueAt: number): string {
    const id = `secret-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      const stmt = this.db.prepare(`
        INSERT INTO secrets_management (
          id, name, description, secret_type, encrypted_value,
          iv, auth_tag, rotation_frequency_days, next_rotation_due_at,
          status, tags, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const now = Date.now();

      stmt.run(
        id,
        record.name,
        record.description || null,
        record.secretType,
        record.encryptedValue,
        record.iv,
        record.authTag,
        record.rotationFrequencyDays,
        nextRotationDueAt,
        'active',
        record.tags || null,
        now,
        now
      );

      logger.info('Secret inserted', { secretId: id, name: record.name });
      return id;
    } catch (error) {
      logger.error('Failed to insert secret', { error, name: record.name });
      throw error;
    }
  }

  /**
   * Get all secrets
   */
  getAll(): SecretRecord[] {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM secrets_management
        ORDER BY name ASC
      `);

      const rows = stmt.all() as any[];
      return rows.map((row) => this.mapRow(row));
    } catch (error) {
      logger.error('Failed to fetch all secrets', { error });
      throw error;
    }
  }

  /**
   * Get secret by ID
   */
  getById(id: string): SecretRecord | null {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM secrets_management WHERE id = ?
      `);

      const row = stmt.get(id) as any;
      return row ? this.mapRow(row) : null;
    } catch (error) {
      logger.error('Failed to fetch secret by ID', { error, id });
      throw error;
    }
  }

  /**
   * Get secret by name
   */
  getByName(name: string): SecretRecord | null {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM secrets_management WHERE name = ?
      `);

      const row = stmt.get(name) as any;
      return row ? this.mapRow(row) : null;
    } catch (error) {
      logger.error('Failed to fetch secret by name', { error, name });
      throw error;
    }
  }

  /**
   * Get secrets expiring soon (due for rotation)
   */
  getExpiringSecrets(beforeTimestamp?: number): SecretRecord[] {
    try {
      const checkTime = beforeTimestamp || Date.now();

      const stmt = this.db.prepare(`
        SELECT * FROM secrets_management
        WHERE next_rotation_due_at <= ?
        ORDER BY next_rotation_due_at ASC
      `);

      const rows = stmt.all(checkTime) as any[];
      return rows.map((row) => this.mapRow(row));
    } catch (error) {
      logger.error('Failed to fetch expiring secrets', { error });
      throw error;
    }
  }

  /**
   * Get secrets expiring in next N days
   */
  getExpiringInDays(days: number = 7): SecretRecord[] {
    try {
      const now = Date.now();
      const checkTime = now + days * 24 * 60 * 60 * 1000;

      const stmt = this.db.prepare(`
        SELECT * FROM secrets_management
        WHERE next_rotation_due_at > ? AND next_rotation_due_at <= ?
        AND status != 'expired'
        ORDER BY next_rotation_due_at ASC
      `);

      const rows = stmt.all(now, checkTime) as any[];
      return rows.map((row) => this.mapRow(row));
    } catch (error) {
      logger.error('Failed to fetch secrets expiring soon', { error, days });
      throw error;
    }
  }

  /**
   * Count secrets needing rotation
   */
  getRotationDueCount(): number {
    try {
      const stmt = this.db.prepare(`
        SELECT COUNT(*) as count FROM secrets_management
        WHERE next_rotation_due_at <= ?
      `);

      const result = stmt.get(Date.now()) as any;
      return result?.count || 0;
    } catch (error) {
      logger.error('Failed to count rotation due secrets', { error });
      throw error;
    }
  }

  /**
   * Mark secret as rotated and update next rotation date
   */
  markRotated(id: string, nextRotationDueAt: number): boolean {
    try {
      const stmt = this.db.prepare(`
        UPDATE secrets_management
        SET last_rotated_at = ?,
            next_rotation_due_at = ?,
            status = 'active',
            updated_at = ?
        WHERE id = ?
      `);

      const now = Date.now();
      const result = stmt.run(now, nextRotationDueAt, now, id);

      if (result.changes > 0) {
        logger.info('Secret marked as rotated', { secretId: id });
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Failed to mark secret as rotated', { error, id });
      throw error;
    }
  }

  /**
   * Update secret status
   */
  updateStatus(id: string, status: 'active' | 'expiring_soon' | 'expired'): boolean {
    try {
      const stmt = this.db.prepare(`
        UPDATE secrets_management
        SET status = ?, updated_at = ?
        WHERE id = ?
      `);

      const result = stmt.run(status, Date.now(), id);
      return result.changes > 0;
    } catch (error) {
      logger.error('Failed to update secret status', { error, id, status });
      throw error;
    }
  }

  /**
   * Delete secret by ID
   */
  delete(id: string): boolean {
    try {
      const stmt = this.db.prepare(`
        DELETE FROM secrets_management WHERE id = ?
      `);

      const result = stmt.run(id);
      if (result.changes > 0) {
        logger.info('Secret deleted', { secretId: id });
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Failed to delete secret', { error, id });
      throw error;
    }
  }

  /**
   * Get secrets by type
   */
  getByType(secretType: string): SecretRecord[] {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM secrets_management
        WHERE secret_type = ?
        ORDER BY name ASC
      `);

      const rows = stmt.all(secretType) as any[];
      return rows.map((row) => this.mapRow(row));
    } catch (error) {
      logger.error('Failed to fetch secrets by type', { error, secretType });
      throw error;
    }
  }

  /**
   * Count secrets by status
   */
  countByStatus(): Record<string, number> {
    try {
      const stmt = this.db.prepare(`
        SELECT status, COUNT(*) as count
        FROM secrets_management
        GROUP BY status
      `);

      const rows = stmt.all() as any[];
      const result: Record<string, number> = {
        active: 0,
        expiring_soon: 0,
        expired: 0,
      };

      for (const row of rows) {
        result[row.status] = row.count;
      }

      return result;
    } catch (error) {
      logger.error('Failed to count secrets by status', { error });
      throw error;
    }
  }

  /**
   * Map database row to record
   */
  private mapRow(row: any): SecretRecord {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      secretType: row.secret_type,
      encryptedValue: row.encrypted_value,
      iv: row.iv,
      authTag: row.auth_tag,
      rotationFrequencyDays: row.rotation_frequency_days,
      lastRotatedAt: row.last_rotated_at,
      nextRotationDueAt: row.next_rotation_due_at,
      status: row.status,
      tags: row.tags,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
