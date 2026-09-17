export type Point = {
  x: number;
  y: number;
};

export type ReferenceCircle = {
  cx: number;
  cy: number;
  r: number;
};

export type Feedback = {
  title: string;
  feedback: string;
};

export type CircleEvaluation = {
  score: number;
  aspect: number;
  cvR: number;
  iso: number;
  title: string;
  feedback: string;
};

export function fitCircle(pts: Point[]): ReferenceCircle | null {
  const n = pts.length;
  if (n < 3) return null;

  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += pts[i].x;
    sumY += pts[i].y;
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let Suu = 0;
  let Svv = 0;
  let Suv = 0;
  let Suuu = 0;
  let Svvv = 0;
  let Suvv = 0;
  let Svuu = 0;

  for (let i = 0; i < n; i++) {
    const u = pts[i].x - meanX;
    const v = pts[i].y - meanY;
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
    cx: uc + meanX,
    cy: vc + meanY,
    r: Math.sqrt(uc * uc + vc * vc + (Suu + Svv) / n),
  };
}

export function calculateShoelaceArea(pts: Point[]): number {
  let area = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    area += pts[i].x * pts[i + 1].y - pts[i + 1].x * pts[i].y;
  }
  return Math.abs(area) / 2;
}

export function calculatePerimeter(pts: Point[]): number {
  let len = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    len += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
  }
  return len;
}

export function calculateCumulativeAngle(pts: Point[], cx: number, cy: number): number {
  let total = 0;
  let prevAngle = Math.atan2(pts[0].y - cy, pts[0].x - cx);

  for (let i = 1; i < pts.length; i++) {
    const currAngle = Math.atan2(pts[i].y - cy, pts[i].x - cx);
    let delta = currAngle - prevAngle;
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    total += delta;
    prevAngle = currAngle;
  }
  return total;
}

export function trimStrokeTo360(
  pts: Point[],
  cx: number,
  cy: number
): { trimmed: Point[]; reached360: boolean } {
  let total = 0;
  let prevAngle = Math.atan2(pts[0].y - cy, pts[0].x - cx);
  const trimmed: Point[] = [pts[0]];

  for (let i = 1; i < pts.length; i++) {
    const currAngle = Math.atan2(pts[i].y - cy, pts[i].x - cx);
    let delta = currAngle - prevAngle;

    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;

    const nextTotal = total + delta;

    if (Math.abs(nextTotal) >= 2 * Math.PI) {
      const sign = delta >= 0 ? 1 : -1;
      const target = sign * 2 * Math.PI;
      const remaining = target - total;
      const t = delta !== 0 ? Math.max(0, Math.min(1, remaining / delta)) : 1;

      const interpX = pts[i - 1].x + t * (pts[i].x - pts[i - 1].x);
      const interpY = pts[i - 1].y + t * (pts[i].y - pts[i - 1].y);
      trimmed.push({ x: interpX, y: interpY });

      return { trimmed, reached360: true };
    }

    total = nextTotal;
    prevAngle = currAngle;
    trimmed.push(pts[i]);
  }

  return { trimmed, reached360: false };
}

export function getFeedback(score: number): Feedback {
  if (score >= 90) {
    return {
      title: 'Nearly Flawless!',
      feedback: 'Outstanding symmetry and flow',
    };
  } else if (score >= 80) {
    return {
      title: 'Great Circle!',
      feedback: 'Very round and smooth',
    };
  } else if (score >= 65) {
    return {
      title: 'Good Attempt',
      feedback: 'A few wobbles along the rim',
    };
  } else if (score >= 40) {
    return {
      title: 'Distorted',
      feedback: 'Uneven radius or oval shape',
    };
  } else {
    return {
      title: 'Not a Circle',
      feedback: 'Sharp corners or flat edges',
    };
  }
}

export function evaluateCircle(pts: Point[], fit: ReferenceCircle): CircleEvaluation {
  const area = calculateShoelaceArea(pts);
  const perimeter = calculatePerimeter(pts);

  // 1. Isoperimetric Quotient
  let Q = 0;
  if (perimeter > 0) {
    Q = (4 * Math.PI * area) / (perimeter * perimeter);
  }
  Q = Math.min(1, Math.max(0, Q));

  // 2. Radial Deviation (Coefficient of Variation)
  let sumR = 0;
  const radii = pts.map((p) => {
    const r = Math.hypot(p.x - fit.cx, p.y - fit.cy);
    sumR += r;
    return r;
  });
  const meanR = sumR / pts.length;
  let varSum = 0;
  for (const r of radii) {
    varSum += (r - meanR) ** 2;
  }
  const stdDevR = Math.sqrt(varSum / pts.length);
  const cvR = meanR > 0 ? stdDevR / meanR : 1;

  // Quadratic radial curve:
  // Under 5% cvR docks < 5%. Over 15% (corners) drops to 0.
  const errR = Math.min(1, cvR / 0.16);
  const radialFactor = Math.max(0, 1 - errR * errR);

  // 3. Aspect Ratio
  let minX = Infinity;
  maxX = -Infinity;
  let minY = Infinity;
  maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const w = maxX - minX;
  const h = maxY - minY;
  const aspect = w > 0 && h > 0 ? Math.min(w, h) / Math.max(w, h) : 0;

  // Quadratic aspect curve:
  // 0.90+ docks < 3%. Below 0.65 docks heavily.
  const errAspect = Math.min(1, (1 - aspect) / 0.4);
  const aspectFactor = Math.max(0, 1 - errAspect * errAspect);

  // Balanced Score calculation
  let finalScore = Q * radialFactor * aspectFactor * 100;
  finalScore = Math.max(0, Math.min(100, finalScore));

  const { title, feedback } = getFeedback(finalScore);

  return {
    score: finalScore,
    aspect,
    cvR,
    iso: Q,
    title,
    feedback,
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
