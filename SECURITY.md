# Security Architecture

## Core Principles

1. **Zero Secrets in Code** — All credentials via environment variables
2. **Defense in Depth** — Multiple layers of protection
3. **Audit Trail** — Every sensitive action is logged
4. **Encryption at Rest** — Database encrypted with AES-256-GCM
5. **Rate Limiting** — Protect API from brute force
6. **Input Validation** — All user input validated with Zod
7. **Secure Headers** — Helmet enforces security headers
8. **Secret Rotation** — Alerts on stale credentials

## Implementation Checklist

### Pre-Commit
- [x] No hardcoded secrets in code
- [x] `.gitignore` excludes `.env` and sensitive files
- [x] `secretlint` configured to detect credentials
- [x] Type checking enabled (strict mode)
- [x] Pre-commit hooks block credential commits

### Database
- [x] SQLite with AES-256-GCM encryption
- [x] Foreign key constraints enabled
- [x] Indexes for performance and security
- [x] Immutable audit logs (append-only)
- [x] Encryption key from environment variable

### API Security
- [x] Helmet security headers enabled
- [x] CORS locked to specific origins (not wildcard)
- [x] Rate limiting on `/api/` routes
- [x] Input validation on all requests (Zod)
- [x] Error messages don't leak sensitive info

### Authentication (Wave 2)
- [ ] JWT with 15-minute expiry for access tokens
- [ ] Refresh tokens with 7-day expiry
- [ ] Secure token storage (httpOnly cookies)
- [ ] Token rotation on refresh

### Secrets Management
- [x] All secrets from environment variables
- [x] Example file (`.env.example`) has no values
- [x] Validation schema enforces secret format
- [x] Sensitive values redacted from logs
- [x] No console.log of secrets

### Logging & Audit
- [x] Audit log table for all sensitive actions
- [x] Encrypted audit data at rest
- [x] Request logging with redaction
- [x] Error logging without leaking internals
- [x] Log rotation configured

### Dependency Security
- [x] `npm audit` baseline for initial setup
- [x] Dependencies pinned to major versions
- [x] Regular security scanning recommended
- [ ] Supply chain verification (coming in CI/CD)

## Encryption

### Database Encryption
- **Algorithm**: AES-256-GCM
- **Key Size**: 256 bits (32 bytes, 64 hex chars)
- **IV**: 128 bits (16 bytes) per encryption
- **Auth Tag**: Prevents tampering
- **Key Derivation**: Direct from environment (upgrade to PBKDF2 for sensitive deployments)

### How to Generate Key
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Secret Rotation

Secrets should be rotated quarterly:

1. **JWT Secrets**
   - Generate new `JWT_SECRET` and `JWT_REFRESH_SECRET`
   - Update `.env` and restart server
   - Old tokens remain valid until expiry

2. **Database Key**
   - Requires re-encrypting all data
   - Plan downtime for this operation
   - Keep backup before rotation

3. **API Keys**
   - Rotate at source (e.g., OpenClaw Gateway)
   - Update `.env`
   - Verify connectivity after update

## Monitoring Security

### Red Flags
- Repeated failed authentication attempts
- Rate limit violations
- Audit log access from unexpected IPs
- Sudden spikes in API usage
- Database connection errors

### Alerts to Set Up
- [ ] Failed requests > 100/hour
- [ ] Rate limit breaches > 10/hour
- [ ] Audit log size growing unexpectedly
- [ ] Database encryption key access from unexpected source
- [ ] Missing environment variables on startup

## Known Limitations & TODOs

### Current (Wave 1)
- No authentication yet (endpoints are open)
- Database key stored in `.env` (upgrade to AWS Secrets Manager)
- No TLS/HTTPS (use reverse proxy)
- No request signing (add in Wave 2)
- No secrets versioning (add in Wave 3)

### Planned (Wave 2+)
- JWT authentication with refresh tokens
- Request signing for OpenClaw Gateway calls
- Secrets versioning and rotation UI
- Two-factor authentication
- Rate limiting per user
- API key management
- Security event alerts
- Compliance reporting (SOC 2, ISO 27001)

## External Security

### OpenClaw Gateway Integration
- [ ] Validate gateway API key on startup
- [ ] Sign requests to gateway with HMAC
- [ ] Verify gateway responses (coming in Wave 2)
- [ ] TLS certificate pinning (optional)

### CORS Policy
- Lock to specific domains: `CORS_ORIGIN=http://localhost:5173,https://dashboard.example.com`
- Never use `*` in production
- Include credentials only if needed

## Testing Security

### Unit Tests
```bash
npm test
```

### Manual Testing
```bash
# Missing required secret
JWT_SECRET=short npm run dev  # Should fail

# Invalid encryption key
DATABASE_ENCRYPTION_KEY=invalid npm run dev  # Should fail

# Tampered database
# (edit data/* manually)
npm run dev  # Should detect auth tag failure
```

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/nodejs-security/)
- [Express Security Handbook](https://expressjs.com/en/advanced/best-practice-security.html)
- [Zod Documentation](https://zod.dev/)

## Contact & Escalation

For security concerns:
1. Don't commit security findings
2. Document in a private note
3. Escalate to Cole with details
4. Never disclose to third parties without approval
