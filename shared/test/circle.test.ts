import { describe, expect, it } from 'vitest';
import { getCircleStats, type Point, pointsToSvgPath, ReferenceCircle } from '../circle';
import { categorizeDevice } from '../game';

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

describe('getCircleStats direction calculation', () => {
  const ref = new ReferenceCircle(100, 100, 50);

  it('detects clockwise direction with positive signed angle', () => {
    // Generate 36 points in clockwise sequence in screen coordinates (+y down)
    const points: Point[] = [];
    for (let i = 0; i <= 36; i++) {
      const theta = (i / 36) * 2 * Math.PI;
      points.push({
        x: Math.round(100 + 50 * Math.cos(theta)),
        y: Math.round(100 + 50 * Math.sin(theta)),
      });
    }

    const stats = getCircleStats(points, ref);
    expect(stats).not.toBeNull();
    expect(stats?.direction).toBe('clockwise');
    expect(stats?.angle).toBeGreaterThan(0);
  });

  it('detects counterclockwise direction with negative signed angle', () => {
    // Generate 36 points in counterclockwise sequence in screen coordinates
    const points: Point[] = [];
    for (let i = 0; i <= 36; i++) {
      const theta = -(i / 36) * 2 * Math.PI;
      points.push({
        x: Math.round(100 + 50 * Math.cos(theta)),
        y: Math.round(100 + 50 * Math.sin(theta)),
      });
    }

    const stats = getCircleStats(points, ref);
    expect(stats).not.toBeNull();
    expect(stats?.direction).toBe('counterclockwise');
    expect(stats?.angle).toBeLessThan(0);
  });
});

describe('categorizeDevice', () => {
  it('categorizes non-touch devices as desktop regardless of screen width', () => {
    expect(categorizeDevice(375, false)).toBe('desktop');
    expect(categorizeDevice(800, false)).toBe('desktop');
    expect(categorizeDevice(1440, false)).toBe('desktop');
  });

  it('categorizes touch screens based on screen width breakpoints', () => {
    expect(categorizeDevice(375, true)).toBe('mobile');
    expect(categorizeDevice(767, true)).toBe('mobile');
    expect(categorizeDevice(768, true)).toBe('tablet');
    expect(categorizeDevice(1024, true)).toBe('tablet');
    expect(categorizeDevice(1025, true)).toBe('desktop');
    expect(categorizeDevice(1920, true)).toBe('desktop');
  });

  it('defaults to desktop when metrics are missing or undefined', () => {
    expect(categorizeDevice()).toBe('desktop');
    expect(categorizeDevice(undefined, undefined)).toBe('desktop');
  });
});
