import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import type { GameData } from '../../shared/game';

export function createTestD1(): { db: Database.Database; d1: D1Database } {
  const db = new Database(':memory:');

  // Load and apply initial schema migration
  const migrationPath = path.resolve(__dirname, '../migrations/0001_create_games.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  db.exec(migrationSql);

  // Wrap better-sqlite3 in Cloudflare D1Database compatible API
  const d1 = {
    prepare: (sql: string) => {
      let boundParams: any[] = [];

      const stmtObj = {
        bind: (...params: any[]) => {
          boundParams = params;
          return stmtObj;
        },
        all: async <T = any>() => {
          const stmt = db.prepare(sql);
          const results = stmt.all(...boundParams) as T[];
          return { results, success: true, meta: {} };
        },
        first: async <T = any>(colName?: string) => {
          const stmt = db.prepare(sql);
          const row = stmt.get(...boundParams) as any;
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
  const createdAt = game.created_at ?? new Date().toISOString();

  db.prepare(
    `INSERT INTO games (id, player_name, paths, score, reference_cx, reference_cy, reference_radius, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, game.player_name, paths, game.score, cx, cy, r, createdAt);

  return {
    id,
    player_name: game.player_name,
    paths,
    score: game.score,
    reference_cx: cx,
    reference_cy: cy,
    reference_radius: r,
    created_at: createdAt,
  };
}
