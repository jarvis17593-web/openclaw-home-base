import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../../backend/src/config/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { CostTracker } from '../../../backend/src/services/costTracker';

const now = Date.now();

function makeCost(agentId: string, costUsd: number, minsAgo: number) {
  return { timestamp: now - minsAgo * 60 * 1000, agentId, costUsd };
}

describe('CostTracker', () => {
  let tracker: CostTracker;

  beforeEach(() => {
    tracker = new CostTracker(100); // $100/day => $3000/month
  });

  // ── calculateWindow ──────────────────────────────────────────────

  describe('calculateWindow', () => {
    it('returns zero window for empty cost array', () => {
      const result = tracker.calculateWindow([], 'daily');
      expect(result.totalCostUsd).toBe(0);
      expect(result.requestCount).toBe(0);
      expect(result.period).toBe('daily');
    });

    it('calculates daily window correctly', () => {
      const costs = [
        makeCost('agent-1', 1.5, 30),   // 30 min ago — within 24h
        makeCost('agent-2', 2.0, 120),  // 2h ago — within 24h
        makeCost('agent-1', 5.0, 1500), // 25h ago — outside 24h
      ];
      const result = tracker.calculateWindow(costs, 'daily');
      expect(result.totalCostUsd).toBe(3.5);
      expect(result.requestCount).toBe(2);
    });

    it('calculates weekly window correctly', () => {
      const costs = [
        makeCost('agent-1', 1.0, 60),         // 1h ago — within 7d
        makeCost('agent-2', 2.0, 60 * 24 * 6), // 6d ago — within 7d
        makeCost('agent-1', 3.0, 60 * 24 * 8), // 8d ago — outside 7d
      ];
      const result = tracker.calculateWindow(costs, 'weekly');
      expect(result.totalCostUsd).toBe(3.0);
      expect(result.requestCount).toBe(2);
    });

    it('calculates monthly window correctly', () => {
      const costs = [
        makeCost('agent-1', 10.0, 60),          // recent — within 30d
        makeCost('agent-2', 20.0, 60 * 24 * 29), // 29d ago — within 30d
        makeCost('agent-1', 30.0, 60 * 24 * 31), // 31d ago — outside 30d
      ];
      const result = tracker.calculateWindow(costs, 'monthly');
      expect(result.totalCostUsd).toBe(30.0);
      expect(result.requestCount).toBe(2);
    });

    it('builds agent breakdown correctly', () => {
      const costs = [
        makeCost('agent-1', 1.0, 10),
        makeCost('agent-1', 2.0, 20),
        makeCost('agent-2', 3.0, 30),
      ];
      const result = tracker.calculateWindow(costs, 'daily');
      expect(result.agentBreakdown['agent-1']).toBe(3.0);
      expect(result.agentBreakdown['agent-2']).toBe(3.0);
    });

    it('rounds totalCostUsd to 4 decimal places', () => {
      const costs = [
        makeCost('agent-1', 0.1, 10),
        makeCost('agent-1', 0.2, 20),
      ];
      const result = tracker.calculateWindow(costs, 'daily');
      expect(result.totalCostUsd).toBe(0.3);
      expect(Number.isFinite(result.totalCostUsd)).toBe(true);
    });

    it('includes startTime and endTime in result', () => {
      const result = tracker.calculateWindow([], 'daily');
      expect(result.startTime).toBeLessThan(result.endTime);
      expect(result.endTime).toBeGreaterThan(0);
    });
  });

  // ── generateAlerts ───────────────────────────────────────────────

  describe('generateAlerts', () => {
    const budget = 3000; // monthly budget

    it('returns no alerts when spend is below 50%', () => {
      const alerts = tracker.generateAlerts([], budget);
      expect(alerts).toHaveLength(0);
    });

    it('generates critical daily alert when daily budget exceeded', () => {
      // Daily limit = 3000/30 = $100. Need > $100 in last 24h.
      const costs = Array.from({ length: 5 }, (_, i) =>
        makeCost('agent-1', 25, i * 10) // 5 × $25 = $125 today
      );
      const alerts = tracker.generateAlerts(costs, budget);
      const dailyCritical = alerts.find(
        (a) => a.threshold === 100 && !a.agentId
      );
      expect(dailyCritical).toBeDefined();
      expect(dailyCritical?.severity).toBe('critical');
    });

    it('generates warning daily alert at 75% threshold', () => {
      // Daily limit = $100. Need $75–$100.
      const costs = [makeCost('agent-1', 80, 30)]; // $80 today
      const alerts = tracker.generateAlerts(costs, budget);
      const dailyWarn = alerts.find(
        (a) => a.threshold === 75 && !a.agentId
      );
      expect(dailyWarn).toBeDefined();
      expect(dailyWarn?.severity).toBe('warning');
    });

    it('generates warning daily alert at 50% threshold', () => {
      const costs = [makeCost('agent-1', 55, 30)]; // $55 today (~55% of $100)
      const alerts = tracker.generateAlerts(costs, budget);
      const dailyWarn = alerts.find(
        (a) => a.threshold === 50 && !a.agentId
      );
      expect(dailyWarn).toBeDefined();
      expect(dailyWarn?.severity).toBe('warning');
    });

    it('generates critical monthly alert when monthly budget exceeded', () => {
      // Create large spend across the month
      const costs = Array.from({ length: 10 }, (_, i) =>
        makeCost('agent-1', 400, i * 60 * 24) // spread over 10 days
      ); // $4000 total > $3000 budget
      const alerts = tracker.generateAlerts(costs, budget);
      const monthlyCritical = alerts.find(
        (a) => a.threshold === 100 && a.budgetLimit === budget
      );
      expect(monthlyCritical).toBeDefined();
      expect(monthlyCritical?.severity).toBe('critical');
    });

    it('generates per-agent alert when agent exceeds 75% of budget', () => {
      // agent-1 spends $2400 = 80% of $3000 budget
      const costs = Array.from({ length: 6 }, (_, i) =>
        makeCost('agent-1', 400, i * 60 * 24)
      );
      const alerts = tracker.generateAlerts(costs, budget);
      const agentAlert = alerts.find((a) => a.agentId === 'agent-1');
      expect(agentAlert).toBeDefined();
      expect(agentAlert?.severity).toBe('warning');
    });

    it('alert messages contain formatted USD values', () => {
      const costs = [makeCost('agent-1', 80, 30)];
      const alerts = tracker.generateAlerts(costs, budget);
      if (alerts.length > 0) {
        expect(alerts[0].message).toMatch(/\$[\d.]+/);
      }
    });
  });

  // ── forecastMonthly ──────────────────────────────────────────────

  describe('forecastMonthly', () => {
    it('returns 0 when daysIntoMonth is 0', () => {
      const costs = [{ timestamp: now - 60000, costUsd: 100 }];
      expect(tracker.forecastMonthly(costs, 0)).toBe(0);
    });

    it('returns 0 for empty cost array', () => {
      expect(tracker.forecastMonthly([], 15)).toBe(0);
    });

    it('extrapolates daily spend × 30 for forecast', () => {
      // Single cost in the last 24h: $10. Daily avg = $10. Projected = $300.
      const costs = [{ timestamp: now - 60 * 60 * 1000, costUsd: 10 }];
      const forecast = tracker.forecastMonthly(costs, 15);
      expect(forecast).toBe(300);
    });

    it('returns a number rounded to 2 decimal places', () => {
      const costs = [{ timestamp: now - 1000, costUsd: 1.1111 }];
      const forecast = tracker.forecastMonthly(costs, 5);
      const str = forecast.toString();
      const decimalPart = str.split('.')[1] || '';
      expect(decimalPart.length).toBeLessThanOrEqual(2);
    });
  });

  // ── setBudget / getBudget ────────────────────────────────────────

  describe('setBudget / getBudget', () => {
    it('getBudget returns monthly equivalent', () => {
      // Constructor received 100/day => 3000/month
      expect(tracker.getBudget()).toBe(3000);
    });

    it('setBudget updates the budget', () => {
      tracker.setBudget(1500);
      expect(tracker.getBudget()).toBe(1500);
    });

    it('setBudget ignores zero or negative values', () => {
      const before = tracker.getBudget();
      tracker.setBudget(0);
      expect(tracker.getBudget()).toBe(before);
      tracker.setBudget(-100);
      expect(tracker.getBudget()).toBe(before);
    });
  });
});
