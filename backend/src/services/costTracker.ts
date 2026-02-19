/**
 * Cost Tracker Service
 * Calculates costs over time windows and manages budget alerts
 */

import { logger } from '../config/logger';

export interface CostWindow {
  period: 'daily' | 'weekly' | 'monthly';
  startTime: number;
  endTime: number;
  totalCostUsd: number;
  requestCount: number;
  agentBreakdown: Record<string, number>; // agentId -> cost
}

export interface BudgetAlert {
  agentId?: string;
  severity: 'warning' | 'critical';
  threshold: number; // percentage (50, 75, 100)
  currentSpend: number;
  budgetLimit: number;
  message: string;
}

/**
 * CostTracker manages cost calculation and budget monitoring
 */
export class CostTracker {
  private dailyBudgetUsd: number;

  constructor(dailyBudgetUsd: number = 100) {
    this.dailyBudgetUsd = dailyBudgetUsd;
  }

  /**
   * Calculate cost for a time window
   */
  calculateWindow(
    costs: Array<{ timestamp: number; agentId: string; costUsd: number }>,
    period: 'daily' | 'weekly' | 'monthly'
  ): CostWindow {
    const now = Date.now();
    let startTime: number;

    switch (period) {
      case 'daily':
        startTime = now - 24 * 60 * 60 * 1000;
        break;
      case 'weekly':
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case 'monthly':
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
    }

    const windowCosts = costs.filter((c) => c.timestamp >= startTime && c.timestamp <= now);

    let totalCost = 0;
    const agentBreakdown: Record<string, number> = {};

    for (const cost of windowCosts) {
      totalCost += cost.costUsd;
      agentBreakdown[cost.agentId] = (agentBreakdown[cost.agentId] || 0) + cost.costUsd;
    }

    return {
      period,
      startTime,
      endTime: now,
      totalCostUsd: parseFloat(totalCost.toFixed(4)),
      requestCount: windowCosts.length,
      agentBreakdown,
    };
  }

  /**
   * Generate budget alerts based on spending
   */
  generateAlerts(
    costs: Array<{ timestamp: number; agentId: string; costUsd: number }>,
    monthlyBudgetUsd: number
  ): BudgetAlert[] {
    const alerts: BudgetAlert[] = [];
    const dailyWindow = this.calculateWindow(costs, 'daily');
    const monthlyWindow = this.calculateWindow(costs, 'monthly');

    // Daily alert (1/30th of monthly budget)
    const dailyLimit = monthlyBudgetUsd / 30;
    const dailyPercent = (dailyWindow.totalCostUsd / dailyLimit) * 100;

    if (dailyPercent >= 100) {
      alerts.push({
        severity: 'critical',
        threshold: 100,
        currentSpend: dailyWindow.totalCostUsd,
        budgetLimit: dailyLimit,
        message: `Daily budget exceeded: $${dailyWindow.totalCostUsd.toFixed(2)} / $${dailyLimit.toFixed(2)}`,
      });
    } else if (dailyPercent >= 75) {
      alerts.push({
        severity: 'warning',
        threshold: 75,
        currentSpend: dailyWindow.totalCostUsd,
        budgetLimit: dailyLimit,
        message: `Daily budget 75% used: $${dailyWindow.totalCostUsd.toFixed(2)} / $${dailyLimit.toFixed(2)}`,
      });
    } else if (dailyPercent >= 50) {
      alerts.push({
        severity: 'warning',
        threshold: 50,
        currentSpend: dailyWindow.totalCostUsd,
        budgetLimit: dailyLimit,
        message: `Daily budget 50% used: $${dailyWindow.totalCostUsd.toFixed(2)} / $${dailyLimit.toFixed(2)}`,
      });
    }

    // Monthly alert
    const monthlyPercent = (monthlyWindow.totalCostUsd / monthlyBudgetUsd) * 100;

    if (monthlyPercent >= 100) {
      alerts.push({
        severity: 'critical',
        threshold: 100,
        currentSpend: monthlyWindow.totalCostUsd,
        budgetLimit: monthlyBudgetUsd,
        message: `Monthly budget exceeded: $${monthlyWindow.totalCostUsd.toFixed(2)} / $${monthlyBudgetUsd.toFixed(2)}`,
      });
    } else if (monthlyPercent >= 75) {
      alerts.push({
        severity: 'warning',
        threshold: 75,
        currentSpend: monthlyWindow.totalCostUsd,
        budgetLimit: monthlyBudgetUsd,
        message: `Monthly budget 75% used: $${monthlyWindow.totalCostUsd.toFixed(2)} / $${monthlyBudgetUsd.toFixed(2)}`,
      });
    } else if (monthlyPercent >= 50) {
      alerts.push({
        severity: 'warning',
        threshold: 50,
        currentSpend: monthlyWindow.totalCostUsd,
        budgetLimit: monthlyBudgetUsd,
        message: `Monthly budget 50% used: $${monthlyWindow.totalCostUsd.toFixed(2)} / $${monthlyBudgetUsd.toFixed(2)}`,
      });
    }

    // Per-agent alerts
    for (const [agentId, agentCost] of Object.entries(monthlyWindow.agentBreakdown)) {
      const agentPercent = (agentCost / monthlyBudgetUsd) * 100;

      if (agentPercent >= 75) {
        alerts.push({
          agentId,
          severity: 'warning',
          threshold: 75,
          currentSpend: agentCost,
          budgetLimit: monthlyBudgetUsd,
          message: `Agent ${agentId} using 75%+ of budget: $${agentCost.toFixed(2)}`,
        });
      }
    }

    return alerts;
  }

  /**
   * Forecast future spending based on current trend
   */
  forecastMonthly(
    costs: Array<{ timestamp: number; costUsd: number }>,
    daysIntoMonth: number
  ): number {
    if (daysIntoMonth <= 0 || costs.length === 0) {
      return 0;
    }

    const dailyWindow = this.calculateWindow(
      costs.map((c) => ({ ...c, agentId: 'all' })),
      'daily'
    );
    const dailyAverage = dailyWindow.totalCostUsd;
    const projectedMonthly = dailyAverage * 30;

    return parseFloat(projectedMonthly.toFixed(2));
  }

  /**
   * Set monthly budget
   */
  setBudget(monthlyUsd: number): void {
    if (monthlyUsd <= 0) {
      logger.warn('Invalid budget set', { monthlyUsd });
      return;
    }
    this.dailyBudgetUsd = monthlyUsd / 30;
    logger.info('Budget updated', { monthlyUsd });
  }

  /**
   * Get current budget
   */
  getBudget(): number {
    return this.dailyBudgetUsd * 30;
  }
}

/**
 * Singleton instance
 */
let instance: CostTracker | null = null;

export function getCostTracker(): CostTracker {
  if (!instance) {
    const monthlyBudget = process.env.MONTHLY_BUDGET_USD
      ? parseFloat(process.env.MONTHLY_BUDGET_USD)
      : 3000;
    instance = new CostTracker(monthlyBudget / 30);
  }
  return instance;
}
