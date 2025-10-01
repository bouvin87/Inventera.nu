import Database from 'better-sqlite3';

export function initDatabase() {
  const sqlite = new Database('database.db');
  
  sqlite.pragma('foreign_keys = ON');
  
  // Create tables
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Lagerarbetare',
      email TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      last_active TEXT
    );

    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      article_number TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      length TEXT NOT NULL,
      location TEXT NOT NULL,
      inventory_count INTEGER,
      notes TEXT,
      is_inventoried INTEGER NOT NULL DEFAULT 0,
      last_inventoried_by TEXT REFERENCES users(id),
      last_inventoried_at TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS order_lines (
      id TEXT PRIMARY KEY,
      order_number TEXT NOT NULL,
      article_number TEXT NOT NULL,
      description TEXT NOT NULL,
      length TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      pick_status TEXT NOT NULL DEFAULT 'Ej plockat',
      is_inventoried INTEGER NOT NULL DEFAULT 0,
      inventoried_by TEXT REFERENCES users(id),
      inventoried_at TEXT,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS inventory_counts (
      id TEXT PRIMARY KEY,
      article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      count INTEGER NOT NULL,
      notes TEXT,
      created_at TEXT
    );
  `);
  
  sqlite.close();
  console.log('Database initialized successfully!');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initDatabase();
}
