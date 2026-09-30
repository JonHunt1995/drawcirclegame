-- Migration: 0002_add_direction_and_device.sql
ALTER TABLE games ADD COLUMN direction TEXT CHECK (direction IS NULL OR direction IN ('clockwise', 'counterclockwise'));
ALTER TABLE games ADD COLUMN device TEXT CHECK (device IS NULL OR device IN ('mobile', 'tablet', 'desktop'));
