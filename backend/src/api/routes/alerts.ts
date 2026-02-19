/**
 * Alerts API routes
 */

import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

interface Alert {
  id: string;
  timestamp: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  type: string;
  agentId?: string;
  message: string;
  acknowledged: boolean;
}

const router = Router();

/**
 * GET /api/alerts
 * List all alerts
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const { unread } = req.query;

    // In production, this would query alerts from the database
    // For now, return empty array
    const alerts: Alert[] = [];

    const filtered = unread === 'true' 
      ? alerts.filter((a) => !a.acknowledged)
      : alerts;

    res.json(filtered);
  })
);

/**
 * POST /api/alerts/:id/acknowledge
 * Acknowledge an alert
 */
router.post(
  '/:id/acknowledge',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    // In production, this would update the database
    // For now, just return success
    res.json({ status: 'acknowledged', id: req.params.id });
  })
);

export default router;
