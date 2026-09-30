import type { DeviceType, DrawingDirection, Point } from './circle';

export type GameRequest = {
  name?: string;
  points: Point[];
  screenWidth?: number;
  isTouch?: boolean;
};

export type GameData = {
  id: string;
  player_name: string;
  paths: string;
  score: number;
  reference_cx: number;
  reference_cy: number;
  reference_radius: number;
  direction?: DrawingDirection | null;
  device?: DeviceType | null;
  created_at: string;
};

export type RankedGameData = GameData & {
  rank: number;
  game_count: number;
};

export function categorizeDevice(screenWidth?: number, isTouch?: boolean): DeviceType {
  if (typeof screenWidth === 'number' && typeof isTouch === 'boolean') {
    switch (true) {
      case !isTouch:
        return 'desktop';
      case screenWidth < 768:
        return 'mobile';
      case screenWidth <= 1024:
        return 'tablet';
      default:
        return 'desktop';
    }
  }
  return 'desktop';
}
