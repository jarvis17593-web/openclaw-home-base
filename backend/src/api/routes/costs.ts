/**
 * Costs API routes
 */

import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { getGatewayClient, getCostTracker } from '../../services';

const router = Router();

/**
 * GET /api/costs
 * List all costs
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (_req: AuthRequest, res) => {
    const gateway = getGatewayClient();
    const costs = await gateway.getCosts();
    res.json(costs);
  })
);

/**
 * GET /api/costs/summary
 * Get cost summary (24h, 7d, 30d)
 */
router.get(
  '/summary',
  authenticate,
  asyncHandler(async (req: AuthRequest, res) => {
    const gateway = getGatewayClient();
    const tracker = getCostTracker();
    const { period = '30d' } = req.query;

    const costs = await gateway.getCosts();

    const daily = tracker.calculateWindow(
      costs.map((c) => ({ timestamp: c.timestamp, agentId: c.agentId, costUsd: c.costUsd })),
      'daily'
    );
    const weekly = tracker.calculateWindow(
      costs.map((c) => ({ timestamp: c.timestamp, agentId: c.agentId, costUsd: c.costUsd })),
      'weekly'
    );
    const monthly = tracker.calculateWindow(
      costs.map((c) => ({ timestamp: c.timestamp, agentId: c.agentId, costUsd: c.costUsd })),
      'monthly'
    );

    // For getCostSummary hook compatibility
    let responseData;
    if (period === '24h') {
      responseData = {
        total: daily.totalCostUsd,
        avgDaily: daily.totalCostUsd,
        trend: 'stable',
      };
    } else if (period === '7d') {
      responseData = {
        total: weekly.totalCostUsd,
        avgDaily: weekly.totalCostUsd / 7,
        trend: 'stable',
      };
    } else {
      responseData = {
        total: monthly.totalCostUsd,
        avgDaily: monthly.totalCostUsd / 30,
        trend: 'stable',
      };
    }

    res.json(responseData);
  })
);

/**
 * GET /api/costs/alerts
 * Get budget alerts
 */
router.get(
  '/alerts',
  authenticate,
  asyncHandler(async (_req: AuthRequest, res) => {
    const gateway = getGatewayClient();
    const tracker = getCostTracker();

    const costs = await gateway.getCosts();
    const monthlyBudget = tracker.getBudget();

    const alerts = tracker.generateAlerts(
      costs.map((c) => ({ timestamp: c.timestamp, agentId: c.agentId, costUsd: c.costUsd })),
      monthlyBudget
    );

    res.json({
      data: alerts,
      count: alerts.length,
      criticalCount: alerts.filter((a) => a.severity === 'critical').length,
      warningCount: alerts.filter((a) => a.severity === 'warning').length,
    });
  })
);

/**
 * GET /api/costs/forecast
 * Forecast monthly spending
 */
router.get(
  '/forecast',
  authenticate,
  asyncHandler(async (_req: AuthRequest, res) => {
    const gateway = getGatewayClient();
    const tracker = getCostTracker();

    const costs = await gateway.getCosts();
    const now = new Date();
    const daysIntoMonth = now.getDate();

    const projected = tracker.forecastMonthly(
      costs.map((c) => ({ timestamp: c.timestamp, costUsd: c.costUsd })),
      daysIntoMonth
    );

    res.json({
      data: {
        daysIntoMonth,
        currentSpend: costs.reduce((sum, c) => sum + c.costUsd, 0),
        projectedMonthly: projected,
        budget: tracker.getBudget(),
        onTrack: projected <= tracker.getBudget(),
      },
    });
  })
);

export default router;
