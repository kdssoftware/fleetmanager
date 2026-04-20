import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'fleets.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS designated_fleets (
    designation TEXT PRIMARY KEY,
    fleet_id TEXT,
    marker_character_id TEXT,
    marker_refresh_token TEXT
  )
`);

export default db;
