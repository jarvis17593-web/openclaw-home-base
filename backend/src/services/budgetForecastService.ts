/**
 * Budget Forecast Service
 * Provides budget forecasting, trend analysis, and spending predictions
 */

export interface ForecastData {
  forecast7d: number;
  forecast30d: number;
  projectedMonthEnd: number;
  velocity: number;
  trend: 'up' | 'down' | 'stable';
  confidenceLevel: number;
  variance: number;
}

/**
 * BudgetForecastService handles forecasting logic
 */
export class BudgetForecastService {
  /**
   * Calculate velocity (spend per day) from historical data
   */
  calculateVelocity(costs: Array<{ timestamp: number; costUsd: number }>): number {
    if (costs.length === 0) {
      return 0;
    }

    if (costs.length === 1) {
      return costs[0].costUsd;
    }

    // Sort by timestamp
    const sorted = [...costs].sort((a, b) => a.timestamp - b.timestamp);

    // Group costs by day (using UTC date to avoid timezone issues)
    const costsByDay: Map<string, number> = new Map();
    for (const cost of sorted) {
      // Use getUTCDate, getUTCMonth, getUTCFullYear for proper UTC day grouping
      const date = new Date(cost.timestamp);
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      const dayKey = `${year}-${month}-${day}`;
      costsByDay.set(dayKey, (costsByDay.get(dayKey) || 0) + cost.costUsd);
    }

    // Calculate daily averages
    const dailyCosts = Array.from(costsByDay.values());
    if (dailyCosts.length === 0) {
      return 0;
    }

    const avgDaily = dailyCosts.reduce((a, b) => a + b, 0) / dailyCosts.length;
    return parseFloat(avgDaily.toFixed(4));
  }

  /**
   * Get forecast for next N days
   */
  getForecast(
    costs: Array<{ timestamp: number; costUsd: number }>,
    days: number = 7
  ): number {
    const velocity = this.calculateVelocity(costs);
    return parseFloat((velocity * days).toFixed(2));
  }

  /**
   * Get 7-day forecast
   */
  get7DayForecast(costs: Array<{ timestamp: number; costUsd: number }>): number {
    return this.getForecast(costs, 7);
  }

  /**
   * Get 30-day forecast
   */
  get30DayForecast(costs: Array<{ timestamp: number; costUsd: number }>): number {
    return this.getForecast(costs, 30);
  }

  /**
   * Calculate trend analysis (up, down, or stable)
   */
  getTrendAnalysis(costs: Array<{ timestamp: number; costUsd: number }>): 'up' | 'down' | 'stable' {
    if (costs.length < 2) {
      return 'stable';
    }

    // Split data into two halves for comparison
    const sorted = [...costs].sort((a, b) => a.timestamp - b.timestamp);
    const midpoint = Math.floor(sorted.length / 2);

    const firstHalf = sorted.slice(0, midpoint);
    const secondHalf = sorted.slice(midpoint);

    const firstAvg = firstHalf.reduce((sum, c) => sum + c.costUsd, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, c) => sum + c.costUsd, 0) / secondHalf.length;

    // Calculate percentage change
    const percentChange = ((secondAvg - firstAvg) / firstAvg) * 100;

    // Use 5% threshold for stability
    if (percentChange > 5) {
      return 'up';
    } else if (percentChange < -5) {
      return 'down';
    } else {
      return 'stable';
    }
  }

  /**
   * Calculate projected month-end total
   */
  getProjectedMonthEnd(
    costs: Array<{ timestamp: number; costUsd: number }>,
    daysIntoMonth: number = -1
  ): number {
    if (daysIntoMonth === -1) {
      const now = new Date();
      daysIntoMonth = now.getDate();
    }

    if (daysIntoMonth <= 0) {
      return 0;
    }

    const velocity = this.calculateVelocity(costs);
    const remainingDays = 30 - daysIntoMonth;
    const currentSpend = costs.reduce((sum, c) => sum + c.costUsd, 0);
    const projectedSpend = velocity * remainingDays;

    return parseFloat((currentSpend + projectedSpend).toFixed(2));
  }

  /**
   * Calculate historical variance (for confidence level)
   */
  calculateVariance(costs: Array<{ timestamp: number; costUsd: number }>): number {
    if (costs.length === 0) {
      return 0;
    }

    // Group costs by day (using UTC date to avoid timezone issues)
    const costsByDay: Map<string, number> = new Map();
    const sorted = [...costs].sort((a, b) => a.timestamp - b.timestamp);

    for (const cost of sorted) {
      // Use getUTCDate, getUTCMonth, getUTCFullYear for proper UTC day grouping
      const date = new Date(cost.timestamp);
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      const dayKey = `${year}-${month}-${day}`;
      costsByDay.set(dayKey, (costsByDay.get(dayKey) || 0) + cost.costUsd);
    }

    const dailyCosts = Array.from(costsByDay.values());
    if (dailyCosts.length < 2) {
      return 0;
    }

    // Calculate mean
    const mean = dailyCosts.reduce((a, b) => a + b, 0) / dailyCosts.length;

    // Calculate variance
    const variance = dailyCosts.reduce((sum, cost) => sum + Math.pow(cost - mean, 2), 0) / dailyCosts.length;

    return parseFloat(variance.toFixed(4));
  }

  /**
   * Calculate confidence level based on variance and data points
   * Higher confidence when variance is low and we have more data
   */
  calculateConfidenceLevel(
    costs: Array<{ timestamp: number; costUsd: number }>,
    variance: number = -1
  ): number {
    if (costs.length === 0) {
      return 0;
    }

    if (variance === -1) {
      variance = this.calculateVariance(costs);
    }

    // Normalize by data points: more data = higher confidence
    const dataPoints = Math.min(costs.length / 100, 1); // Cap at 100 data points

    // Calculate coefficient of variation (CV = stdDev / mean)
    const mean = costs.reduce((sum, c) => sum + c.costUsd, 0) / costs.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? stdDev / mean : 0;

    // Confidence = (1 - CV) * dataPoints factor, capped at 1
    let confidence = (1 - Math.min(cv, 1)) * (0.5 + dataPoints * 0.5);
    confidence = Math.max(0, Math.min(confidence, 1));

    return parseFloat(confidence.toFixed(2));
  }

  /**
   * Generate complete forecast data
   */
  generateForecast(costs: Array<{ timestamp: number; costUsd: number }>): ForecastData {
    const variance = this.calculateVariance(costs);

    return {
      forecast7d: this.get7DayForecast(costs),
      forecast30d: this.get30DayForecast(costs),
      projectedMonthEnd: this.getProjectedMonthEnd(costs),
      velocity: this.calculateVelocity(costs),
      trend: this.getTrendAnalysis(costs),
      confidenceLevel: this.calculateConfidenceLevel(costs, variance),
      variance,
    };
  }
}

/**
 * Singleton instance
 */
let instance: BudgetForecastService | null = null;

export function getBudgetForecastService(): BudgetForecastService {
  if (!instance) {
    instance = new BudgetForecastService();
  }
  return instance;
}
