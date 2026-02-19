import { beforeAll, afterAll } from 'vitest';
import { join } from 'path';
import { unlink } from 'fs/promises';

// Setup test database
const testDbPath = join(process.cwd(), 'data', 'test.db');

beforeAll(() => {
  process.env.DATABASE_PATH = testDbPath;
  console.log('[TEST] Using test database:', testDbPath);
});

afterAll(async () => {
  try {
    await unlink(testDbPath);
  } catch (err) {
    // File may not exist
  }
});
