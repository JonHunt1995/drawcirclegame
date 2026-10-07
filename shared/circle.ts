export type Point = {
  x: number;
  y: number;
};

export type CircleMoments = {
  sumUSquared: number;
  sumVSquared: number;
  sumUV: number;
  sumUZ: number;
  sumVZ: number;
};

export function computeCircleMoments(points: Point[], meanX: number, meanY: number): CircleMoments {
  return points.reduce<CircleMoments>(
    (acc, p) => {
      const u = p.x - meanX;
      const v = p.y - meanY;
      const z = u * u + v * v;
      acc.sumUSquared += u * u;
      acc.sumVSquared += v * v;
      acc.sumUV += u * v;
      acc.sumUZ += u * z;
      acc.sumVZ += v * z;
      return acc;
    },
    { sumUSquared: 0, sumVSquared: 0, sumUV: 0, sumUZ: 0, sumVZ: 0 }
  );
}

export class ReferenceCircle {
  constructor(
    public cx: number,
    public cy: number,
    public r: number
  ) {}

  static fromPoints(points: Point[]): ReferenceCircle | null {
    const n = points.length;
    if (n < 3) return null;

    const ptsSum = points.reduce(
      (acc, pt) => {
        acc.x += pt.x;
        acc.y += pt.y;
        return acc;
      },
      { x: 0, y: 0 }
    );
    const meanX = ptsSum.x / n;
    const meanY = ptsSum.y / n;

    const moments = computeCircleMoments(points, meanX, meanY);

    const det = moments.sumUSquared * moments.sumVSquared - moments.sumUV * moments.sumUV;
    if (Math.abs(det) < 1e-5) return null;

    const uc = (0.5 * (moments.sumUZ * moments.sumVSquared - moments.sumVZ * moments.sumUV)) / det;
    const vc = (0.5 * (moments.sumVZ * moments.sumUSquared - moments.sumUZ * moments.sumUV)) / det;

    const rSq = uc * uc + vc * vc + (moments.sumUSquared + moments.sumVSquared) / n;
    if (rSq <= 0) return null;

    return new ReferenceCircle(meanX + uc, meanY + vc, Math.sqrt(rSq));
  }
}

export type CircleEvaluation = {
  score: number;
  aspect: number;
  cvR: number;
  iso: number;
};

export type CircleStats = {
  points: Point[];
  ref: ReferenceCircle;
  angle: number;
  area: number;
  perimeter: number;
  rad_std_dev: number;
  rad_cv: number;
  aspect_ratio: number;
  direction: DrawingDirection;
};

export type DrawingDirection = 'clockwise' | 'counterclockwise';
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export const getCircleStats = (points: Point[], ref: ReferenceCircle): CircleStats | null => {
  if (points.length < 3) return null;

  const stats: CircleStats = {
    points: [points[0]],
    ref: ref,
    angle: 0,
    direction: 'clockwise',
    area: 0,
    perimeter: 0,
    rad_std_dev: 0,
    rad_cv: 0,
    aspect_ratio: 0,
  };

  let prevAngle = Math.atan2(points[0].y - ref.cy, points[0].x - ref.cx);
  let varSum = (Math.hypot(points[0].x - ref.cx, points[0].y - ref.cy) - ref.r) ** 2;
  let minX = points[0].x;
  let maxX = points[0].x;
  let minY = points[0].y;
  let maxY = points[0].y;

  for (let i = 1; i < points.length; i++) {
    const l = points[i - 1];
    let r = points[i];
    const currAngle = Math.atan2(r.y - ref.cy, r.x - ref.cx);
    const delta = Math.atan2(Math.sin(currAngle - prevAngle), Math.cos(currAngle - prevAngle));

    if (Math.abs(stats.angle + delta) >= 2 * Math.PI) {
      r = points[0];
    }

    if (r.x < minX) minX = r.x;
    if (r.x > maxX) maxX = r.x;
    if (r.y < minY) minY = r.y;
    if (r.y > maxY) maxY = r.y;

    prevAngle = currAngle;
    stats.area += l.x * r.y - r.x * l.y;
    stats.perimeter += Math.hypot(r.x - l.x, r.y - l.y);
    stats.angle += delta;
    stats.points.push(r);

    const dist = Math.hypot(r.x - ref.cx, r.y - ref.cy);
    varSum += (dist - ref.r) ** 2;

    if (Math.abs(stats.angle) >= 2 * Math.PI) break;
  }

  stats.direction = stats.angle >= 0 ? 'clockwise' : 'counterclockwise';
  stats.area = Math.abs(stats.area) / 2;
  stats.rad_std_dev = Math.sqrt(varSum / stats.points.length);
  stats.rad_cv = ref.r > 0 ? stats.rad_std_dev / ref.r : 1;
  const w = maxX - minX;
  const h = maxY - minY;
  stats.aspect_ratio = w > 0 && h > 0 ? Math.min(w, h) / Math.max(w, h) : 0;
  return stats;
};

export const getCircleStatsFromPoints = getCircleStats;

export function evaluateCircle(stats: CircleStats): CircleEvaluation {
  // 1. Isoperimetric Quotient
  let Q = 0;
  if (stats.perimeter > 0) {
    Q = (4 * Math.PI * stats.area) / (stats.perimeter * stats.perimeter);
  }
  Q = Math.min(1, Math.max(0, Q));

  // 2. Radial Deviation (using precomputed rad_cv)
  const errR = Math.min(1, stats.rad_cv / 0.16);
  const radialFactor = Math.max(0, 1 - errR * errR);

  // 3. Aspect Ratio Factor (using precomputed stats.aspect_ratio)
  const errAspect = Math.min(1, (1 - stats.aspect_ratio) / 0.4);
  const aspectFactor = Math.max(0, 1 - errAspect * errAspect);

  // Balanced Score calculation
  let finalScore = Q * radialFactor * aspectFactor * 100;
  finalScore = Math.max(0, Math.min(100, finalScore));

  return {
    score: finalScore,
    aspect: stats.aspect_ratio,
    cvR: stats.rad_cv,
    iso: Q,
  };
}

export function pointsToSvgPath(pts: Point[]): string {
  if (pts.length === 0) return '';
  let d = `M ${Math.round(pts[0].x)} ${Math.round(pts[0].y)}`;
  for (let i = 1; i < pts.length; i++) {
    const { x, y } = pts[i];
    d += ` L ${Math.round(x)} ${Math.round(y)}`;
  }
  return d;
}
