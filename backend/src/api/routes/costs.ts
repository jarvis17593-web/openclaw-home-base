/**
 * Costs API routes
 */

import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { getGatewayClient, getCostTracker } from '../../services';

const router = Router();

/**
 * GET /api/costs/summary
 * Get cost summary (24h, 7d, 30d)
 */
router.get(
  '/summary',
  authenticate,
  asyncHandler(async (_req: AuthRequest, res) => {
    const gateway = getGatewayClient();
    const tracker = getCostTracker();

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

    res.json({
      data: {
        daily: {
          totalCostUsd: daily.totalCostUsd,
          requestCount: daily.requestCount,
          agentBreakdown: daily.agentBreakdown,
        },
        weekly: {
          totalCostUsd: weekly.totalCostUsd,
          requestCount: weekly.requestCount,
          agentBreakdown: weekly.agentBreakdown,
        },
        monthly: {
          totalCostUsd: monthly.totalCostUsd,
          requestCount: monthly.requestCount,
          agentBreakdown: monthly.agentBreakdown,
        },
        budget: {
          monthly: tracker.getBudget(),
          monthlyPercent: (monthly.totalCostUsd / tracker.getBudget()) * 100,
        },
      },
    });
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
