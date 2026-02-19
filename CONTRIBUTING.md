# Contributing to OpenClaw Home Base

Thanks for your interest in contributing! This guide will help you get started.

## Development Setup

```bash
./setup.sh
npm run dev
```

The development server runs on:
- **Backend:** http://localhost:3000
- **Frontend:** http://localhost:5173

## Code Style

We use **Prettier** and **ESLint** for consistent code style:

```bash
npm run lint    # Fix linting issues
```

## Commit Messages

Follow conventional commits:

```
feat: Add new feature
fix: Fix a bug
docs: Update documentation
test: Add tests
refactor: Code refactor
chore: Maintenance
```

Example:
```
feat: Add budget forecasting to dashboard
```

## Pull Request Process

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make your changes
3. Ensure tests pass: `npm test`
4. Type checking passes: `npm run type-check`
5. Commit with conventional messages
6. Push to your fork
7. Open a PR with a clear description

## File Organization

### Backend (`backend/src/`)
- **config/** — Environment, secrets, logger setup
- **db/** — Database schema, encryption, repositories
- **api/** — Express routes, middleware, controllers
- **services/** — Business logic (gateway client, cost tracking, etc.)
- **websocket/** — Real-time WebSocket handler

### Frontend (`frontend/src/`)
- **components/** — React components (UI building blocks)
- **pages/** — Full page components (Dashboard, Settings, Logs)
- **hooks/** — Custom React hooks (useAPI, useWebSocket, etc.)
- **services/** — API client, WebSocket client
- **types/** — TypeScript interfaces
- **styles/** — Global CSS

## Adding a New Feature

### Backend Feature

1. Create service in `backend/src/services/`
2. Add routes in `backend/src/api/routes/`
3. Add database schema if needed in `backend/src/db/`
4. Add tests in `__tests__/`
5. Update ARCHITECTURE.md

Example:
```typescript
// backend/src/services/myFeature.ts
export class MyFeature {
  async doSomething() {
    // Implementation
  }
}

// backend/src/api/routes/myroute.ts
router.get('/my-feature', async (req, res) => {
  const result = await myFeature.doSomething();
  res.json(result);
});
```

### Frontend Feature

1. Create component in `frontend/src/components/`
2. Create custom hook if needed in `frontend/src/hooks/`
3. Add types in `frontend/src/types/index.ts`
4. Integrate into page or component
5. Add tests in `frontend/__tests__/`

Example:
```typescript
// frontend/src/components/MyFeature.tsx
export function MyFeature() {
  const data = useMyFeature();
  return <div>{/* UI */}</div>;
}

// frontend/src/hooks/useMyFeature.ts
export function useMyFeature() {
  const { data, loading } = useAPI(() => apiClient.getMyData());
  return { data, loading };
}
```

## Testing

```bash
# Run tests
npm test

# Watch mode
npm test:watch

# Coverage
npm test -- --coverage
```

Test files go in `__tests__/`:
- Backend: `__tests__/backend/...`
- Frontend: `frontend/__tests__/...`

Example:
```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../src/services/myService';

describe('myService', () => {
  it('should do something', () => {
    const result = myFunction();
    expect(result).toBe(expected);
  });
});
```

## Database Changes

If you modify the schema:

1. Update `backend/src/db/schema.sql`
2. Add migration file if needed
3. Test with `npm run db:init`
4. Document in ARCHITECTURE.md

## Security Guidelines

- ❌ Never commit secrets (use `.env` instead)
- ✅ Validate all inputs with Zod
- ✅ Use parameterized queries (SQLite)
- ✅ Rate limit API endpoints
- ✅ Log security-relevant events
- ✅ Encrypt sensitive data at rest

## Documentation

Update docs when:
- Adding new API endpoints → Update README.md
- Changing architecture → Update ARCHITECTURE.md
- Adding secrets → Update .env.example
- Adding deployment steps → Update DEPLOYMENT.md

## Performance Tips

**Backend:**
- Use connection pooling for databases
- Cache frequently accessed data
- Implement pagination for large datasets
- Use async/await properly (no blocking)

**Frontend:**
- Use `useMemo` for expensive computations
- Lazy load routes with React.lazy
- Optimize images and assets
- Use debounce/throttle for frequent updates

## Debugging

### Backend
```bash
# Enable debug logs
DEBUG=openclaw:* npm run dev:backend

# VSCode debugger config (.vscode/launch.json)
{
  "type": "node",
  "request": "launch",
  "program": "${workspaceFolder}/backend/src/index.ts",
  "outFiles": ["${workspaceFolder}/dist/**/*.js"],
  "runtimeArgs": ["--loader", "tsx"]
}
```

### Frontend
```bash
# React DevTools in browser
npm run dev:frontend

# VSCode debugger: Use Debugger for Chrome extension
```

## Need Help?

- **Architecture:** See ARCHITECTURE.md
- **Deployment:** See DEPLOYMENT.md
- **Security:** See SECURITY.md
- **Issues:** GitHub Issues

---

Happy coding! 🚀
