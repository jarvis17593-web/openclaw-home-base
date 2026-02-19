/**
 * Agents API routes
 */

import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { getGatewayClient } from '../../services';

const router = Router();

/**
 * GET /api/agents
 * List all agents
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (_req: AuthRequest, res) => {
    const gateway = getGatewayClient();
    const agents = await gateway.getAgents();

    res.json({
      data: agents,
      count: agents.length,
    });
  })
);

/**
 * GET /api/agents/:id
 * Get agent details
 */
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const { id } = req.params;
    const gateway = getGatewayClient();
    const agents = await gateway.getAgents();
    const agent = agents.find((a) => a.id === id);

    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    // Fetch metrics for this agent
    const resources = await gateway.getResources(id);
    const latestResource = resources[0] || null;

    res.json({
      data: {
        ...agent,
        metrics: latestResource,
      },
    });
  })
);

/**
 * GET /api/agents/:id/costs
 * Get cost data for an agent
 */
router.get(
  '/:id/costs',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const { id } = req.params;
    const { days = 30 } = req.query;

    const gateway = getGatewayClient();
    const now = Date.now();
    const startTime = now - parseInt(String(days)) * 24 * 60 * 60 * 1000;

    const costs = await gateway.getCosts(id);
    const filtered = costs.filter((c) => c.timestamp >= startTime && c.timestamp <= now);

    res.json({
      data: filtered,
      count: filtered.length,
      period: {
        days: parseInt(String(days)),
        startTime,
        endTime: now,
      },
    });
  })
);

/**
 * GET /api/agents/:id/resources
 * Get resource metrics for an agent
 */
router.get(
  '/:id/resources',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const { id } = req.params;
    const { hours = 24 } = req.query;

    const gateway = getGatewayClient();
    const resources = await gateway.getResources(id);

    // Filter by time range
    const now = Date.now();
    const startTime = now - parseInt(String(hours)) * 60 * 60 * 1000;
    const filtered = resources.filter(
      (r) => r.timestamp >= startTime && r.timestamp <= now
    );

    res.json({
      data: filtered,
      count: filtered.length,
      period: {
        hours: parseInt(String(hours)),
        startTime,
        endTime: now,
      },
    });
  })
);

export default router;
