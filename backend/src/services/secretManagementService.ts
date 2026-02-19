/**
 * Secret Management Service
 * Business logic for managing secrets and rotation policies
 */

import { logger } from '../config/logger';
import { encryptData, decryptData } from '../db/encrypted';
import { SecretRepository, SecretRecord, SecretInput } from '../db/repositories/secretRepository';

export interface SecretForDisplay {
  id: string;
  name: string;
  description?: string;
  secretType: string;
  rotationFrequencyDays: number;
  lastRotatedAt?: number;
  nextRotationDueAt: number;
  daysUntilRotation: number;
  status: string;
  tags?: string;
  createdAt: number;
}

export interface SecretRotationSummary {
  totalSecrets: number;
  dueForRotation: number;
  expiringInSevenDays: number;
  active: number;
  statusBreakdown: Record<string, number>;
}

/**
 * SecretManagementService handles secret management operations
 */
export class SecretManagementService {
  constructor(private repository: SecretRepository) {}

  /**
   * Add a new secret with rotation policy
   */
  addSecret(
    name: string,
    secretValue: string,
    secretType: 'api_key' | 'token' | 'password' | 'certificate',
    rotationFrequencyDays: 30 | 60 | 90 = 90,
    description?: string,
    tags?: string
  ): { id: string; nextRotationDueAt: number } {
    try {
      // Check if secret already exists
      const existing = this.repository.getByName(name);
      if (existing) {
        throw new Error(`Secret with name '${name}' already exists`);
      }

      // Encrypt the secret value
      const { iv, encrypted, authTag } = encryptData(secretValue);

      // Calculate next rotation date
      const nextRotationDueAt = this.calculateNextRotation(rotationFrequencyDays);

      const secretInput: SecretInput = {
        name,
        secretType,
        encryptedValue: encrypted,
        iv,
        authTag,
        rotationFrequencyDays,
        description,
        tags,
      };

      const secretId = this.repository.insert(secretInput, nextRotationDueAt);

      logger.info('Secret added successfully', {
        secretId,
        name,
        type: secretType,
        rotationDays: rotationFrequencyDays,
      });

      return { id: secretId, nextRotationDueAt };
    } catch (error) {
      logger.error('Failed to add secret', { error, name });
      throw error;
    }
  }

  /**
   * Get all secrets (for display, without decryption)
   */
  getSecrets(): SecretForDisplay[] {
    try {
      const records = this.repository.getAll();
      return records.map((record) => this.recordToDisplay(record));
    } catch (error) {
      logger.error('Failed to get secrets', { error });
      throw error;
    }
  }

  /**
   * Get secret value (requires decryption)
   */
  getSecretValue(id: string): string | null {
    try {
      const record = this.repository.getById(id);
      if (!record) {
        return null;
      }

      return decryptData(record.encryptedValue, record.iv, record.authTag);
    } catch (error) {
      logger.error('Failed to get secret value', { error, id });
      throw error;
    }
  }

  /**
   * Get secrets due for rotation
   */
  getExpiringSecrets(): SecretForDisplay[] {
    try {
      const records = this.repository.getExpiringSecrets();
      return records.map((record) => this.recordToDisplay(record));
    } catch (error) {
      logger.error('Failed to get expiring secrets', { error });
      throw error;
    }
  }

  /**
   * Get secrets expiring in next N days
   */
  getSecretsExpiringInDays(days: number = 7): SecretForDisplay[] {
    try {
      const records = this.repository.getExpiringInDays(days);
      return records.map((record) => this.recordToDisplay(record));
    } catch (error) {
      logger.error('Failed to get secrets expiring soon', { error, days });
      throw error;
    }
  }

  /**
   * Mark secret as rotated
   */
  markRotated(id: string): { nextRotationDueAt: number } {
    try {
      const record = this.repository.getById(id);
      if (!record) {
        throw new Error(`Secret with ID '${id}' not found`);
      }

      // Calculate next rotation date
      const nextRotationDueAt = this.calculateNextRotation(
        record.rotationFrequencyDays
      );

      const success = this.repository.markRotated(id, nextRotationDueAt);
      if (!success) {
        throw new Error('Failed to update secret rotation status');
      }

      logger.info('Secret marked as rotated', { secretId: id });

      return { nextRotationDueAt };
    } catch (error) {
      logger.error('Failed to mark secret as rotated', { error, id });
      throw error;
    }
  }

  /**
   * Calculate next rotation date based on frequency
   */
  calculateNextRotation(frequencyDays: number): number {
    const now = Date.now();
    const rotationMs = frequencyDays * 24 * 60 * 60 * 1000;
    return now + rotationMs;
  }

  /**
   * Get rotation due count
   */
  getRotationDueCount(): number {
    try {
      return this.repository.getRotationDueCount();
    } catch (error) {
      logger.error('Failed to get rotation due count', { error });
      throw error;
    }
  }

  /**
   * Sync secret statuses (update status based on rotation date)
   */
  syncSecretStatuses(): void {
    try {
      const allSecrets = this.repository.getAll();
      const now = Date.now();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

      for (const secret of allSecrets) {
        let newStatus: 'active' | 'expiring_soon' | 'expired';

        if (secret.nextRotationDueAt <= now) {
          newStatus = 'expired';
        } else if (secret.nextRotationDueAt <= now + sevenDaysMs) {
          newStatus = 'expiring_soon';
        } else {
          newStatus = 'active';
        }

        if (newStatus !== secret.status) {
          this.repository.updateStatus(secret.id, newStatus);
          logger.info('Secret status updated', {
            secretId: secret.id,
            oldStatus: secret.status,
            newStatus,
          });
        }
      }
    } catch (error) {
      logger.error('Failed to sync secret statuses', { error });
      throw error;
    }
  }

  /**
   * Get rotation summary
   */
  getRotationSummary(): SecretRotationSummary {
    try {
      this.syncSecretStatuses();

      const allSecrets = this.repository.getAll();
      const expiringSecrets = this.repository.getExpiringSecrets();
      const expiringInSevenDays = this.repository.getExpiringInDays(7);
      const statusCounts = this.repository.countByStatus();

      return {
        totalSecrets: allSecrets.length,
        dueForRotation: expiringSecrets.length,
        expiringInSevenDays: expiringInSevenDays.length,
        active: statusCounts.active,
        statusBreakdown: statusCounts,
      };
    } catch (error) {
      logger.error('Failed to get rotation summary', { error });
      throw error;
    }
  }

  /**
   * Delete secret
   */
  deleteSecret(id: string): boolean {
    try {
      const success = this.repository.delete(id);
      if (success) {
        logger.info('Secret deleted', { secretId: id });
      }
      return success;
    } catch (error) {
      logger.error('Failed to delete secret', { error, id });
      throw error;
    }
  }

  /**
   * Convert record to display format (includes calculated fields)
   */
  private recordToDisplay(record: SecretRecord): SecretForDisplay {
    const now = Date.now();
    const daysUntilRotation = Math.max(
      0,
      Math.ceil((record.nextRotationDueAt - now) / (24 * 60 * 60 * 1000))
    );

    return {
      id: record.id,
      name: record.name,
      description: record.description,
      secretType: record.secretType,
      rotationFrequencyDays: record.rotationFrequencyDays,
      lastRotatedAt: record.lastRotatedAt,
      nextRotationDueAt: record.nextRotationDueAt,
      daysUntilRotation,
      status: record.status,
      tags: record.tags,
      createdAt: record.createdAt,
    };
  }
}
