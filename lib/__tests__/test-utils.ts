import Database from 'better-sqlite3'
import { vi } from 'vitest'

// Test database utilities
export function createTestDb(): Database.Database {
  const db = new Database(':memory:')
  setupTestSchema(db)
  return db
}

export function setupTestSchema(db: Database.Database): void {
  db.exec("PRAGMA journal_mode = WAL;")
  db.exec("PRAGMA foreign_keys = ON;")

  // Create schema
  db.exec(`
    CREATE TABLE user (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      emailVerified INTEGER NOT NULL DEFAULT 0,
      image TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE session (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expiresAt TEXT NOT NULL,
      ipAddress TEXT,
      userAgent TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES user(id)
    );

    CREATE TABLE notes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content_json TEXT NOT NULL,
      is_public INTEGER NOT NULL DEFAULT 0,
      public_slug TEXT UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES user(id)
    );

    CREATE INDEX idx_notes_user_id ON notes(user_id);
    CREATE INDEX idx_notes_public_slug ON notes(public_slug);
    CREATE INDEX idx_notes_is_public ON notes(is_public);
  `)
}

// Test data factories
export function createTestUser(overrides: Partial<{
  id: string
  name: string
  email: string
  emailVerified: number
}> = {}) {
  return {
    id: 'test-user-1',
    name: 'Test User',
    email: 'test@example.com',
    emailVerified: 1,
    ...overrides
  }
}

export function createTestNote(overrides: Partial<{
  id: string
  user_id: string
  title: string
  content_json: string
  is_public: number
  public_slug: string | null
}> = {}) {
  const defaultContent = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Test note content' }]
      }
    ]
  }

  return {
    id: 'test-note-1',
    user_id: 'test-user-1',
    title: 'Test Note',
    content_json: JSON.stringify(defaultContent),
    is_public: 0,
    public_slug: null,
    ...overrides
  }
}

export function mockAuth(user: any = null, session: any = null) {
  vi.doMock('@/lib/auth', () => ({
    auth: {
      api: {
        getSession: vi.fn().mockResolvedValue(
          user && session ? { user, session } : null
        )
      }
    }
  }))
}

// TipTap content helpers
export function createTipTapContent(text: string) {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text }]
      }
    ]
  }
}