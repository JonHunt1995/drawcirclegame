import {
  type CircleEvaluation,
  evaluateCircle,
  getCircleStats,
  type Point,
  ReferenceCircle,
} from '../shared/circle';
import type { GameRequest } from '../shared/game';
import { shareOrCopy } from './share';

const canvas = document.getElementById('circleCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const hud = document.getElementById('progress-hud')!;
const hudText = 'Draw a continuous circle';
const huddleCard = document.getElementById('huddle-card')!;
const scoreVal = document.getElementById('score-val')!;
const statAspect = document.getElementById('stat-aspect')!;
const statVariance = document.getElementById('stat-variance')!;
const statIso = document.getElementById('stat-iso')!;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement;
const playerNameInput = document.getElementById('player-name-input') as HTMLInputElement | null;
const preSubmitActions = document.getElementById('huddle-pre-submit');
const postSubmitActions = document.getElementById('huddle-post-submit');
const shareBtn = document.getElementById('share-btn') as HTMLButtonElement | null;
const viewGameLink = document.getElementById('view-game-link') as HTMLAnchorElement | null;
const drawAgainBtn = document.getElementById('draw-again-btn') as HTMLButtonElement | null;

let currentPlayerName = 'Anonymous';
let points: Point[] = [];
let ghostCircle: ReferenceCircle | null = null;
let lastScore = 0;
let submittedGameId: string | null = null;

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

function reset(hint: string = hudText) {
  points = [];
  ghostCircle = null;
  submittedGameId = null;
  hud.textContent = hint;
  huddleCard.classList.add('hidden');
  preSubmitActions?.classList.remove('hidden');
  postSubmitActions?.classList.add('hidden');
  submitBtn.disabled = false;
  submitBtn.textContent = 'Submit';
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (hint === hudText) return;

  setTimeout(() => {
    hud.textContent = hudText;
  }, 1500);
}

function getPoint(e: PointerEvent): Point {
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.round(e.clientX - rect.left),
    y: Math.round(e.clientY - rect.top),
  };
}

canvas.addEventListener('pointerdown', (e: PointerEvent) => {
  if (ghostCircle) reset();

  canvas.setPointerCapture(e.pointerId);

  const pt = getPoint(e);
  points.push(pt);
  redraw();
});

canvas.addEventListener('pointermove', (e: PointerEvent) => {
  if (!e.buttons || ghostCircle) return;

  const pt = getPoint(e);
  points.push(pt);
  redraw();

  if (points.length >= 20) {
    const fit = ReferenceCircle.fromPoints(points);
    if (fit && fit.r < 2500 && fit.r > 15) {
      const stats = getCircleStats(points, fit);
      if (stats) {
        const deg = Math.floor((Math.abs(stats.angle) / (2 * Math.PI)) * 360);
        hud.textContent = `${deg}° drawn (Release when ready)`;
      }
    }
  }
});

canvas.addEventListener('pointerup', () => {
  if (ghostCircle) return;

  if (points.length <= 3) {
    reset(hudText);
    return;
  }

  if (points.length < 20) {
    reset('Too small! Draw a full circle');
    return;
  }

  const fit = ReferenceCircle.fromPoints(points);
  if (!fit || fit.r > 3000 || fit.r < 15) {
    reset('Not a recognized loop. Try again');
    return;
  }

  const stats = getCircleStats(points, fit);
  if (!stats) {
    reset('Not a recognized loop. Try again');
    return;
  }

  const degrees = (Math.abs(stats.angle) / (2 * Math.PI)) * 360;
  const startEndDist = Math.hypot(
    points[points.length - 1].x - points[0].x,
    points[points.length - 1].y - points[0].y
  );

  // Accept if >= 330° OR if endpoints met close together
  if (!(degrees >= 330 || (degrees >= 280 && startEndDist < fit.r * 0.35))) {
    reset(`Incomplete circle at (${Math.round(degrees)}°). Try again!`);
    return;
  }

  points = stats.points;
  ghostCircle = fit;
  hud.textContent = 'Circle Completed';

  const evaluation = evaluateCircle(stats);
  displayHuddleCard(evaluation);
  redraw();
});

function displayHuddleCard(evalResult: CircleEvaluation) {
  lastScore = evalResult.score;
  scoreVal.textContent = evalResult.score.toFixed(1);
  statAspect.textContent = evalResult.aspect.toFixed(2);
  statVariance.textContent = `${(evalResult.cvR * 100).toFixed(1)}%`;
  statIso.textContent = evalResult.iso.toFixed(2);

  if (playerNameInput) {
    playerNameInput.value = currentPlayerName !== 'Anonymous' ? currentPlayerName : '';
  }

  preSubmitActions?.classList.remove('hidden');
  postSubmitActions?.classList.add('hidden');
  submitBtn.disabled = false;
  submitBtn.textContent = 'Submit';

  huddleCard.classList.remove('hidden');
}

if (playerNameInput) {
  playerNameInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitBtn.click();
    }
  });

  playerNameInput.addEventListener('input', () => {
    const val = playerNameInput.value.trim().slice(0, 32);
    currentPlayerName = val || 'Anonymous';
  });
}

function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Ghost comparison circle
  if (ghostCircle) {
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
  ctx.strokeStyle = ghostCircle ? '#f8fafc' : '#ffffff';
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

submitBtn.addEventListener('click', async () => {
  if (points.length === 0) return;
  const inputVal = playerNameInput ? playerNameInput.value.trim().slice(0, 32) : '';
  const playerName =
    inputVal || (currentPlayerName !== 'Anonymous' ? currentPlayerName : '') || 'Anonymous';
  currentPlayerName = playerName;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';
  hud.textContent = 'Submitting score...';
  try {
    const payload: GameRequest = {
      name: playerName,
      points,
      screenWidth: window.innerWidth,
      isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    };
    const res = await fetch('/api/v1/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Submission failed');
    const data = (await res.json()) as { gameid: string };
    submittedGameId = data.gameid;

    hud.textContent = 'Score saved! Ready to share';
    if (viewGameLink) {
      viewGameLink.href = `/game/${data.gameid}`;
    }
    preSubmitActions?.classList.add('hidden');
    postSubmitActions?.classList.remove('hidden');
  } catch {
    hud.textContent = 'Submission failed. Please try again';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit';
  }
});

resetBtn.addEventListener('click', () => reset());

if (shareBtn) {
  shareBtn.addEventListener('click', async () => {
    if (!submittedGameId) return;
    const shareUrl = `${window.location.origin}/game/${submittedGameId}`;
    await shareOrCopy(
      {
        title: 'Circle Drawing Game',
        text: `I drew a circle with ${lastScore.toFixed(1)}% accuracy! Can you beat my score?`,
        url: shareUrl,
      },
      shareBtn
    );
  });
}

if (drawAgainBtn) {
  drawAgainBtn.addEventListener('click', () => reset());
}
