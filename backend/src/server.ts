/**
 * HTTP + WebSocket server
 */

import http from 'http';
import { createApp } from './api/app';
import { initializeWebSocket } from './websocket/handler';
import { env } from './config/env-validator';
import { logger } from './config/logger';

/**
 * Create and start server
 */
export async function startServer(): Promise<http.Server> {
  const app = createApp();
  const server = http.createServer(app);

  // Initialize WebSocket
  initializeWebSocket(server);

  // Start listening
  return new Promise((resolve, reject) => {
    server.listen(env.PORT, () => {
      logger.info('Server started', {
        port: env.PORT,
        environment: env.NODE_ENV,
        apiUrl: `http://localhost:${env.PORT}`,
        wsUrl: `ws://localhost:${env.PORT}`,
      });
      resolve(server);
    });

    server.on('error', (error) => {
      logger.error('Server error', { error: (error as Error).message });
      reject(error);
    });
  });
}

/**
 * Graceful shutdown
 */
export async function shutdownServer(server: http.Server): Promise<void> {
  return new Promise((resolve) => {
    logger.info('Shutting down server...');

    server.close(() => {
      logger.info('Server shut down');
      resolve();
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.warn('Force shutting down server');
      process.exit(1);
    }, 10000);
  });
}

// Handle process signals
if (import.meta.url === `file://${process.argv[1]}`) {
  let server: http.Server;

  startServer()
    .then((s) => {
      server = s;
    })
    .catch((error) => {
      logger.error('Failed to start server', { error: (error as Error).message });
      process.exit(1);
    });

  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received');
    await shutdownServer(server);
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received');
    await shutdownServer(server);
  });
}
