import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { initializeSecrets, getSecret } from './config/secrets.js';
import { initDB, closeDB } from './db/encrypted.js';
import { mkdir } from 'fs/promises';
import { dirname } from 'path';

// Initialize secrets and database on startup
initializeSecrets();
const dbPath = getSecret('DATABASE_PATH');
await mkdir(dirname(dbPath), { recursive: true });
initDB(dbPath);

// Create Express app
const app = express();
const port = getSecret('PORT');
const corsOrigin = getSecret('CORS_ORIGIN');
const logLevel = getSecret('LOG_LEVEL');

// Middleware: Security headers
app.use(helmet());

// Middleware: CORS
app.use(cors({
  origin: corsOrigin.split(',').map(o => o.trim()),
  credentials: true,
  optionsSuccessStatus: 200
}));

// Middleware: Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Middleware: Rate limiting
const limiter = rateLimit({
  windowMs: getSecret('RATE_LIMIT_WINDOW_MS'),
  max: getSecret('RATE_LIMIT_MAX_REQUESTS'),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Middleware: Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (logLevel === 'debug') {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    }
  });
  next();
});

// Routes: Health check
app.get('/health', (_req: Request, res: Response) => {
  const timestamp = new Date().toISOString();
  res.status(200).json({
    status: 'healthy',
    timestamp,
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Routes: API stubs (ready for Wave 2)
app.get('/api/agents', (_req: Request, res: Response) => {
  res.status(200).json({
    data: [],
    total: 0,
    message: 'Agents endpoint - coming in Wave 2'
  });
});

app.get('/api/costs', (_req: Request, res: Response) => {
  res.status(200).json({
    data: [],
    total: 0,
    message: 'Costs endpoint - coming in Wave 2'
  });
});

app.get('/api/health-checks', (_req: Request, res: Response) => {
  res.status(200).json({
    data: [],
    total: 0,
    message: 'Health checks endpoint - coming in Wave 2'
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : 'Internal server error';
  const statusCode = (err as any).statusCode || 500;

  console.error(`[ERROR] ${req.method} ${req.path}:`, message);

  res.status(statusCode).json({
    status: 'error',
    message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: 'Not found',
    path: req.path
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[SHUTDOWN] SIGTERM received, closing database and exiting...');
  closeDB();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[SHUTDOWN] SIGINT received, closing database and exiting...');
  closeDB();
  process.exit(0);
});

// Start server
app.listen(port, () => {
  console.log(`[✓] Server running on http://localhost:${port}`);
  console.log(`[✓] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[✓] Database: ${dbPath}`);
  console.log(`[✓] CORS origin: ${corsOrigin}`);
});
