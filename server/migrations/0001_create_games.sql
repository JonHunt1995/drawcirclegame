-- Migration: 0001_create_games.sql
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  player_name TEXT NOT NULL,
  paths TEXT NOT NULL,
  score REAL NOT NULL,
  reference_cx REAL,
  reference_cy REAL,
  reference_radius REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
