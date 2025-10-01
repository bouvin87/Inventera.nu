import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

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
      password TEXT NOT NULL DEFAULT '',
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
      position TEXT,
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
  
  // Migration: Add position column to order_lines if it doesn't exist
  try {
    const columns = sqlite.pragma('table_info(order_lines)') as Array<{ name: string }>;
    const hasPositionColumn = columns.some((col) => col.name === 'position');
    
    if (!hasPositionColumn) {
      console.log('Adding position column to order_lines table...');
      sqlite.exec('ALTER TABLE order_lines ADD COLUMN position TEXT;');
      console.log('Position column added successfully!');
    }
  } catch (error) {
    console.error('Error during migration:', error);
  }
  
  // Migration: Add inventoried_quantity column to order_lines if it doesn't exist
  try {
    const columns = sqlite.pragma('table_info(order_lines)') as Array<{ name: string }>;
    const hasInventoriedQuantityColumn = columns.some((col) => col.name === 'inventoried_quantity');
    
    if (!hasInventoriedQuantityColumn) {
      console.log('Adding inventoried_quantity column to order_lines table...');
      sqlite.exec('ALTER TABLE order_lines ADD COLUMN inventoried_quantity INTEGER;');
      console.log('Inventoried quantity column added successfully!');
    }
  } catch (error) {
    console.error('Error during migration:', error);
  }
  
  // Migration: Add password column to users if it doesn't exist and set default password
  try {
    const columns = sqlite.pragma('table_info(users)') as Array<{ name: string }>;
    const hasPasswordColumn = columns.some((col) => col.name === 'password');
    
    if (!hasPasswordColumn) {
      console.log('Adding password column to users table...');
      sqlite.exec('ALTER TABLE users ADD COLUMN password TEXT NOT NULL DEFAULT "";');
    }
    
    // Always ensure all users have a password (handles both new column and existing empty passwords)
    const defaultPassword = 'Euro2025!';
    const hashedPassword = bcrypt.hashSync(defaultPassword, 10);
    
    console.log('Ensuring all users have passwords...');
    const updateStmt = sqlite.prepare("UPDATE users SET password = ? WHERE password IS NULL OR password = ''");
    const result = updateStmt.run(hashedPassword);
    
    if (result.changes > 0) {
      console.log(`Set default password for ${result.changes} users`);
    }
  } catch (error) {
    console.error('Error during password migration:', error);
  }
  
  // Migration: Update old roles to new roles
  try {
    console.log('Migrating old roles to new roles...');
    
    const updateLagerarbetare = sqlite.prepare("UPDATE users SET role = 'Användare' WHERE role = 'Lagerarbetare'");
    const resultLagerarbetare = updateLagerarbetare.run();
    
    const updateLagerchef = sqlite.prepare("UPDATE users SET role = 'Administratör' WHERE role = 'Lagerchef'");
    const resultLagerchef = updateLagerchef.run();
    
    if (resultLagerarbetare.changes > 0 || resultLagerchef.changes > 0) {
      console.log(`Migrated ${resultLagerarbetare.changes + resultLagerchef.changes} user roles`);
    }
  } catch (error) {
    console.error('Error during role migration:', error);
  }
  
  sqlite.close();
  console.log('Database initialized successfully!');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initDatabase();
}
