/**
 * Secrets API routes
 */

import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { getDB } from '../../db/encrypted';
import { SecretRepository } from '../../db/repositories';
import { SecretManagementService } from '../../services/secretManagementService';
import { logger } from '../../config/logger';

const router = Router();

/**
 * Get secret management service instance
 */
function getSecretService(): SecretManagementService {
  const db = getDB();
  const repository = new SecretRepository(db);
  return new SecretManagementService(repository);
}

/**
 * GET /api/secrets
 * List all secrets (without decryption)
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (_req: AuthRequest, res) => {
    const service = getSecretService();
    const secrets = service.getSecrets();
    res.json({ secrets, count: secrets.length });
  })
);

/**
 * GET /api/secrets/summary
 * Get rotation summary
 */
router.get(
  '/summary',
  authenticate,
  asyncHandler(async (_req: AuthRequest, res) => {
    const service = getSecretService();
    const summary = service.getRotationSummary();
    res.json(summary);
  })
);

/**
 * GET /api/secrets/expiring
 * Get secrets due for rotation
 */
router.get(
  '/expiring',
  authenticate,
  asyncHandler(async (_req: AuthRequest, res) => {
    const service = getSecretService();
    const { days } = _req.query;

    let expiring;
    if (days) {
      expiring = service.getSecretsExpiringInDays(parseInt(days as string));
    } else {
      expiring = service.getExpiringSecrets();
    }

    res.json({
      secrets: expiring,
      count: expiring.length,
    });
  })
);

/**
 * POST /api/secrets
 * Add new secret
 */
router.post(
  '/',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const { name, secretValue, secretType, rotationFrequencyDays, description, tags } =
      req.body;

    // Validation
    if (!name || !secretValue || !secretType) {
      return res.status(400).json({
        error: 'Missing required fields: name, secretValue, secretType',
      });
    }

    if (!['api_key', 'token', 'password', 'certificate'].includes(secretType)) {
      return res.status(400).json({
        error: 'Invalid secretType. Must be one of: api_key, token, password, certificate',
      });
    }

    const frequency = rotationFrequencyDays || 90;
    if (![30, 60, 90].includes(frequency)) {
      return res.status(400).json({
        error: 'Invalid rotationFrequencyDays. Must be 30, 60, or 90',
      });
    }

    const service = getSecretService();

    try {
      const result = service.addSecret(
        name,
        secretValue,
        secretType,
        frequency,
        description,
        tags
      );

      logger.info('Secret created via API', { name, type: secretType });

      return res.status(201).json({
        id: result.id,
        name,
        message: 'Secret created successfully',
        nextRotationDueAt: result.nextRotationDueAt,
      });
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        return res.status(409).json({ error: error.message });
      }
      throw error;
    }
  })
);

/**
 * PUT /api/secrets/:id/rotated
 * Mark secret as rotated
 */
router.put(
  '/:id/rotated',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Secret ID is required' });
    }

    const service = getSecretService();

    try {
      const result = service.markRotated(id);

      logger.info('Secret marked as rotated via API', { secretId: id });

      return res.json({
        id,
        message: 'Secret marked as rotated',
        nextRotationDueAt: result.nextRotationDueAt,
      });
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      throw error;
    }
  })
);

/**
 * DELETE /api/secrets/:id
 * Delete secret
 */
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Secret ID is required' });
    }

    const service = getSecretService();
    const success = service.deleteSecret(id);

    if (!success) {
      return res.status(404).json({ error: 'Secret not found' });
    }

    logger.info('Secret deleted via API', { secretId: id });

    return res.json({
      id,
      message: 'Secret deleted successfully',
    });
  })
);

/**
 * GET /api/secrets/:id
 * Get secret details (without value)
 */
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const { id } = req.params;

    const service = getSecretService();
    const secrets = service.getSecrets();
    const secret = secrets.find((s) => s.id === id);

    if (!secret) {
      return res.status(404).json({ error: 'Secret not found' });
    }

    return res.json(secret);
  })
);

export default router;
