import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import type { GameData } from '../../shared/game';

export function createTestD1(): { db: Database.Database; d1: D1Database } {
  const db = new Database(':memory:');

  // Load and apply all schema migrations in sequence
  const migrationsDir = path.resolve(__dirname, '../migrations');
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    db.exec(sql);
  }

  // Wrap better-sqlite3 in Cloudflare D1Database compatible API
  const d1 = {
    prepare: (sql: string) => {
      let boundParams: unknown[] = [];

      const stmtObj = {
        bind: (...params: unknown[]) => {
          boundParams = params;
          return stmtObj;
        },
        all: async <T = unknown>() => {
          const stmt = db.prepare(sql);
          const results = stmt.all(...boundParams) as T[];
          return { results, success: true, meta: {} };
        },
        first: async <T = unknown>(colName?: string) => {
          const stmt = db.prepare(sql);
          const row = stmt.get(...boundParams) as Record<string, unknown> | undefined;
          if (!row) return null;
          return (colName ? row[colName] : row) as T;
        },
        run: async () => {
          const stmt = db.prepare(sql);
          const info = stmt.run(...boundParams);
          return { success: true, meta: { changes: info.changes } };
        },
      };

      return stmtObj;
    },
    batch: async <T = unknown>(statements: Array<{ all: () => Promise<D1Result<T>> }>) => {
      const results = [];
      for (const stmt of statements) {
        results.push(await stmt.all());
      }
      return results;
    },
  } as unknown as D1Database;

  return { db, d1 };
}

export function insertTestGame(
  db: Database.Database,
  game: Partial<GameData> & { player_name: string; score: number }
): GameData {
  const id = game.id ?? crypto.randomUUID();
  const paths =
    game.paths ??
    JSON.stringify([
      { x: 100, y: 100 },
      { x: 150, y: 150 },
    ]);
  const cx = game.reference_cx ?? 150;
  const cy = game.reference_cy ?? 150;
  const r = game.reference_radius ?? 50;
  const direction = game.direction ?? null;
  const device = game.device ?? null;
  const createdAt = game.created_at ?? new Date().toISOString().replace('T', ' ').slice(0, 19);

  db.prepare(
    `INSERT INTO games (id, player_name, paths, score, reference_cx, reference_cy, reference_radius, direction, device, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, game.player_name, paths, game.score, cx, cy, r, direction, device, createdAt);

  return {
    id,
    player_name: game.player_name,
    paths,
    score: game.score,
    reference_cx: cx,
    reference_cy: cy,
    reference_radius: r,
    direction,
    device,
    created_at: createdAt,
  };
}

export function hoursAgo(hours: number): string {
  const d = new Date(Date.now() - hours * 3600 * 1000);
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

export function daysAgo(days: number): string {
  const d = new Date(Date.now() - days * 86400 * 1000);
  return d.toISOString().replace('T', ' ').slice(0, 19);
}
