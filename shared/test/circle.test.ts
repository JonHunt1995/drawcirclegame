import { describe, expect, it } from 'vitest';
import {
  computeCircleMoments,
  evaluateCircle,
  getCircleStats,
  type Point,
  pointsToSvgPath,
  ReferenceCircle,
} from '../circle';
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

describe('ReferenceCircle.fromPoints', () => {
  it('returns null for fewer than 3 points', () => {
    expect(ReferenceCircle.fromPoints([])).toBeNull();
    expect(ReferenceCircle.fromPoints([{ x: 10, y: 10 }])).toBeNull();
    expect(
      ReferenceCircle.fromPoints([
        { x: 10, y: 10 },
        { x: 20, y: 20 },
      ])
    ).toBeNull();
  });

  it('returns null for collinear points where determinant approaches zero', () => {
    const collinear: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 20 },
      { x: 30, y: 30 },
    ];
    expect(ReferenceCircle.fromPoints(collinear)).toBeNull();
  });

  it('accurately recovers center and radius of an exact circle', () => {
    const trueCx = 150;
    const trueCy = 250;
    const trueR = 80;

    const points: Point[] = [];
    for (let i = 0; i < 36; i++) {
      const theta = (i / 36) * 2 * Math.PI;
      points.push({
        x: trueCx + trueR * Math.cos(theta),
        y: trueCy + trueR * Math.sin(theta),
      });
    }

    const fit = ReferenceCircle.fromPoints(points);
    expect(fit).not.toBeNull();
    expect(fit?.cx).toBeCloseTo(trueCx, 4);
    expect(fit?.cy).toBeCloseTo(trueCy, 4);
    expect(fit?.r).toBeCloseTo(trueR, 4);
  });

  it('accurately fits circle under large translated coordinates', () => {
    const trueCx = 12500;
    const trueCy = 35000;
    const trueR = 450;

    const points: Point[] = [];
    for (let i = 0; i < 40; i++) {
      const theta = (i / 40) * 2 * Math.PI;
      points.push({
        x: trueCx + trueR * Math.cos(theta),
        y: trueCy + trueR * Math.sin(theta),
      });
    }

    const fit = ReferenceCircle.fromPoints(points);
    expect(fit).not.toBeNull();
    expect(fit?.cx).toBeCloseTo(trueCx, 2);
    expect(fit?.cy).toBeCloseTo(trueCy, 2);
    expect(fit?.r).toBeCloseTo(trueR, 2);
  });

  it('fits noisy circle data closely to expected ground truth', () => {
    const trueCx = 200;
    const trueCy = 200;
    const trueR = 100;

    // Small deterministic radial perturbations
    const points: Point[] = [];
    for (let i = 0; i < 36; i++) {
      const theta = (i / 36) * 2 * Math.PI;
      const noise = (i % 2 === 0 ? 1 : -1) * 2;
      const r = trueR + noise;
      points.push({
        x: trueCx + r * Math.cos(theta),
        y: trueCy + r * Math.sin(theta),
      });
    }

    const fit = ReferenceCircle.fromPoints(points);
    expect(fit).not.toBeNull();
    expect(fit?.cx).toBeCloseTo(trueCx, 1);
    expect(fit?.cy).toBeCloseTo(trueCy, 1);
    expect(fit?.r).toBeCloseTo(trueR, 1);
  });
});

describe('computeCircleMoments', () => {
  it('accumulates zero moments for empty points list', () => {
    const moments = computeCircleMoments([], 0, 0);
    expect(moments).toEqual({
      sumUSquared: 0,
      sumVSquared: 0,
      sumUV: 0,
      sumUZ: 0,
      sumVZ: 0,
    });
  });

  it('correctly calculates centered moments for symmetric points', () => {
    // 4 points on circle around (10, 20) with r = 5
    const points: Point[] = [
      { x: 15, y: 20 }, // u = 5, v = 0, z = 25
      { x: 5, y: 20 }, // u = -5, v = 0, z = 25
      { x: 10, y: 25 }, // u = 0, v = 5, z = 25
      { x: 10, y: 15 }, // u = 0, v = -5, z = 25
    ];
    const moments = computeCircleMoments(points, 10, 20);

    // sumUSquared = 25 + 25 + 0 + 0 = 50
    expect(moments.sumUSquared).toBe(50);
    // sumVSquared = 0 + 0 + 25 + 25 = 50
    expect(moments.sumVSquared).toBe(50);
    // sumUV = 0
    expect(moments.sumUV).toBe(0);
    // sumUZ = 5*25 + (-5)*25 + 0 + 0 = 0
    expect(moments.sumUZ).toBe(0);
    // sumVZ = 0 + 0 + 5*25 + (-5)*25 = 0
    expect(moments.sumVZ).toBe(0);
  });
});

