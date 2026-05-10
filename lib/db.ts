import initSqlJs, { Database } from "sql.js";
import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "interview.db");

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs();

  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run("PRAGMA journal_mode=WAL");

  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      status TEXT NOT NULL DEFAULT 'preparing',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      material_texts TEXT NOT NULL DEFAULT '{}',
      attack_plan TEXT,
      debrief_report TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      topic TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id)`);

  saveDb();
  return db;
}

export function saveDb(): void {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(DB_PATH, buffer);
}

export async function createSession(materialTexts: Record<string, string>): Promise<number> {
  const d = await getDb();
  d.run("INSERT INTO sessions (material_texts, status) VALUES (?, 'preparing')", [JSON.stringify(materialTexts)]);
  saveDb();
  const result = d.exec("SELECT MAX(id) as id FROM sessions");
  return (result[0].values[0][0] as number);
}

export async function updateSessionAttackPlan(sessionId: number, attackPlan: object): Promise<void> {
  const d = await getDb();
  d.run("UPDATE sessions SET attack_plan = ?, status = 'active' WHERE id = ?", [
    JSON.stringify(attackPlan), sessionId,
  ]);
  saveDb();
}

export async function completeSession(sessionId: number, debriefReport: object): Promise<void> {
  const d = await getDb();
  d.run("UPDATE sessions SET status = 'completed', debrief_report = ? WHERE id = ?", [
    JSON.stringify(debriefReport), sessionId,
  ]);
  saveDb();
}

export async function getSession(sessionId: number): Promise<{
  id: number; status: string; created_at: string;
  material_texts: string; attack_plan: string | null; debrief_report: string | null;
} | null> {
  const d = await getDb();
  const stmt = d.prepare("SELECT id, status, created_at, material_texts, attack_plan, debrief_report FROM sessions WHERE id = ?");
  stmt.bind([sessionId]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row as any;
  }
  stmt.free();
  return null;
}

export async function listSessions(): Promise<{ id: number; status: string; created_at: string; material_texts: string }[]> {
  const d = await getDb();
  const results: any[] = [];
  const stmt = d.prepare("SELECT id, status, created_at, material_texts FROM sessions ORDER BY created_at DESC");
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export async function insertMessage(
  sessionId: number, role: string, content: string, topic?: string
): Promise<number> {
  const d = await getDb();
  d.run("INSERT INTO messages (session_id, role, content, topic) VALUES (?, ?, ?, ?)", [sessionId, role, content, topic || null]);
  saveDb();
  const result = d.exec("SELECT MAX(id) as id FROM messages");
  return (result[0].values[0][0] as number);
}

export async function getMessages(sessionId: number): Promise<{ id: number; role: string; content: string; topic: string | null; created_at: string }[]> {
  const d = await getDb();
  const results: any[] = [];
  const stmt = d.prepare("SELECT id, role, content, topic, created_at FROM messages WHERE session_id = ? ORDER BY id ASC");
  stmt.bind([sessionId]);
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export async function deleteSession(sessionId: number): Promise<boolean> {
  const d = await getDb();
  d.run("DELETE FROM messages WHERE session_id = ?", [sessionId]);
  d.run("DELETE FROM sessions WHERE id = ?", [sessionId]);
  saveDb();
  return true;
}

export async function getPastWeaknessCoverage(): Promise<string[]> {
  const d = await getDb();
  const pastWeaknesses: string[] = [];
  const stmt = d.prepare("SELECT attack_plan FROM sessions WHERE status = 'completed' AND attack_plan IS NOT NULL ORDER BY created_at DESC LIMIT 5");
  while (stmt.step()) {
    const row = stmt.getAsObject();
    try {
      const plan = JSON.parse(row.attack_plan as string);
      if (plan.attack_points) {
        for (const point of plan.attack_points) {
          if (point.covered) pastWeaknesses.push(point.weakness);
        }
      }
    } catch { /* skip malformed JSON */ }
  }
  stmt.free();
  return [...new Set(pastWeaknesses)];
}
