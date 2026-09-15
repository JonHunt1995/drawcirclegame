
const canvas = document.getElementById('circleCanvas');
const ctx = canvas.getContext('2d');

const hud = document.getElementById('progress-hud');
const huddleCard = document.getElementById('huddle-card');
const scoreVal = document.getElementById('score-val');
const scoreTitle = document.getElementById('score-title');
const scoreFeedback = document.getElementById('score-feedback');
const statAspect = document.getElementById('stat-aspect');
const statVariance = document.getElementById('stat-variance');
const statIso = document.getElementById('stat-iso');
const retryBtn = document.getElementById('retry-btn');

let points = [];
let isDrawing = false;
let hasFinished = false;
let totalPathLength = 0;
let ghostCircle = null;

function setupCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
}

window.addEventListener('resize', () => {
  setupCanvas();
  redraw();
});
setupCanvas();

function reset() {
  points = [];
  isDrawing = false;
  hasFinished = false;
  totalPathLength = 0;
  ghostCircle = null;
  hud.textContent = 'Draw a continuous circle';
  huddleCard.classList.add('hidden');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function getPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

canvas.addEventListener('pointerdown', (e) => {
  if (hasFinished) reset();
  isDrawing = true;
  canvas.setPointerCapture(e.pointerId);

  const pt = getPoint(e);
  points.push(pt);
  redraw();
});

canvas.addEventListener('pointermove', (e) => {
  if (!isDrawing || hasFinished) return;

  const pt = getPoint(e);
  const prevPt = points[points.length - 1];

  const stepDist = Math.hypot(pt.x - prevPt.x, pt.y - prevPt.y);
  if (stepDist < 3) return;

  points.push(pt);
  totalPathLength += stepDist;
  redraw();

  if (points.length >= 20 && totalPathLength >= 100) {
    const fit = fitCircle(points);
    if (fit && fit.r < 2500 && fit.r > 15) {
      const angle = Math.abs(calculateCumulativeAngle(points, fit.cx, fit.cy));
      const deg = Math.floor((angle / (2 * Math.PI)) * 360);
      hud.textContent = `${deg}° drawn (Release when ready)`;
    }
  }
});

canvas.addEventListener('pointerup', () => {
  if (!isDrawing || hasFinished) return;
  isDrawing = false;

  if (points.length < 20 || totalPathLength < 100) {
    hud.textContent = 'Too small! Draw a full circle';
    return;
  }

  const fit = fitCircle(points);
  if (!fit || fit.r > 3000 || fit.r < 15) {
    hud.textContent = 'Not a recognized loop. Try again';
    return;
  }

  const totalAngle = Math.abs(calculateCumulativeAngle(points, fit.cx, fit.cy));
  const degrees = (totalAngle / (2 * Math.PI)) * 360;
  const startEndDist = Math.hypot(points[points.length - 1].x - points[0].x, points[points.length - 1].y - points[0].y);

  // Accept if >= 330° OR if endpoints met close together
  const isCompleteEnough = degrees >= 330 || (degrees >= 280 && startEndDist < fit.r * 0.35);

  if (!isCompleteEnough) {
    hud.textContent = `Incomplete (${Math.round(degrees)}°). Close the circle!`;
    return;
  }

  // Trim excess tail if drawn >= 360°
  if (totalAngle >= 2 * Math.PI) {
    const { trimmed } = trimStrokeTo360(points, fit.cx, fit.cy);
    points = trimmed;
  }

  // Close loop
  points.push({ x: points[0].x, y: points[0].y });

  ghostCircle = fitCircle(points) || fit;
  hasFinished = true;
  hud.textContent = 'Circle Completed';

  evaluateCircle(points, ghostCircle);
  redraw();
});

function trimStrokeTo360(pts, cx, cy) {
  let total = 0;
  let prevAngle = Math.atan2(pts[0].y - cy, pts[0].x - cx);
  const trimmed = [pts[0]];

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

function calculateCumulativeAngle(pts, cx, cy) {
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

// Tuned Fair-Grading Function
function evaluateCircle(pts, fit) {
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
  const radii = pts.map(p => {
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
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const w = maxX - minX;
  const h = maxY - minY;
  const aspect = (w > 0 && h > 0) ? Math.min(w, h) / Math.max(w, h) : 0;

  // Quadratic aspect curve:
  // 0.90+ docks < 3%. Below 0.65 docks heavily.
  const errAspect = Math.min(1, (1 - aspect) / 0.40);
  const aspectFactor = Math.max(0, 1 - errAspect * errAspect);

  // Balanced Score calculation
  let finalScore = Q * radialFactor * aspectFactor * 100;
  finalScore = Math.max(0, Math.min(100, finalScore));

  displayHuddleCard(finalScore, aspect, cvR, Q);
}

function displayHuddleCard(score, aspect, cvR, iso) {
  scoreVal.textContent = score.toFixed(1);
  statAspect.textContent = aspect.toFixed(2);
  statVariance.textContent = `${(cvR * 100).toFixed(1)}%`;
  statIso.textContent = iso.toFixed(2);

  if (score >= 90) {
    scoreTitle.textContent = "Nearly Flawless!";
    scoreFeedback.textContent = "Outstanding symmetry and flow";
  } else if (score >= 80) {
    scoreTitle.textContent = "Great Circle!";
    scoreFeedback.textContent = "Very round and smooth";
  } else if (score >= 65) {
    scoreTitle.textContent = "Good Attempt";
    scoreFeedback.textContent = "A few wobbles along the rim";
  } else if (score >= 40) {
    scoreTitle.textContent = "Distorted";
    scoreFeedback.textContent = "Uneven radius or oval shape";
  } else {
    scoreTitle.textContent = "Not a Circle";
    scoreFeedback.textContent = "Sharp corners or flat edges";
  }

  huddleCard.classList.remove('hidden');
}

function fitCircle(pts) {
  const n = pts.length;
  if (n < 3) return null;

  let sumX = 0, sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += pts[i].x;
    sumY += pts[i].y;
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let Suu = 0, Svv = 0, Suv = 0;
  let Suuu = 0, Svvv = 0, Suvv = 0, Svuu = 0;

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

  const uc = 0.5 * ((Suuu + Suvv) * Svv - (Svvv + Svuu) * Suv) / det;
  const vc = 0.5 * ((Svvv + Svuu) * Suu - (Suuu + Suvv) * Suv) / det;

  return {
    cx: uc + meanX,
    cy: vc + meanY,
    r: Math.sqrt(uc * uc + vc * vc + (Suu + Svv) / n)
  };
}

function calculateShoelaceArea(pts) {
  let area = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    area += pts[i].x * pts[i + 1].y - pts[i + 1].x * pts[i].y;
  }
  return Math.abs(area) / 2;
}

function calculatePerimeter(pts) {
  let len = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    len += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
  }
  return len;
}

function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Ghost comparison circle
  if (hasFinished && ghostCircle) {
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(ghostCircle.cx, ghostCircle.cy, ghostCircle.r, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(ghostCircle.cx, ghostCircle.cy, 4, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
  }

  // 2. User's stroke
  if (points.length < 2) return;

  ctx.save();
  ctx.strokeStyle = hasFinished ? '#f8fafc' : '#ffffff';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
  ctx.restore();
}

retryBtn.addEventListener('click', reset);