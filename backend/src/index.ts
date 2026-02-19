/**
 * Application entry point
 * Starts HTTP + WebSocket server with real-time monitoring
 */

import 'dotenv/config';
import { startServer, shutdownServer } from './server';
import { logger } from './config/logger';

async function main() {
  try {
    const server = await startServer();

    // Graceful shutdown handlers
    const signals = ['SIGTERM', 'SIGINT', 'SIGHUP'];
    signals.forEach((signal) => {
      process.on(signal, async () => {
        logger.info(`${signal} received`);
        await shutdownServer(server);
        process.exit(0);
      });
    });

    // Unhandled error handlers
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error: (error as Error).message });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection', { reason, promise });
      process.exit(1);
    });
  } catch (error) {
    logger.error('Fatal error', { error: (error as Error).message });
    process.exit(1);
  }
}

main();