describe('Real user games from local DB regression check', () => {
  it('accurately reproduces reference circle and score for Game 86a1ae22 (score: 75.57)', () => {
    const rawPoints: Point[] = [
      { x: 294, y: 533 },
      { x: 294, y: 533 },
      { x: 295, y: 533 },
      { x: 301, y: 534 },
      { x: 311, y: 534 },
      { x: 327, y: 534 },
      { x: 347, y: 534 },
      { x: 366, y: 533 },
      { x: 385, y: 528 },
      { x: 403, y: 520 },
      { x: 420, y: 510 },
      { x: 434, y: 497 },
      { x: 443, y: 483 },
      { x: 450, y: 468 },
      { x: 455, y: 452 },
      { x: 458, y: 436 },
      { x: 459, y: 416 },
      { x: 460, y: 397 },
      { x: 458, y: 380 },
      { x: 452, y: 363 },
      { x: 445, y: 347 },
      { x: 436, y: 334 },
      { x: 426, y: 323 },
      { x: 416, y: 314 },
      { x: 402, y: 307 },
      { x: 388, y: 302 },
      { x: 371, y: 300 },
      { x: 351, y: 299 },
      { x: 333, y: 300 },
      { x: 316, y: 302 },
      { x: 300, y: 306 },
      { x: 285, y: 312 },
      { x: 271, y: 319 },
      { x: 260, y: 328 },
      { x: 250, y: 338 },
      { x: 241, y: 349 },
      { x: 234, y: 362 },
      { x: 226, y: 376 },
      { x: 220, y: 390 },
      { x: 215, y: 405 },
      { x: 212, y: 420 },
      { x: 210, y: 436 },
      { x: 210, y: 451 },
      { x: 211, y: 469 },
      { x: 215, y: 485 },
      { x: 221, y: 500 },
      { x: 230, y: 514 },
      { x: 238, y: 525 },
      { x: 246, y: 533 },
      { x: 254, y: 539 },
      { x: 259, y: 543 },
      { x: 264, y: 545 },
      { x: 269, y: 547 },
      { x: 272, y: 549 },
      { x: 275, y: 550 },
      { x: 278, y: 550 },
      { x: 281, y: 551 },
      { x: 285, y: 552 },
      { x: 294, y: 533 },
    ];

    const ref = ReferenceCircle.fromPoints(rawPoints);
    expect(ref).not.toBeNull();
    // Stored in SQL: reference_cx = 333.6251041556753, cy = 424.6025283838885, r = 127.02681400688672
    expect(ref?.cx).toBeCloseTo(333.625104, 5);
    expect(ref?.cy).toBeCloseTo(424.602528, 5);
    expect(ref?.r).toBeCloseTo(127.026814, 5);

    const stats = getCircleStats(rawPoints, ref!);
    expect(stats).not.toBeNull();
    const evaluation = evaluateCircle(stats!);

    // Stored in SQL: score = 75.5664946777655
    expect(evaluation.score).toBeCloseTo(75.566495, 5);
  });

  it('accurately reproduces reference circle and score for Game 71cb1d13 (score: 43.92)', () => {
    const rawPoints: Point[] = [
      { x: 470, y: 119 },
      { x: 470, y: 119 },
      { x: 469, y: 119 },
      { x: 466, y: 119 },
      { x: 459, y: 118 },
      { x: 450, y: 118 },
      { x: 435, y: 117 },
      { x: 421, y: 117 },
      { x: 411, y: 117 },
      { x: 402, y: 117 },
      { x: 392, y: 120 },
      { x: 381, y: 124 },
      { x: 371, y: 128 },
      { x: 360, y: 135 },
      { x: 350, y: 142 },
      { x: 341, y: 151 },
      { x: 332, y: 159 },
      { x: 326, y: 168 },
      { x: 321, y: 175 },
      { x: 317, y: 183 },
      { x: 315, y: 190 },
      { x: 315, y: 199 },
      { x: 315, y: 209 },
      { x: 317, y: 219 },
      { x: 322, y: 228 },
      { x: 329, y: 237 },
      { x: 338, y: 245 },
      { x: 348, y: 253 },
      { x: 360, y: 259 },
      { x: 373, y: 265 },
      { x: 391, y: 271 },
      { x: 409, y: 275 },
      { x: 425, y: 277 },
      { x: 442, y: 278 },
      { x: 458, y: 279 },
      { x: 471, y: 277 },
      { x: 483, y: 273 },
      { x: 494, y: 268 },
      { x: 502, y: 261 },
      { x: 510, y: 254 },
      { x: 515, y: 245 },
      { x: 519, y: 235 },
      { x: 523, y: 224 },
      { x: 525, y: 212 },
      { x: 526, y: 201 },
      { x: 526, y: 191 },
      { x: 525, y: 182 },
      { x: 524, y: 174 },
      { x: 521, y: 167 },
      { x: 517, y: 159 },
      { x: 514, y: 152 },
      { x: 510, y: 146 },
      { x: 507, y: 140 },
      { x: 503, y: 136 },
      { x: 500, y: 132 },
      { x: 497, y: 129 },
      { x: 494, y: 126 },
      { x: 491, y: 124 },
      { x: 488, y: 123 },
      { x: 485, y: 123 },
      { x: 481, y: 122 },
      { x: 478, y: 122 },
      { x: 474, y: 122 },
      { x: 471, y: 122 },
      { x: 469, y: 122 },
      { x: 470, y: 119 },
    ];

    const ref = ReferenceCircle.fromPoints(rawPoints);
    expect(ref).not.toBeNull();
    // Stored in SQL: reference_cx = 424.11750015314544, cy = 199.52746674615753, r = 96.00755496498134
    expect(ref?.cx).toBeCloseTo(424.1175, 5);
    expect(ref?.cy).toBeCloseTo(199.527467, 5);
    expect(ref?.r).toBeCloseTo(96.007555, 5);

    const stats = getCircleStats(rawPoints, ref!);
    expect(stats).not.toBeNull();
    const evaluation = evaluateCircle(stats!);

    // Stored in SQL: score = 43.92416085583563
    expect(evaluation.score).toBeCloseTo(43.924161, 5);
  });

  it('accurately reproduces reference circle and score for Game 659679e0 (score: 22.79)', () => {
    const rawPoints: Point[] = [
      { x: 294, y: 216 },
      { x: 294, y: 216 },
      { x: 294, y: 216 },
      { x: 293, y: 216 },
      { x: 291, y: 217 },
      { x: 287, y: 221 },
      { x: 282, y: 226 },
      { x: 275, y: 233 },
      { x: 269, y: 241 },
      { x: 263, y: 249 },
      { x: 259, y: 258 },
      { x: 256, y: 267 },
      { x: 255, y: 278 },
      { x: 255, y: 291 },
      { x: 255, y: 305 },
      { x: 257, y: 318 },
      { x: 262, y: 329 },
      { x: 269, y: 340 },
      { x: 278, y: 350 },
      { x: 289, y: 359 },
      { x: 301, y: 367 },
      { x: 316, y: 372 },
      { x: 335, y: 376 },
      { x: 351, y: 377 },
      { x: 365, y: 377 },
      { x: 381, y: 377 },
      { x: 394, y: 375 },
      { x: 404, y: 373 },
      { x: 411, y: 369 },
      { x: 417, y: 364 },
      { x: 422, y: 357 },
      { x: 425, y: 349 },
      { x: 426, y: 338 },
      { x: 426, y: 325 },
      { x: 424, y: 311 },
      { x: 420, y: 298 },
      { x: 415, y: 287 },
      { x: 407, y: 275 },
      { x: 397, y: 264 },
      { x: 387, y: 255 },
      { x: 377, y: 246 },
      { x: 371, y: 241 },
      { x: 366, y: 237 },
      { x: 357, y: 230 },
      { x: 348, y: 224 },
      { x: 341, y: 219 },
      { x: 336, y: 216 },
      { x: 330, y: 212 },
      { x: 325, y: 209 },
      { x: 321, y: 206 },
      { x: 316, y: 204 },
      { x: 312, y: 202 },
      { x: 308, y: 200 },
      { x: 304, y: 199 },
      { x: 301, y: 198 },
      { x: 298, y: 198 },
      { x: 295, y: 198 },
      { x: 293, y: 198 },
      { x: 291, y: 198 },
      { x: 289, y: 199 },
      { x: 288, y: 199 },
      { x: 287, y: 201 },
      { x: 294, y: 216 },
    ];

    const ref = ReferenceCircle.fromPoints(rawPoints);
    expect(ref).not.toBeNull();
    // Stored in SQL: reference_cx = 337.02887069860236, cy = 293.38309494287626, r = 88.73319795840777
    expect(ref?.cx).toBeCloseTo(337.028871, 5);
    expect(ref?.cy).toBeCloseTo(293.383095, 5);
    expect(ref?.r).toBeCloseTo(88.733198, 5);

    const stats = getCircleStats(rawPoints, ref!);
    expect(stats).not.toBeNull();
    const evaluation = evaluateCircle(stats!);

    // Stored in SQL: score = 22.791804546756385
    expect(evaluation.score).toBeCloseTo(22.791805, 5);
  });
});
