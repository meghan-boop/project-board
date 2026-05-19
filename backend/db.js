const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.db');
const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('manager', 'employee')),
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#94918a',
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('high', 'medium', 'low')),
    due_date TEXT,
    status TEXT NOT NULL DEFAULT 'todo',
    section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS time_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    date TEXT NOT NULL,
    hours REAL NOT NULL,
    note TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS task_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS task_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
    size INTEGER NOT NULL DEFAULT 0,
    data TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Add section_id column to existing tasks tables (migration)
try { db.exec('ALTER TABLE tasks ADD COLUMN section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL'); } catch {}

// Seed default sections if none exist
const sectionCount = db.prepare('SELECT COUNT(*) as n FROM sections').get().n;
if (sectionCount === 0) {
  const ins = db.prepare('INSERT INTO sections (name, color, position) VALUES (?, ?, ?)');
  [
    ['Today',    '#f59e0b', 0],
    ['Ziflow',   '#3b82f6', 1],
    ['Upcoming', '#8b5cf6', 2],
    ['Complete', '#10b981', 3],
  ].forEach(([n, c, p]) => ins.run(n, c, p));
}

// Migrate existing tasks that have no section_id
const sections = db.prepare('SELECT id, name FROM sections ORDER BY position ASC').all();
const defaultSectionId = sections[0]?.id;
if (defaultSectionId) {
  const unmigrated = db.prepare('SELECT id FROM tasks WHERE section_id IS NULL').all();
  const setSection = db.prepare('UPDATE tasks SET section_id = ? WHERE id = ?');
  for (const t of unmigrated) setSection.run(defaultSectionId, t.id);
}

// Seed default manager if none exists
const existing = db.prepare("SELECT id FROM users WHERE role = 'manager'").get();
if (!existing) {
  const hash = bcrypt.hashSync('manager123', 10);
  db.prepare('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)').run(
    'manager@example.com', hash, 'Manager', 'manager'
  );
  console.log('Default manager created: manager@example.com / manager123');
}

module.exports = db;
