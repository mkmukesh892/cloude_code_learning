import { Database, type SQLQueryBindings } from "bun:sqlite";

const DB_PATH = process.env.DB_PATH || "data/app.db";

let db: Database | null = null;

export function getDb(): Database {
  if (!db) {
    try {
      db = new Database(DB_PATH, { create: true });
      db.exec("PRAGMA journal_mode = WAL;");
      db.exec("PRAGMA foreign_keys = ON;"); // Enable foreign key constraints
      db.exec("PRAGMA busy_timeout = 5000;"); // 5 second timeout for busy database
    } catch (error) {
      console.error("Failed to initialize database:", error);
      throw new Error("Database initialization failed");
    }
  }
  return db;
}

// Graceful shutdown function for serverless environments
export function closeDb(): void {
  if (db) {
    try {
      db.close();
      db = null;
    } catch (error) {
      console.error("Error closing database:", error);
    }
  }
}

export function query<T>(sql: string, params?: SQLQueryBindings[]): T[] {
  try {
    const stmt = getDb().prepare(sql);
    return (params ? stmt.all(...params) : stmt.all()) as T[];
  } catch (error) {
    console.error("Database query error:", error, "SQL:", sql);
    throw new Error("Database query failed");
  }
}

export function get<T>(sql: string, params?: SQLQueryBindings[]): T | undefined {
  try {
    const stmt = getDb().prepare(sql);
    return (params ? stmt.get(...params) : stmt.get()) as T | undefined;
  } catch (error) {
    console.error("Database get error:", error, "SQL:", sql);
    throw new Error("Database query failed");
  }
}

export function run(sql: string, params?: SQLQueryBindings[]): void {
  try {
    const stmt = getDb().prepare(sql);
    params ? stmt.run(...params) : stmt.run();
  } catch (error) {
    console.error("Database run error:", error, "SQL:", sql);
    throw new Error("Database operation failed");
  }
}
