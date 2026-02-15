// Phase 2 migrations - imported by migrations.ts
import Database from 'better-sqlite3';

export const phase2Migrations = [
  {
    id: '005',
    name: 'add_checklist_items',
    up: (db: Database.Database) => {
      console.log('[Migration 005] Adding checklist_items table...');
      db.exec(`
        CREATE TABLE IF NOT EXISTS checklist_items (
          id TEXT PRIMARY KEY,
          task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          is_checked INTEGER DEFAULT 0,
          position INTEGER DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_checklist_task ON checklist_items(task_id, position);
      `);
    }
  },
  {
    id: '006',
    name: 'add_comments',
    up: (db: Database.Database) => {
      console.log('[Migration 006] Adding comments table...');
      db.exec(`
        CREATE TABLE IF NOT EXISTS comments (
          id TEXT PRIMARY KEY,
          task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
          author TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_comments_task ON comments(task_id, created_at);
      `);
    }
  }
];
