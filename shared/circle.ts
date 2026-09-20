export type Point = {
  x: number;
  y: number;
};

export class ReferenceCircle {
  constructor(
    public cx: number,
    public cy: number,
    public r: number
  ) {}

  static fromPoints(points: Point[]): ReferenceCircle | null {
    const center = getCenter(points);
    if (!center) return null;

    const sumDistSq = points.reduce(
      (acc, p) => acc + (p.x - center.x) ** 2 + (p.y - center.y) ** 2,
      0
    );
    const r = Math.sqrt(sumDistSq / points.length);

    return new ReferenceCircle(center.x, center.y, r);
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
};

export const getCircleStatsFromPoints = (
  points: Point[],
  ref: ReferenceCircle
): CircleStats | null => {
  if (points.length < 3) return null;

  let stats: CircleStats = {
    points: [points[0]],
    ref: ref,
    angle: 0,
    area: 0,
    perimeter: 0,
    rad_std_dev: 0,
    rad_cv: 0,
  };

  let prevAngle = Math.atan2(points[0].y - ref.cy, points[0].x - ref.cx);
  let varSum = (Math.hypot(points[0].x - ref.cx, points[0].y - ref.cy) - ref.r) ** 2;

  for (let i = 1; i < points.length; i++) {
    let l = points[i - 1];
    let r = points[i];
    let currAngle = Math.atan2(r.y - ref.cy, r.x - ref.cx);
    let delta = Math.atan2(Math.sin(currAngle - prevAngle), Math.cos(currAngle - prevAngle));

    if (Math.abs(stats.angle + delta) >= 2 * Math.PI) {
      r = points[0];
    }
    prevAngle = currAngle;
    stats.area += l.x * r.y - r.x * l.y;
    stats.perimeter += Math.hypot(r.x - l.x, r.y - l.y);
    stats.angle += delta;
    stats.points.push(r);

    const dist = Math.hypot(r.x - ref.cx, r.y - ref.cy);
    varSum += (dist - ref.r) ** 2;

    if (Math.abs(stats.angle) >= 2 * Math.PI) break;
  }

  stats.area = Math.abs(stats.area) / 2;
  stats.angle = Math.abs(stats.angle);
  stats.rad_std_dev = Math.sqrt(varSum / stats.points.length);
  stats.rad_cv = ref.r > 0 ? stats.rad_std_dev / ref.r : 1;
  return stats;
};

export function getCenter(points: Point[]): Point | null {
  if (points.length < 3) return null;

  const ptsSum = points.reduce(
    (acc, pt) => {
      acc.x += pt.x;
      acc.y += pt.y;
      return acc;
    },
    { x: 0, y: 0 }
  );

  const meanX = ptsSum.x / points.length;
  const meanY = ptsSum.y / points.length;

  let Suu = 0;
  let Svv = 0;
  let Suv = 0;
  let Suuu = 0;
  let Svvv = 0;
  let Suvv = 0;
  let Svuu = 0;

  for (let i = 0; i < points.length; i++) {
    const u = points[i].x - meanX;
    const v = points[i].y - meanY;
    const u2 = u * u;
    const v2 = v * v;
    Suu += u2;
    Svv += v2;
    Suv += u * v;
    Suuu += u2 * u;
    Svvv += v2 * v;
    Suvv += u * v2;
    Svuu += v * u2;
  }

  const det = Suu * Svv - Suv * Suv;
  if (Math.abs(det) < 1e-5) return null;

  const uc = (0.5 * ((Suuu + Suvv) * Svv - (Svvv + Svuu) * Suv)) / det;
  const vc = (0.5 * ((Svvv + Svuu) * Suu - (Suuu + Suvv) * Suv)) / det;

  return {
    x: uc + meanX,
    y: vc + meanY,
  };
}

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

  // 3. Aspect Ratio
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of stats.points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const w = maxX - minX;
  const h = maxY - minY;
  const aspect = w > 0 && h > 0 ? Math.min(w, h) / Math.max(w, h) : 0;

  // Quadratic aspect curve
  const errAspect = Math.min(1, (1 - aspect) / 0.4);
  const aspectFactor = Math.max(0, 1 - errAspect * errAspect);

  // Balanced Score calculation
  let finalScore = Q * radialFactor * aspectFactor * 100;
  finalScore = Math.max(0, Math.min(100, finalScore));

  return {
    score: finalScore,
    aspect,
    cvR: stats.rad_cv,
    iso: Q,
  };
}

export function pointsToSvgPath(pts: Point[]): string {
  if (pts.length === 0) return '';
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 1; i < pts.length; i++) {
    d += ` L ${pts[i].x.toFixed(2)} ${pts[i].y.toFixed(2)}`;
  }
  return d;
}
