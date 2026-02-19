/**
 * Error Tracking API routes
 */

import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { getDB } from '../../db/encrypted';
import { ErrorRepository } from '../../db/repositories';
import { logger } from '../../config/logger';

const router = Router();

/**
 * GET /api/errors
 * List errors with optional filtering
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const {
      agentId,
      errorType,
      hoursBack = '24',
      limit = '100',
    } = req.query;

    const db = getDB();
    const errorRepo = new ErrorRepository(db);

    const startTime = Date.now() - parseInt(String(hoursBack)) * 60 * 60 * 1000;
    const endTime = Date.now();

    const errors = errorRepo.getRange(
      startTime,
      endTime,
      agentId ? String(agentId) : undefined,
      errorType ? String(errorType) : undefined,
      parseInt(String(limit))
    );

    res.json({
      errors,
      count: errors.length,
      timeRange: {
        startTime,
        endTime,
        hoursBack: parseInt(String(hoursBack)),
      },
    });
  })
);

/**
 * GET /api/errors/unresolved
 * List unresolved errors
 */
router.get(
  '/unresolved',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const { limit = '50' } = req.query;

    const db = getDB();
    const errorRepo = new ErrorRepository(db);

    const errors = errorRepo.getUnresolved(parseInt(String(limit)));

    res.json({
      errors,
      count: errors.length,
    });
  })
);

/**
 * GET /api/errors/stats
 * Get error statistics
 */
router.get(
  '/stats',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const { agentId, hoursBack = '24' } = req.query;

    const db = getDB();
    const errorRepo = new ErrorRepository(db);

    const startTime = Date.now() - parseInt(String(hoursBack)) * 60 * 60 * 1000;
    const endTime = Date.now();

    const stats = errorRepo.getStats(
      startTime,
      endTime,
      agentId ? String(agentId) : undefined
    );

    const distribution = errorRepo.getDistribution(
      startTime,
      endTime,
      agentId ? String(agentId) : undefined
    );

    res.json({
      stats,
      distribution,
      timeRange: {
        startTime,
        endTime,
        hoursBack: parseInt(String(hoursBack)),
      },
    });
  })
);

/**
 * GET /api/errors/trends
 * Get error trends over time
 */
router.get(
  '/trends',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const { hoursBack = '24', bucketSizeMin = '30' } = req.query;

    const db = getDB();
    const errorRepo = new ErrorRepository(db);

    const startTime = Date.now() - parseInt(String(hoursBack)) * 60 * 60 * 1000;
    const endTime = Date.now();
    const bucketSizeMs = parseInt(String(bucketSizeMin)) * 60 * 1000;

    const trends = errorRepo.getTrends(startTime, endTime, bucketSizeMs);

    res.json({
      trends,
      timeRange: {
        startTime,
        endTime,
        hoursBack: parseInt(String(hoursBack)),
        bucketSizeMin: parseInt(String(bucketSizeMin)),
      },
    });
  })
);

/**
 * POST /api/errors
 * Record a new error
 */
router.post(
  '/',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const { agentId, errorType, errorMessage, errorCode, requestId } = req.body;

    if (!agentId || !errorType || !errorMessage) {
      res.status(400).json({
        error: 'Missing required fields: agentId, errorType, errorMessage',
      });
      return;
    }

    try {
      const db = getDB();
      const errorRepo = new ErrorRepository(db);

      const errorId = errorRepo.insert(
        agentId,
        errorType,
        errorMessage,
        errorCode,
        requestId
      );

      logger.info('Error recorded via API', {
        errorId,
        agentId,
        errorType,
      });

      res.status(201).json({
        id: errorId,
        message: 'Error recorded successfully',
      });
    } catch (error) {
      logger.error('Failed to record error', { error });
      res.status(500).json({
        error: 'Failed to record error',
      });
    }
  })
);

/**
 * PUT /api/errors/:id/resolve
 * Mark error as resolved
 */
router.put(
  '/:id/resolve',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const { id } = req.params;
    const { resolutionNotes } = req.body;

    try {
      const db = getDB();
      const errorRepo = new ErrorRepository(db);

      errorRepo.markResolved(id, resolutionNotes);

      logger.info('Error marked resolved', { errorId: id });

      res.json({
        message: 'Error marked as resolved',
      });
    } catch (error) {
      logger.error('Failed to resolve error', { error, errorId: id });
      res.status(500).json({
        error: 'Failed to resolve error',
      });
    }
  })
);

export default router;
