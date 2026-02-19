/**
 * WebSocket event handler
 * Real-time updates for costs, resources, alerts
 */

import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import { logger } from '../config/logger';
import { getGatewayClient, getCostTracker, getResourceMonitor, getAlertEngine } from '../services';
import jwt from 'jsonwebtoken';
import { env } from '../config/env-validator';

export interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
}

/**
 * Initialize WebSocket server
 */
export function initializeWebSocket(httpServer: Server): WebSocketServer {
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws: AuthenticatedWebSocket, req) => {
    handleConnection(ws, req, wss);
  });

  logger.info('WebSocket server initialized');
  return wss;
}

/**
 * Handle new WebSocket connection
 */
function handleConnection(ws: AuthenticatedWebSocket, req: any, _wss: WebSocketServer): void {
  // Skip auth in development mode
  if (env.NODE_ENV === 'development') {
    ws.userId = 'dev-user';
    logger.info('WebSocket client connected (dev mode)');
  } else {
    const token = extractToken(req.url);

    if (!token || !verifyToken(token, ws)) {
      (ws as WebSocket).close(4001, 'Unauthorized');
      return;
    }
  }

  logger.info('WebSocket client connected', { userId: ws.userId });

  // Send initial data
  sendInitialData(ws);

  // Set up periodic updates
  const intervals = setupPeriodicUpdates(ws, _wss);

  // Handle messages
  (ws as any).on('message', (data: any) => handleMessage(ws, data as string, _wss));

  // Handle disconnect
  (ws as any).on('close', () => {
    logger.info('WebSocket client disconnected', { userId: ws.userId });
    intervals.forEach((interval: any) => {
      clearInterval(interval);
    });
  });

  (ws as any).on('error', (error: any) => {
    logger.error('WebSocket error', { error: (error as Error).message, userId: ws.userId });
  });
}

/**
 * Extract JWT from WebSocket URL query
 */
function extractToken(url: string | undefined): string | null {
  if (!url) return null;

  const match = url.match(/token=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Verify JWT token
 */
function verifyToken(token: string, ws: AuthenticatedWebSocket): boolean {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string };
    ws.userId = decoded.id;
    return true;
  } catch {
    return false;
  }
}

/**
 * Send initial data to client
 */
async function sendInitialData(ws: AuthenticatedWebSocket): Promise<void> {
  try {
    const gateway = getGatewayClient();
    const tracker = getCostTracker();
    const monitor = getResourceMonitor();
    const alertEngine = getAlertEngine();

    const [agents, costs, systemMetrics] = await Promise.all([
      gateway.getAgents(),
      gateway.getCosts(),
      Promise.resolve(monitor.getSystemMetrics()),
    ]);

    const dailyWindow = tracker.calculateWindow(
      costs.map((c) => ({ timestamp: c.timestamp, agentId: c.agentId, costUsd: c.costUsd })),
      'daily'
    );

    (ws as WebSocket).send(
      JSON.stringify({
        type: 'init',
        data: {
          agents,
          costs: {
            daily: dailyWindow.totalCostUsd,
            budget: tracker.getBudget(),
          },
          system: systemMetrics,
          alerts: alertEngine.getActiveAlerts(),
        },
      })
    );
  } catch (error) {
    logger.error('Failed to send initial data', { error: (error as Error).message });
  }
}

/**
 * Setup periodic updates
 */
function setupPeriodicUpdates(_ws: AuthenticatedWebSocket, wss: WebSocketServer): NodeJS.Timer[] {
  const intervals: NodeJS.Timer[] = [];

  // Update costs every 5 seconds
  intervals.push(
    setInterval(async () => {
      try {
        const gateway = getGatewayClient();
        const tracker = getCostTracker();
        const costs = await gateway.getCosts();

        const daily = tracker.calculateWindow(
          costs.map((c) => ({ timestamp: c.timestamp, agentId: c.agentId, costUsd: c.costUsd })),
          'daily'
        );

        broadcast(wss, {
          type: 'costs-update',
          data: {
            daily: daily.totalCostUsd,
            dailyPercent: (daily.totalCostUsd / tracker.getBudget()) * 100,
          },
        } as any);
      } catch (error) {
        logger.error('Cost update failed', { error: (error as Error).message });
      }
    }, 5000)
  );

  // Update resource metrics every 10 seconds
  intervals.push(
    setInterval(async () => {
      try {
        const gateway = getGatewayClient();
        const agents = await gateway.getAgents();

        for (const agent of agents) {
          const resources = await gateway.getResources(agent.id);
          if (resources.length > 0) {
            const latest = resources[0];
            broadcast(wss, {
              type: 'resource-update',
              agentId: agent.id,
              data: {
                cpu: latest.cpuPercent,
                memory: latest.cpuPercent,
              },
            });
          }
        }
      } catch (error) {
        logger.error('Resource update failed', { error: (error as Error).message });
      }
    }, 10000)
  );

  // Update alerts every 30 seconds
  intervals.push(
    setInterval(async () => {
      try {
        const gateway = getGatewayClient();
        const tracker = getCostTracker();
        const alertEngine = getAlertEngine();
        const costs = await gateway.getCosts();

        const alerts = tracker.generateAlerts(
          costs.map((c) => ({ timestamp: c.timestamp, agentId: c.agentId, costUsd: c.costUsd })),
          tracker.getBudget()
        );

        if (alerts.length > 0) {
          for (const alert of alerts) {
            const dbAlert = alertEngine.createAlert(
              alert.severity === 'critical' ? 'critical' : 'warning',
              'budget',
              alert.message,
              alert.agentId
            );

            broadcast(wss, {
              type: 'alert',
              data: dbAlert,
            });
          }
        }
      } catch (error) {
        logger.error('Alert update failed', { error: (error as Error).message });
      }
    }, 30000)
  );

  return intervals;
}

/**
 * Handle incoming messages
 */
function handleMessage(ws: AuthenticatedWebSocket, data: string, _wss: WebSocketServer): void {
  try {
    const message = JSON.parse(data);

    switch (message.type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;

      case 'subscribe':
        logger.debug('Client subscribed', { userId: ws.userId, channels: message.channels });
        ws.send(JSON.stringify({ type: 'subscribed', channels: message.channels }));
        break;

      default:
        logger.warn('Unknown message type', { type: message.type, userId: ws.userId });
    }
  } catch (error) {
    logger.error('Failed to handle message', { error: (error as Error).message });
  }
}

/**
 * Broadcast message to all connected clients
 */
function broadcast(wss: WebSocketServer, message: any): void {
  wss.clients.forEach((client: any) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}
