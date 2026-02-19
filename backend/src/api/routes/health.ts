/**
 * Health check routes
 */

import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { getGatewayClient, getResourceMonitor } from '../../services';

const router = Router();

/**
 * GET /api/health
 * Full health check
 */
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const gateway = getGatewayClient();
    const monitor = getResourceMonitor();

    const [gatewayHealth, systemMetrics] = await Promise.all([
      gateway.getHealth(),
      Promise.resolve(monitor.getSystemMetrics()),
    ]);

    // Determine component statuses
    const gatewayStatus = gatewayHealth.status === 'up' ? 'healthy' : 'down';
    const systemStatus = systemMetrics.cpuLoadAverage < 0.8 ? 'healthy' : 'degraded';

    const checks = [
      {
        id: 'gateway',
        timestamp: Date.now(),
        component: 'Gateway',
        status: gatewayStatus,
        latencyMs: gatewayHealth.latency,
      },
      {
        id: 'system-cpu',
        timestamp: Date.now(),
        component: 'System CPU',
        status: systemMetrics.cpuLoadAverage < 2.0 ? 'healthy' : systemMetrics.cpuLoadAverage < 3.0 ? 'degraded' : 'down',
        latencyMs: undefined,
      },
      {
        id: 'system-memory',
        timestamp: Date.now(),
        component: 'System Memory',
        status: systemMetrics.memoryUsagePercent < 80 ? 'healthy' : systemMetrics.memoryUsagePercent < 97 ? 'degraded' : 'down',
        latencyMs: undefined,
      },
    ];

    // Always return 200 with the health data
    // HTTP status is for liveness/readiness probes, not for health data endpoint
    res.status(200).json(checks);
  })
);

/**
 * GET /api/health/live
 * Liveness probe (k8s style)
 */
router.get(
  '/live',
  asyncHandler(async (_req, res) => {
    res.json({ status: 'alive' });
  })
);

/**
 * GET /api/health/ready
 * Readiness probe (k8s style)
 */
router.get(
  '/ready',
  asyncHandler(async (_req, res) => {
    const gateway = getGatewayClient();

    try {
      const health = await gateway.getHealth();
      const ready = health.status === 'up';

      res.status(ready ? 200 : 503).json({
        status: ready ? 'ready' : 'not_ready',
        gateway: health.status,
      });
    } catch (error) {
      res.status(503).json({
        status: 'not_ready',
        error: (error as Error).message,
      });
    }
  })
);

export default router;
