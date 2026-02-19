import sqlite3 from 'sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { getSecret } from '../config/secrets.js';

let db: sqlite3.Database | null = null;

/**
 * Initialize encrypted SQLite database
 * Uses AES-256-GCM for encryption
 */
export function initDB(dbPath: string): sqlite3.Database {
  if (db) return db;

  // Create database connection
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('[DB] Error opening database:', err);
      throw err;
    }
  });

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON', (err) => {
    if (err) console.error('[DB] Error enabling foreign keys:', err);
  });

  // Load and execute schema
  const schema = readFileSync(join(process.cwd(), 'backend/src/db/schema.sql'), 'utf-8');
  const statements = schema.split(';').filter(s => s.trim());
  
  statements.forEach(stmt => {
    db?.run(stmt, (err) => {
      if (err && !err.message.includes('already exists')) {
        console.error('[DB] Error executing statement:', err);
      }
    });
  });

  console.log(`[DB] Database initialized at ${dbPath}`);
  return db;
}

/**
 * Get singleton database connection
 */
export function getDB(): sqlite3.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDB() first.');
  }
  return db;
}

/**
 * Encrypt data using AES-256-GCM
 */
export function encryptData(data: string): { iv: string; encrypted: string; authTag: string } {
  const encryptionKey = Buffer.from(getSecret('DATABASE_ENCRYPTION_KEY'), 'hex');
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);

  let encrypted = cipher.update(data, 'utf-8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    encrypted,
    authTag: authTag.toString('hex')
  };
}

/**
 * Decrypt data using AES-256-GCM
 */
export function decryptData(encrypted: string, iv: string, authTag: string): string {
  const encryptionKey = Buffer.from(getSecret('DATABASE_ENCRYPTION_KEY'), 'hex');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  let decrypted = decipher.update(encrypted, 'hex', 'utf-8');
  decrypted += decipher.final('utf-8');

  return decrypted;
}

/**
 * Close database connection
 */
export function closeDB(): void {
  if (db) {
    db.close();
    db = null;
  }
}
