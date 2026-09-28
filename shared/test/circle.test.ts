import { describe, it, expect } from 'vitest';
import { pointsToSvgPath, Point } from '../circle';

describe('pointsToSvgPath', () => {
  it('returns empty string when given an empty points array', () => {
    expect(pointsToSvgPath([])).toBe('');
  });

  it('formats a single point with M command and clean integer coordinates', () => {
    const points: Point[] = [{ x: 100, y: 200 }];
    expect(pointsToSvgPath(points)).toBe('M 100 200');
  });

  it('formats multiple points with M and L commands using integers', () => {
    const points: Point[] = [
      { x: 100, y: 150 },
      { x: 120, y: 180 },
      { x: 140, y: 210 },
    ];
    expect(pointsToSvgPath(points)).toBe('M 100 150 L 120 180 L 140 210');
  });

  it('rounds floating-point coordinates to nearest integer without decimal points', () => {
    const points: Point[] = [
      { x: 100.4, y: 199.6 },
      { x: 120.5, y: 180.1 },
    ];
    expect(pointsToSvgPath(points)).toBe('M 100 200 L 121 180');
    expect(pointsToSvgPath(points)).not.toContain('.');
  });

  it('does not append .00 to integer coordinates', () => {
    const points: Point[] = [
      { x: 300, y: 200 },
      { x: 295, y: 230 },
    ];
    const path = pointsToSvgPath(points);
    expect(path).toBe('M 300 200 L 295 230');
    expect(path).not.toContain('.00');
  });
});
