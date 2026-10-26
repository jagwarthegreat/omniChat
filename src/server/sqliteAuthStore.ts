// @ts-ignore - DatabaseSync is built into Node.js 22.14+ via node:sqlite
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), '.whatsapp_session.db');

export class SQLiteAuthStore {
  private db: any = null;

  constructor() {
    this.initDatabase();
  }

  private initDatabase() {
    try {
      this.db = new DatabaseSync(DB_PATH);
      this.initTables();
      console.log('SQLite WhatsApp session database initialized at:', DB_PATH);
    } catch (err) {
      console.error('Failed to initialize SQLite database:', err);
    }
  }

  private initTables() {
    if (!this.db) return;
    try {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS auth_keys (
          id TEXT PRIMARY KEY,
          data TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS session_meta (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS chats (
          jid TEXT PRIMARY KEY,
          name TEXT,
          is_group INTEGER,
          unread_count INTEGER,
          last_message TEXT,
          last_sender TEXT,
          last_activity INTEGER,
          avatar_url TEXT,
          raw_data TEXT,
          updated_at INTEGER
        );
      `);
    } catch (err) {
      console.error('Error creating SQLite tables:', err);
    }
  }

  // Save an individual auth key / credential file
  saveAuthKey(filename: string, content: string): boolean {
    if (!this.db) return false;
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO auth_keys (id, data, updated_at)
        VALUES (?, ?, ?)
      `);
      stmt.run(filename, content, Date.now());
      return true;
    } catch (err) {
      console.error(`Error saving auth key ${filename} to SQLite:`, err);
      return false;
    }
  }

  // Get all auth files from SQLite
  getAllAuthKeys(): Record<string, string> {
    if (!this.db) return {};
    try {
      const stmt = this.db.prepare(`SELECT id, data FROM auth_keys`);
      const rows = stmt.all();
      const result: Record<string, string> = {};
      for (const r of rows) {
        result[r.id] = r.data;
      }
      return result;
    } catch (err) {
      console.error('Error getting auth keys from SQLite:', err);
      return {};
    }
  }

  // Check if creds.json exists in SQLite
  hasCreds(): boolean {
    if (!this.db) return false;
    try {
      const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM auth_keys WHERE id = 'creds.json'`);
      const row = stmt.get();
      return Boolean(row && row.count > 0);
    } catch {
      return false;
    }
  }

  // Count total auth keys
  getAuthKeyCount(): number {
    if (!this.db) return 0;
    try {
      const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM auth_keys`);
      const row = stmt.get();
      return row ? Number(row.count) : 0;
    } catch {
      return 0;
    }
  }

  // Save metadata
  setMeta(key: string, value: string) {
    if (!this.db) return;
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO session_meta (key, value, updated_at)
        VALUES (?, ?, ?)
      `);
      stmt.run(key, value, Date.now());
    } catch (err) {
      console.error(`Error setting meta ${key}:`, err);
    }
  }

  getMeta(key: string): string | null {
    if (!this.db) return null;
    try {
      const stmt = this.db.prepare(`SELECT value FROM session_meta WHERE key = ?`);
      const row = stmt.get(key);
      return row ? String(row.value) : null;
    } catch {
      return null;
    }
  }

  // Sync all files from auth folder on disk into SQLite
  syncDirectoryToDb(authDir: string): number {
    if (!fs.existsSync(authDir) || !this.db) return 0;
    let saved = 0;
    try {
      const files = fs.readdirSync(authDir);
      for (const file of files) {
        const fullPath = path.join(authDir, file);
        if (fs.statSync(fullPath).isFile()) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            this.saveAuthKey(file, content);
            saved++;
          } catch (e) {
            console.warn(`Error reading auth file ${file}:`, e);
          }
        }
      }
    } catch (err) {
      console.error('Error syncing auth directory to SQLite:', err);
    }
    return saved;
  }

  // Restore files from SQLite into auth folder on disk
  restoreDbToDirectory(authDir: string): number {
    if (!this.db) return 0;
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }
    const keys = this.getAllAuthKeys();
    let restoredCount = 0;
    for (const [filename, content] of Object.entries(keys)) {
      try {
        fs.writeFileSync(path.join(authDir, filename), content, 'utf-8');
        restoredCount++;
      } catch (e) {
        console.warn(`Error writing restored file ${filename}:`, e);
      }
    }
    return restoredCount;
  }

  // Import batch keys (e.g. from client localStorage backup)
  importKeys(keys: Record<string, string>): number {
    if (!this.db || !keys) return 0;
    let count = 0;
    for (const [filename, content] of Object.entries(keys)) {
      if (filename && typeof content === 'string') {
        if (this.saveAuthKey(filename, content)) {
          count++;
        }
      }
    }
    return count;
  }

  // Clear auth keys on deliberate logout
  clearAuthKeys() {
    if (!this.db) return;
    try {
      this.db.exec(`DELETE FROM auth_keys;`);
      this.db.exec(`DELETE FROM session_meta WHERE key IN ('connectedPhone', 'connectedName', 'status');`);
    } catch (err) {
      console.error('Error clearing SQLite auth keys:', err);
    }
  }
}

export const sqliteAuthStore = new SQLiteAuthStore();
