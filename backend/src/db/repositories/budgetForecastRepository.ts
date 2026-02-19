/**
 * Budget Forecast Repository
 * Data access layer for budget forecast records
 */

import { logger } from '../../config/logger';

type Database = any;

export interface BudgetForecastRecord {
  id: string;
  periodStart: number;
  periodEnd: number;
  forecast7dSpend: number;
  forecast30dSpend: number;
  velocityPerDay: number;
  projectedMonthEnd: number;
  trend: 'up' | 'down' | 'stable';
  confidenceLevel: number;
  historicalVariance: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * BudgetForecastRepository manages budget forecast data persistence
 */
export class BudgetForecastRepository {
  constructor(private db: Database) {}

  /**
   * Insert a new forecast record
   */
  insert(record: Omit<BudgetForecastRecord, 'id' | 'createdAt' | 'updatedAt'>): string {
    const id = `forecast-${Date.now()}`;
    const now = Date.now();

    try {
      const stmt = this.db.prepare(`
        INSERT INTO budget_forecasts (
          id, period_start, period_end, forecast_7d_spend,
          forecast_30d_spend, velocity_per_day, projected_month_end,
          trend, confidence_level, historical_variance,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        record.periodStart,
        record.periodEnd,
        record.forecast7dSpend,
        record.forecast30dSpend,
        record.velocityPerDay,
        record.projectedMonthEnd,
        record.trend,
        record.confidenceLevel,
        record.historicalVariance,
        now,
        now
      );

      logger.info('Budget forecast record inserted', { id, trend: record.trend });
      return id;
    } catch (error) {
      logger.error('Failed to insert budget forecast record', { error, record });
      throw error;
    }
  }

  /**
   * Get the latest forecast
   */
  getLatest(): BudgetForecastRecord | null {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM budget_forecasts
        ORDER BY created_at DESC
        LIMIT 1
      `);

      const row = stmt.get() as any;
      return row ? this.mapRow(row) : null;
    } catch (error) {
      logger.error('Failed to fetch latest forecast', { error });
      throw error;
    }
  }

  /**
   * Get forecasts within a date range
   */
  getRange(startTime: number, endTime: number): BudgetForecastRecord[] {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM budget_forecasts
        WHERE period_start >= ? AND period_end <= ?
        ORDER BY created_at DESC
      `);

      const rows = stmt.all(startTime, endTime) as any[];
      return rows.map((row) => this.mapRow(row));
    } catch (error) {
      logger.error('Failed to fetch forecasts', { error, startTime, endTime });
      throw error;
    }
  }

  /**
   * Get all forecasts (for analysis)
   */
  getAll(limit: number = 100): BudgetForecastRecord[] {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM budget_forecasts
        ORDER BY created_at DESC
        LIMIT ?
      `);

      const rows = stmt.all(limit) as any[];
      return rows.map((row) => this.mapRow(row));
    } catch (error) {
      logger.error('Failed to fetch all forecasts', { error, limit });
      throw error;
    }
  }

  /**
   * Update an existing forecast
   */
  update(id: string, record: Partial<Omit<BudgetForecastRecord, 'id' | 'createdAt'>>): void {
    try {
      const updates: string[] = [];
      const values: any[] = [];

      if (record.periodStart !== undefined) {
        updates.push('period_start = ?');
        values.push(record.periodStart);
      }
      if (record.periodEnd !== undefined) {
        updates.push('period_end = ?');
        values.push(record.periodEnd);
      }
      if (record.forecast7dSpend !== undefined) {
        updates.push('forecast_7d_spend = ?');
        values.push(record.forecast7dSpend);
      }
      if (record.forecast30dSpend !== undefined) {
        updates.push('forecast_30d_spend = ?');
        values.push(record.forecast30dSpend);
      }
      if (record.velocityPerDay !== undefined) {
        updates.push('velocity_per_day = ?');
        values.push(record.velocityPerDay);
      }
      if (record.projectedMonthEnd !== undefined) {
        updates.push('projected_month_end = ?');
        values.push(record.projectedMonthEnd);
      }
      if (record.trend !== undefined) {
        updates.push('trend = ?');
        values.push(record.trend);
      }
      if (record.confidenceLevel !== undefined) {
        updates.push('confidence_level = ?');
        values.push(record.confidenceLevel);
      }
      if (record.historicalVariance !== undefined) {
        updates.push('historical_variance = ?');
        values.push(record.historicalVariance);
      }

      updates.push('updated_at = ?');
      values.push(Date.now());
      values.push(id);

      const stmt = this.db.prepare(`
        UPDATE budget_forecasts
        SET ${updates.join(', ')}
        WHERE id = ?
      `);

      stmt.run(...values);
      logger.info('Budget forecast updated', { id });
    } catch (error) {
      logger.error('Failed to update budget forecast', { error, id });
      throw error;
    }
  }

  /**
   * Delete old forecast records
   */
  deleteOlderThan(timestamp: number): number {
    try {
      const stmt = this.db.prepare(`
        DELETE FROM budget_forecasts WHERE created_at < ?
      `);

      const result = stmt.run(timestamp);
      logger.info('Old budget forecasts deleted', { count: result.changes });

      return result.changes;
    } catch (error) {
      logger.error('Failed to delete old forecasts', { error, timestamp });
      throw error;
    }
  }

  /**
   * Map database row to record
   */
  private mapRow(row: any): BudgetForecastRecord {
    return {
      id: row.id,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      forecast7dSpend: row.forecast_7d_spend,
      forecast30dSpend: row.forecast_30d_spend,
      velocityPerDay: row.velocity_per_day,
      projectedMonthEnd: row.projected_month_end,
      trend: row.trend,
      confidenceLevel: row.confidence_level,
      historicalVariance: row.historical_variance,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
