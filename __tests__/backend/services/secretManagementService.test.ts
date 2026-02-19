import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../../backend/src/config/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../../backend/src/db/encrypted', () => ({
  encryptData: (data: string) => ({
    iv: 'test-iv',
    encrypted: 'encrypted-' + data,
    authTag: 'test-tag',
  }),
  decryptData: (encrypted: string) => encrypted.replace('encrypted-', ''),
}));

import { SecretManagementService } from '../../../backend/src/services/secretManagementService';

describe('SecretManagementService', () => {
  let service: SecretManagementService;
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      getAll: vi.fn(() => []),
      getById: vi.fn(() => null),
      getByName: vi.fn(() => null),
      getExpiringSecrets: vi.fn(() => []),
      getExpiringInDays: vi.fn(() => []),
      getRotationDueCount: vi.fn(() => 0),
      insert: vi.fn(() => 'secret-id-123'),
      markRotated: vi.fn(() => true),
      updateStatus: vi.fn(() => true),
      delete: vi.fn(() => true),
      getByType: vi.fn(() => []),
      countByStatus: vi.fn(() => ({ active: 0, expiring_soon: 0, expired: 0 })),
    };

    service = new SecretManagementService(mockRepository);
  });

  describe('addSecret', () => {
    it('adds a new secret with correct parameters', () => {
      const result = service.addSecret(
        'test-api-key',
        'secret-value-123',
        'api_key',
        90,
        'Test API key',
        'production'
      );

      expect(mockRepository.insert).toHaveBeenCalled();
      expect(result.id).toBe('secret-id-123');
      expect(result.nextRotationDueAt).toBeGreaterThan(Date.now());
    });

    it('throws error if secret with same name exists', () => {
      mockRepository.getByName.mockReturnValue({
        id: 'existing-secret',
        name: 'test-api-key',
      });

      expect(() => {
        service.addSecret(
          'test-api-key',
          'secret-value-123',
          'api_key',
          90
        );
      }).toThrow('already exists');
    });

    it('uses default rotation frequency of 90 days', () => {
      service.addSecret(
        'test-secret',
        'value',
        'token'
      );

      const callArgs = mockRepository.insert.mock.calls[0][0];
      expect(callArgs.rotationFrequencyDays).toBe(90);
    });
  });

  describe('getSecrets', () => {
    it('returns empty array when no secrets exist', () => {
      const secrets = service.getSecrets();
      expect(secrets).toEqual([]);
    });

    it('returns secrets in display format', () => {
      mockRepository.getAll.mockReturnValue([
        {
          id: 'secret-1',
          name: 'api-key',
          secretType: 'api_key',
          rotationFrequencyDays: 90,
          nextRotationDueAt: Date.now() + 90 * 24 * 60 * 60 * 1000,
          lastRotatedAt: Date.now(),
          status: 'active',
          createdAt: Date.now(),
        },
      ]);

      const secrets = service.getSecrets();
      expect(secrets.length).toBe(1);
      expect(secrets[0].name).toBe('api-key');
      expect(secrets[0].daysUntilRotation).toBeGreaterThan(0);
    });
  });

  describe('getSecretValue', () => {
    it('returns null if secret does not exist', () => {
      mockRepository.getById.mockReturnValue(null);
      const value = service.getSecretValue('nonexistent');
      expect(value).toBeNull();
    });

    it('decrypts and returns secret value', () => {
      mockRepository.getById.mockReturnValue({
        id: 'secret-1',
        encryptedValue: 'encrypted-my-secret',
        iv: 'iv',
        authTag: 'tag',
      });

      const value = service.getSecretValue('secret-1');
      expect(value).toBe('my-secret');
    });
  });

  describe('markRotated', () => {
    it('marks secret as rotated and calculates next rotation', () => {
      mockRepository.getById.mockReturnValue({
        id: 'secret-1',
        rotationFrequencyDays: 60,
        nextRotationDueAt: Date.now(),
      });

      const result = service.markRotated('secret-1');
      
      expect(mockRepository.markRotated).toHaveBeenCalledWith(
        'secret-1',
        expect.any(Number)
      );
      expect(result.nextRotationDueAt).toBeGreaterThan(Date.now());
    });

    it('throws error if secret does not exist', () => {
      mockRepository.getById.mockReturnValue(null);
      
      expect(() => {
        service.markRotated('nonexistent');
      }).toThrow('not found');
    });
  });

  describe('calculateNextRotation', () => {
    it('calculates correct next rotation for 30 days', () => {
      const before = Date.now();
      const next = service.calculateNextRotation(30);
      const after = Date.now();

      const expectedMin = before + 30 * 24 * 60 * 60 * 1000;
      const expectedMax = after + 30 * 24 * 60 * 60 * 1000;

      expect(next).toBeGreaterThanOrEqual(expectedMin);
      expect(next).toBeLessThanOrEqual(expectedMax);
    });

    it('calculates correct next rotation for 60 days', () => {
      const before = Date.now();
      const next = service.calculateNextRotation(60);
      const after = Date.now();

      const expectedMin = before + 60 * 24 * 60 * 60 * 1000;
      const expectedMax = after + 60 * 24 * 60 * 60 * 1000;

      expect(next).toBeGreaterThanOrEqual(expectedMin);
      expect(next).toBeLessThanOrEqual(expectedMax);
    });

    it('calculates correct next rotation for 90 days', () => {
      const before = Date.now();
      const next = service.calculateNextRotation(90);
      const after = Date.now();

      const expectedMin = before + 90 * 24 * 60 * 60 * 1000;
      const expectedMax = after + 90 * 24 * 60 * 60 * 1000;

      expect(next).toBeGreaterThanOrEqual(expectedMin);
      expect(next).toBeLessThanOrEqual(expectedMax);
    });
  });

  describe('getRotationDueCount', () => {
    it('returns count from repository', () => {
      mockRepository.getRotationDueCount.mockReturnValue(5);
      const count = service.getRotationDueCount();
      expect(count).toBe(5);
    });
  });

  describe('syncSecretStatuses', () => {
    it('updates statuses based on rotation dates', () => {
      const now = Date.now();
      mockRepository.getAll.mockReturnValue([
        {
          id: 'expired',
          status: 'active',
          nextRotationDueAt: now - 1000, // 1s ago — expired
        },
        {
          id: 'expiring-soon',
          status: 'active',
          nextRotationDueAt: now + 3 * 24 * 60 * 60 * 1000, // 3 days — expiring soon
        },
        {
          id: 'active',
          status: 'active',
          nextRotationDueAt: now + 30 * 24 * 60 * 60 * 1000, // 30 days — active
        },
      ]);

      service.syncSecretStatuses();

      const calls = mockRepository.updateStatus.mock.calls;
      expect(calls.some((c: any) => c[0] === 'expired' && c[1] === 'expired')).toBe(true);
      expect(calls.some((c: any) => c[0] === 'expiring-soon' && c[1] === 'expiring_soon')).toBe(true);
    });
  });

  describe('getRotationSummary', () => {
    it('returns summary with all fields', () => {
      mockRepository.getAll.mockReturnValue([
        { id: '1', status: 'active' },
        { id: '2', status: 'expiring_soon' },
      ]);
      mockRepository.getExpiringSecrets.mockReturnValue([
        { id: '2' },
      ]);
      mockRepository.getExpiringInDays.mockReturnValue([
        { id: '2' },
      ]);
      mockRepository.countByStatus.mockReturnValue({
        active: 1,
        expiring_soon: 1,
        expired: 0,
      });

      const summary = service.getRotationSummary();

      expect(summary.totalSecrets).toBe(2);
      expect(summary.dueForRotation).toBe(1);
      expect(summary.expiringInSevenDays).toBe(1);
      expect(summary.active).toBe(1);
      expect(summary.statusBreakdown).toEqual({
        active: 1,
        expiring_soon: 1,
        expired: 0,
      });
    });
  });

  describe('deleteSecret', () => {
    it('deletes secret and returns true', () => {
      mockRepository.delete.mockReturnValue(true);
      const result = service.deleteSecret('secret-1');
      expect(result).toBe(true);
      expect(mockRepository.delete).toHaveBeenCalledWith('secret-1');
    });

    it('returns false if secret not found', () => {
      mockRepository.delete.mockReturnValue(false);
      const result = service.deleteSecret('nonexistent');
      expect(result).toBe(false);
    });
  });
});
