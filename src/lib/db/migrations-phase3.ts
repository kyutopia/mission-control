// Phase 3 migrations
import Database from 'better-sqlite3';

export const phase3Migrations = [
  {
    id: '007',
    name: 'add_pipeline_table',
    up: (db: Database.Database) => {
      console.log('[Migration 007] Adding pipeline table...');
      db.exec(`
        CREATE TABLE IF NOT EXISTS pipeline (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          stage TEXT DEFAULT 'discovery' CHECK (stage IN ('discovery', 'analysis', 'execution', 'done')),
          owner TEXT,
          expected_revenue REAL DEFAULT 0,
          actual_revenue REAL DEFAULT 0,
          notes TEXT,
          priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_pipeline_stage ON pipeline(stage);
      `);
    }
  },
  {
    id: '008',
    name: 'add_daily_reports_table',
    up: (db: Database.Database) => {
      console.log('[Migration 008] Adding daily_reports table...');
      db.exec(`
        CREATE TABLE IF NOT EXISTS daily_reports (
          id TEXT PRIMARY KEY,
          date TEXT NOT NULL,
          agent_id TEXT REFERENCES agents(id),
          agent_name TEXT,
          content TEXT NOT NULL,
          summary TEXT,
          submitted_at TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON daily_reports(date DESC);
        CREATE INDEX IF NOT EXISTS idx_daily_reports_agent ON daily_reports(agent_id);
      `);
    }
  },
];
