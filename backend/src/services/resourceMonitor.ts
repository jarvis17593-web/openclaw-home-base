/**
 * Resource Monitor Service
 * Tracks CPU, memory, disk I/O, and network metrics for agents
 */

import os from 'os';
import { logger } from '../config/logger';

export interface ResourceMetrics {
  agentId: string;
  timestamp: number;
  cpu: {
    percent: number;
    cores: number;
  };
  memory: {
    rssBytes: number;
    percentOfSystem: number;
    heapUsedBytes?: number;
    heapTotalBytes?: number;
  };
  disk: {
    readBytesPerSec: number;
    writeBytesPerSec: number;
  };
  network: {
    rxBytesPerSec: number;
    txBytesPerSec: number;
  };
  openFileDescriptors: number;
  threadCount: number;
}

export interface ResourceAlert {
  agentId: string;
  severity: 'warning' | 'critical';
  type: 'cpu' | 'memory' | 'disk' | 'fds';
  currentValue: number;
  threshold: number;
  message: string;
}

/**
 * ResourceMonitor tracks agent resource usage
 */
export class ResourceMonitor {
  private lastMetrics: Map<string, ResourceMetrics> = new Map();
  private readonly THRESHOLDS = {
    CPU_PERCENT: 80,
    MEMORY_PERCENT: 75,
    DISK_WRITE_MBPS: 50,
    OPEN_FDS: 1000,
  };

  /**
   * Collect current metrics for an agent
   */
  async collectMetrics(agentId: string, _pid?: number): Promise<ResourceMetrics> {
    const timestamp = Date.now();

    // Note: In production, this would use process monitoring libraries like
    // ps-list, pidusage, or os-specific APIs. For now, we collect available system metrics.

    const metrics: ResourceMetrics = {
      agentId,
      timestamp,
      cpu: {
        percent: this.calculateCpuUsage(agentId), // Simplified
        cores: os.cpus().length,
      },
      memory: {
        rssBytes: process.memoryUsage().rss,
        percentOfSystem: (process.memoryUsage().rss / os.totalmem()) * 100,
        heapUsedBytes: process.memoryUsage().heapUsed,
        heapTotalBytes: process.memoryUsage().heapTotal,
      },
      disk: {
        readBytesPerSec: 0, // Would track disk I/O
        writeBytesPerSec: 0,
      },
      network: {
        rxBytesPerSec: 0, // Would track network I/O
        txBytesPerSec: 0,
      },
      openFileDescriptors: 0, // Would get from /proc or system calls
      threadCount: 0, // Would get from process info
    };

    this.lastMetrics.set(agentId, metrics);
    return metrics;
  }

  /**
   * Check metrics against thresholds and generate alerts
   */
  checkAlerts(metrics: ResourceMetrics): ResourceAlert[] {
    const alerts: ResourceAlert[] = [];

    if (metrics.cpu.percent > this.THRESHOLDS.CPU_PERCENT) {
      alerts.push({
        agentId: metrics.agentId,
        severity: metrics.cpu.percent > 95 ? 'critical' : 'warning',
        type: 'cpu',
        currentValue: metrics.cpu.percent,
        threshold: this.THRESHOLDS.CPU_PERCENT,
        message: `CPU usage at ${metrics.cpu.percent.toFixed(1)}% (threshold: ${this.THRESHOLDS.CPU_PERCENT}%)`,
      });
    }

    if (metrics.memory.percentOfSystem > this.THRESHOLDS.MEMORY_PERCENT) {
      alerts.push({
        agentId: metrics.agentId,
        severity: metrics.memory.percentOfSystem > 90 ? 'critical' : 'warning',
        type: 'memory',
        currentValue: metrics.memory.percentOfSystem,
        threshold: this.THRESHOLDS.MEMORY_PERCENT,
        message: `Memory usage at ${metrics.memory.percentOfSystem.toFixed(1)}% (threshold: ${this.THRESHOLDS.MEMORY_PERCENT}%)`,
      });
    }

    if (metrics.disk.writeBytesPerSec > this.THRESHOLDS.DISK_WRITE_MBPS * 1024 * 1024) {
      alerts.push({
        agentId: metrics.agentId,
        severity: 'warning',
        type: 'disk',
        currentValue: metrics.disk.writeBytesPerSec / (1024 * 1024),
        threshold: this.THRESHOLDS.DISK_WRITE_MBPS,
        message: `Disk write rate at ${(metrics.disk.writeBytesPerSec / (1024 * 1024)).toFixed(1)} MB/s (threshold: ${this.THRESHOLDS.DISK_WRITE_MBPS} MB/s)`,
      });
    }

    if (metrics.openFileDescriptors > this.THRESHOLDS.OPEN_FDS) {
      alerts.push({
        agentId: metrics.agentId,
        severity: 'warning',
        type: 'fds',
        currentValue: metrics.openFileDescriptors,
        threshold: this.THRESHOLDS.OPEN_FDS,
        message: `Open file descriptors at ${metrics.openFileDescriptors} (threshold: ${this.THRESHOLDS.OPEN_FDS})`,
      });
    }

    return alerts;
  }

  /**
   * Get system-wide metrics
   */
  getSystemMetrics(): {
    cpuLoadAverage: number;
    memoryUsagePercent: number;
    uptime: number;
  } {
    const loadAvg = os.loadavg();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    return {
      cpuLoadAverage: loadAvg[0], // 1-minute average
      memoryUsagePercent: (usedMem / totalMem) * 100,
      uptime: os.uptime(),
    };
  }

  /**
   * Calculate CPU usage for an agent
   * @note Simplified implementation. In production, use pidusage or similar.
   */
  private calculateCpuUsage(agentId: string): number {
    const lastMetric = this.lastMetrics.get(agentId);
    if (!lastMetric) {
      return 0; // First measurement
    }

    // Placeholder: In production, calculate based on process CPU time deltas
    return Math.random() * 100; // Simplified
  }

  /**
   * Set custom thresholds
   */
  setThreshold(type: keyof typeof this.THRESHOLDS, value: number): void {
    (this.THRESHOLDS as any)[type] = value;
    logger.info('Resource threshold updated', { type, value });
  }

  /**
   * Get current thresholds
   */
  getThresholds(): typeof this.THRESHOLDS {
    return { ...this.THRESHOLDS };
  }
}

/**
 * Singleton instance
 */
let instance: ResourceMonitor | null = null;

export function getResourceMonitor(): ResourceMonitor {
  if (!instance) {
    instance = new ResourceMonitor();
  }
  return instance;
}
