# Deployment Guide

## Local Development Setup

### Prerequisites
- Node.js 22+
- npm 10+

### Installation

```bash
# Clone and navigate
cd openclaw-home-base

# Install dependencies
npm install

# Create .env file from example
cp .env.example .env

# Edit .env with your values (especially secrets)
nano .env

# Initialize database
npm run db:init
```

### Development Server

```bash
npm run dev
```

Server will start on `http://localhost:3000`.

### Type Checking

```bash
npm run type-check
```

### Testing

```bash
npm test          # Run once
npm run test:watch # Watch mode
```

### Building for Production

```bash
npm run build
```

Output will be in `dist/`.

## Environment Variables

All required environment variables are documented in `.env.example`.

**Critical secrets to set in production:**
- `JWT_SECRET` — 32+ character random string
- `JWT_REFRESH_SECRET` — 32+ character random string
- `DATABASE_ENCRYPTION_KEY` — 64-character hex string (32 bytes)
- `GATEWAY_API_KEY` — OpenClaw gateway API key

Generate secure random strings:

```bash
# For JWT secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# For database key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Database

### Initialization

```bash
npm run db:init
```

This creates the SQLite database with encrypted storage and all required tables.

### Backup

```bash
npm run db:backup
```

Backups are stored in `data/backups/`.

### Reset (Development Only)

```bash
rm data/openclaw-home-base.db
npm run db:init
```

## API Endpoints (Wave 1)

### Health Check
- **GET** `/health` — System health and uptime

### Stubs (implemented in Wave 2)
- **GET** `/api/agents` — List agents
- **GET** `/api/costs` — Cost data
- **GET** `/api/health-checks` — Component health

## Monitoring

Check logs in `logs/` directory. Log level configured via `LOG_LEVEL` env var.

## Security Checklist

- [ ] `.env` file is in `.gitignore` and never committed
- [ ] All secrets are 32+ characters
- [ ] Database encryption key is 64-char hex (32 bytes)
- [ ] CORS origin is locked to specific domains (not `*`)
- [ ] JWT secrets are rotated quarterly
- [ ] Rate limiting is enabled
- [ ] Audit logging is enabled (`ENABLE_AUDIT_LOGGING=true`)

## Production Deployment

For production use:
1. Use environment-specific `.env` files
2. Enable HTTPS (use reverse proxy like Nginx)
3. Set `NODE_ENV=production`
4. Configure proper CORS origins
5. Set up log rotation
6. Enable database backups
7. Use secret management service (e.g., AWS Secrets Manager)
8. Run behind a rate limiter (e.g., Cloudflare)

## Troubleshooting

### Port already in use
```bash
PORT=3001 npm run dev
```

### Database locked
```bash
# Remove WAL files
rm data/*.db-wal data/*.db-shm
npm run dev
```

### Secrets validation error
Check `.env` file against `.env.example` — all required keys must be set.
