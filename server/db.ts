import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from "@shared/schema";

const sqlite = new Database('database.db');

sqlite.pragma('foreign_keys = ON');

const fkEnabled = sqlite.pragma('foreign_keys', { simple: true });
if (fkEnabled !== 1) {
  console.warn('WARNING: Foreign key constraints are not enabled!');
} else {
  console.log('Foreign key constraints: enabled');
}

export const db = drizzle({ client: sqlite, schema });
