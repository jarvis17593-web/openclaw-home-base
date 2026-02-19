/**
 * Alert Engine
 * Manages alert lifecycle, deduplication, and delivery
 */

import { logger } from '../config/logger';

export interface Alert {
  id: string;
  timestamp: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  type: string;
  agentId?: string;
  message: string;
  acknowledged: boolean;
  acknowledgedAt?: number;
  acknowledgedBy?: string;
}

/**
 * AlertEngine manages alert aggregation, deduplication, and delivery
 */
export class AlertEngine {
  private alerts: Map<string, Alert> = new Map();
  private deduplicationWindow: number = 60000; // 1 minute
  private readonly lastAlertTime: Map<string, number> = new Map();

  /**
   * Create or update an alert
   */
  createAlert(
    severity: Alert['severity'],
    type: string,
    message: string,
    agentId?: string
  ): Alert {
    const key = this.deduplicationKey(type, agentId);
    const lastTime = this.lastAlertTime.get(key) || 0;
    const now = Date.now();

    // Skip duplicate alerts within deduplication window
    if (now - lastTime < this.deduplicationWindow) {
      logger.debug('Alert deduplicated', { type, agentId, key });
      return this.alerts.get(key)!; // Return existing
    }

    const alert: Alert = {
      id: `${type}-${agentId || 'system'}-${now}`,
      timestamp: now,
      severity,
      type,
      agentId,
      message,
      acknowledged: false,
    };

    this.alerts.set(key, alert);
    this.lastAlertTime.set(key, now);

    logger.info('Alert created', { severity, type, agentId, message });
    return alert;
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = Array.from(this.alerts.values()).find((a) => a.id === alertId);
    if (!alert) {
      return false;
    }

    alert.acknowledged = true;
    alert.acknowledgedAt = Date.now();
    alert.acknowledgedBy = acknowledgedBy;

    logger.info('Alert acknowledged', { alertId, acknowledgedBy });
    return true;
  }

  /**
   * Get all active (unacknowledged) alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter((a) => !a.acknowledged);
  }

  /**
   * Get alerts for a specific agent
   */
  getAlertsByAgent(agentId: string): Alert[] {
    return Array.from(this.alerts.values()).filter(
      (a) => a.agentId === agentId && !a.acknowledged
    );
  }

  /**
   * Get critical alerts
   */
  getCriticalAlerts(): Alert[] {
    return this.getActiveAlerts().filter((a) => a.severity === 'critical');
  }

  /**
   * Clear acknowledged alerts older than threshold
   */
  clearOldAlerts(ageMs: number = 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let cleared = 0;

    for (const [key, alert] of this.alerts.entries()) {
      if (alert.acknowledged && now - alert.timestamp > ageMs) {
        this.alerts.delete(key);
        cleared++;
      }
    }

    logger.info('Cleared old alerts', { cleared, ageMs });
    return cleared;
  }

  /**
   * Get alert summary
   */
  getSummary(): {
    total: number;
    active: number;
    critical: number;
    warning: number;
    bySeverity: Record<string, number>;
  } {
    const all = Array.from(this.alerts.values());
    const active = all.filter((a) => !a.acknowledged);

    const bySeverity: Record<string, number> = {
      info: 0,
      warning: 0,
      error: 0,
      critical: 0,
    };

    for (const alert of all) {
      bySeverity[alert.severity]++;
    }

    return {
      total: all.length,
      active: active.length,
      critical: bySeverity.critical,
      warning: bySeverity.warning,
      bySeverity,
    };
  }

  /**
   * Set deduplication window
   */
  setDeduplicationWindow(ms: number): void {
    this.deduplicationWindow = ms;
  }

  /**
   * Generate deduplication key
   */
  private deduplicationKey(type: string, agentId?: string): string {
    return `${type}-${agentId || 'system'}`;
  }
}

/**
 * Singleton instance
 */
let instance: AlertEngine | null = null;

export function getAlertEngine(): AlertEngine {
  if (!instance) {
    instance = new AlertEngine();
  }
  return instance;
}
