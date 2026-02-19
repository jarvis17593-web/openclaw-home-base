/**
 * Requests API routes
 */

import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

interface Request {
  id: string;
  timestamp: number;
  agentId: string;
  model: string;
  status: 'success' | 'error' | 'pending';
  costUsd: number;
}

const router = Router();

/**
 * GET /api/requests
 * List all API requests
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const { agentId, limit = '100' } = req.query;

    // In a real implementation, this would query request logs from the database
    // For now, return an empty array
    const requests: Request[] = [];

    const filtered = agentId
      ? requests.filter((r) => r.agentId === String(agentId))
      : requests;

    const limited = filtered.slice(0, parseInt(String(limit)));
    res.json(limited);
  })
);

export default router;
