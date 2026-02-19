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

    const healthy =
      gatewayHealth.status === 'up' && systemMetrics.cpuLoadAverage < 0.8;

    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      components: {
        gateway: {
          status: gatewayHealth.status,
          latency: gatewayHealth.latency,
        },
        system: {
          cpuLoad: systemMetrics.cpuLoadAverage,
          memoryPercent: systemMetrics.memoryUsagePercent,
          uptime: systemMetrics.uptime,
        },
      },
    });
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
