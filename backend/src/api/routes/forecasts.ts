/**
 * Budget Forecasts API routes
 */

import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { getGatewayClient, getBudgetForecastService, getCostTracker } from '../../services';

const router = Router();

/**
 * GET /api/forecasts
 * Get current budget forecast and trend analysis
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (_req: AuthRequest, res) => {
    const gateway = getGatewayClient();
    const forecastService = getBudgetForecastService();
    const costTracker = getCostTracker();

    const costs = await gateway.getCosts();
    const costData = costs.map((c) => ({ timestamp: c.timestamp, costUsd: c.costUsd }));

    // Generate forecast data
    const forecast = forecastService.generateForecast(costData);

    // Get month-end projection
    const now = new Date();
    const daysIntoMonth = now.getDate();
    const daysLeftInMonth = 30 - daysIntoMonth;

    // Calculate current spend
    const currentSpend = costs.reduce((sum, c) => sum + c.costUsd, 0);

    // Get budget info
    const monthlyBudget = costTracker.getBudget();
    const budgetRemaining = monthlyBudget - currentSpend;
    const onTrack = forecast.projectedMonthEnd <= monthlyBudget;

    // Determine status color
    let statusColor = 'green';
    if (forecast.projectedMonthEnd > monthlyBudget * 1.1) {
      statusColor = 'red';
    } else if (forecast.projectedMonthEnd > monthlyBudget) {
      statusColor = 'yellow';
    }

    res.json({
      data: {
        forecast,
        current: {
          spend: parseFloat(currentSpend.toFixed(2)),
          daysIntoMonth,
          daysLeftInMonth,
        },
        budget: {
          monthly: monthlyBudget,
          remaining: parseFloat(budgetRemaining.toFixed(2)),
          onTrack,
          statusColor,
        },
        metadata: {
          costDataPoints: costs.length,
          lastUpdated: new Date().toISOString(),
        },
      },
    });
  })
);

/**
 * GET /api/forecasts/7d
 * Get 7-day forecast
 */
router.get(
  '/7d',
  authenticate,
  asyncHandler(async (_req: AuthRequest, res) => {
    const gateway = getGatewayClient();
    const forecastService = getBudgetForecastService();

    const costs = await gateway.getCosts();
    const costData = costs.map((c) => ({ timestamp: c.timestamp, costUsd: c.costUsd }));

    const forecast7d = forecastService.get7DayForecast(costData);
    const velocity = forecastService.calculateVelocity(costData);

    res.json({
      data: {
        forecast: forecast7d,
        velocity,
        costDataPoints: costs.length,
      },
    });
  })
);

/**
 * GET /api/forecasts/30d
 * Get 30-day forecast
 */
router.get(
  '/30d',
  authenticate,
  asyncHandler(async (_req: AuthRequest, res) => {
    const gateway = getGatewayClient();
    const forecastService = getBudgetForecastService();

    const costs = await gateway.getCosts();
    const costData = costs.map((c) => ({ timestamp: c.timestamp, costUsd: c.costUsd }));

    const forecast30d = forecastService.get30DayForecast(costData);
    const velocity = forecastService.calculateVelocity(costData);

    res.json({
      data: {
        forecast: forecast30d,
        velocity,
        costDataPoints: costs.length,
      },
    });
  })
);

/**
 * GET /api/forecasts/trend
 * Get trend analysis
 */
router.get(
  '/trend',
  authenticate,
  asyncHandler(async (_req: AuthRequest, res) => {
    const gateway = getGatewayClient();
    const forecastService = getBudgetForecastService();

    const costs = await gateway.getCosts();
    const costData = costs.map((c) => ({ timestamp: c.timestamp, costUsd: c.costUsd }));

    const trend = forecastService.getTrendAnalysis(costData);
    const variance = forecastService.calculateVariance(costData);
    const confidence = forecastService.calculateConfidenceLevel(costData, variance);

    res.json({
      data: {
        trend,
        variance,
        confidence,
        costDataPoints: costs.length,
      },
    });
  })
);

/**
 * GET /api/forecasts/month-end
 * Get projected month-end total
 */
router.get(
  '/month-end',
  authenticate,
  asyncHandler(async (_req: AuthRequest, res) => {
    const gateway = getGatewayClient();
    const forecastService = getBudgetForecastService();
    const costTracker = getCostTracker();

    const costs = await gateway.getCosts();
    const costData = costs.map((c) => ({ timestamp: c.timestamp, costUsd: c.costUsd }));

    const now = new Date();
    const daysIntoMonth = now.getDate();

    const projectedMonthEnd = forecastService.getProjectedMonthEnd(costData, daysIntoMonth);
    const currentSpend = costData.reduce((sum, c) => sum + c.costUsd, 0);
    const monthlyBudget = costTracker.getBudget();

    res.json({
      data: {
        current: currentSpend,
        projected: projectedMonthEnd,
        budget: monthlyBudget,
        remaining: monthlyBudget - currentSpend,
        projectedOverBudget: projectedMonthEnd - monthlyBudget,
        daysIntoMonth,
        daysLeft: 30 - daysIntoMonth,
      },
    });
  })
);

/**
 * GET /api/forecasts/confidence
 * Get confidence level and variance metrics
 */
router.get(
  '/confidence',
  authenticate,
  asyncHandler(async (_req: AuthRequest, res) => {
    const gateway = getGatewayClient();
    const forecastService = getBudgetForecastService();

    const costs = await gateway.getCosts();
    const costData = costs.map((c) => ({ timestamp: c.timestamp, costUsd: c.costUsd }));

    const variance = forecastService.calculateVariance(costData);
    const confidence = forecastService.calculateConfidenceLevel(costData, variance);
    const velocity = forecastService.calculateVelocity(costData);

    res.json({
      data: {
        confidenceLevel: confidence,
        historicalVariance: variance,
        velocity,
        interpretation:
          confidence > 0.8
            ? 'High confidence - stable spending patterns'
            : confidence > 0.5
              ? 'Medium confidence - moderate spending volatility'
              : 'Low confidence - high spending volatility',
      },
    });
  })
);

export default router;
