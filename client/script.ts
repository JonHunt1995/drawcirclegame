import {
  Point,
  ReferenceCircle,
  CircleEvaluation,
  fitCircle,
  calculateCumulativeAngle,
  trimStrokeTo360,
  evaluateCircle,
} from '../shared/circle';

const canvas = document.getElementById('circleCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const hud = document.getElementById('progress-hud')!;
const huddleCard = document.getElementById('huddle-card')!;
const scoreVal = document.getElementById('score-val')!;
const scoreTitle = document.getElementById('score-title')!;
const scoreFeedback = document.getElementById('score-feedback')!;
const statAspect = document.getElementById('stat-aspect')!;
const statVariance = document.getElementById('stat-variance')!;
const statIso = document.getElementById('stat-iso')!;
const retryBtn = document.getElementById('retry-btn')!;

let points: Point[] = [];
let isDrawing = false;
let hasFinished = false;
let totalPathLength = 0;
let ghostCircle: ReferenceCircle | null = null;

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

function getPoint(e: PointerEvent): Point {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
}

canvas.addEventListener('pointerdown', (e: PointerEvent) => {
  if (hasFinished) reset();
  isDrawing = true;
  canvas.setPointerCapture(e.pointerId);

  const pt = getPoint(e);
  points.push(pt);
  redraw();
});

canvas.addEventListener('pointermove', (e: PointerEvent) => {
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
  const startEndDist = Math.hypot(
    points[points.length - 1].x - points[0].x,
    points[points.length - 1].y - points[0].y
  );

  // Accept if >= 330° OR if endpoints met close together
  const isCompleteEnough = degrees >= 330 || (degrees >= 280 && startEndDist < fit.r * 0.35);

  if (!isCompleteEnough) {
    hud.textContent = `Incomplete circle at (${Math.round(degrees)}°). Try again!`;
    return;
  }

  // Trim excess tail if drawn >= 360°
  if (totalAngle >= 2 * Math.PI) {
    const { trimmed } = trimStrokeTo360(points, fit.cx, fit.cy);
    points = trimmed;
  }

  ghostCircle = fitCircle(points) || fit;
  hasFinished = true;
  hud.textContent = 'Circle Completed';

  const evaluation = evaluateCircle(points, ghostCircle);
  displayHuddleCard(evaluation);
  redraw();
});

function displayHuddleCard(evalResult: CircleEvaluation) {
  scoreVal.textContent = evalResult.score.toFixed(1);
  statAspect.textContent = evalResult.aspect.toFixed(2);
  statVariance.textContent = `${(evalResult.cvR * 100).toFixed(1)}%`;
  statIso.textContent = evalResult.iso.toFixed(2);
  scoreTitle.textContent = evalResult.title;
  scoreFeedback.textContent = evalResult.feedback;

  huddleCard.classList.remove('hidden');
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
