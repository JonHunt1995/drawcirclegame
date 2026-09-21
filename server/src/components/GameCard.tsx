import type { FC } from 'hono/jsx';
import { ReferenceCircle } from '../../../shared/circle';

export type GameCardProps = {
  playerName: string;
  refCircle: ReferenceCircle;
  score: number;
  svgPath: string;
};

export const GameCard: FC<GameCardProps> = ({ playerName, score, svgPath, refCircle }) => {
  const pad = 30;
  const minX = refCircle.cx - refCircle.r - pad;
  const minY = refCircle.cy - refCircle.r - pad;
  const size = (refCircle.r + pad) * 2;
  const viewBox = `${minX} ${minY} ${size} ${size}`;

  return (
    <>
      <h1 class="game-title">
        {playerName} scored {score.toFixed(1)}%!
      </h1>
      <div class="canvas-wrapper">
        <svg viewBox={viewBox} style={{ width: '100%', height: '100%', display: 'block' }}>
          <circle
            cx={refCircle.cx}
            cy={refCircle.cy}
            r={refCircle.r}
            stroke="#38bdf8"
            stroke-width="2"
            stroke-dasharray="6, 6"
            fill="none"
          />
          <circle cx={refCircle.cx} cy={refCircle.cy} r="4" fill="#38bdf8" />
          <path
            d={svgPath}
            stroke="#f8fafc"
            stroke-width="4"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>
      <div style={{ textAlign: 'center', marginTop: 'var(--space-s)' }}>
        <a href="/" class="huddle-btn" style={{ textDecoration: 'none', display: 'inline-block' }}>
          Draw Your Own Circle
        </a>
      </div>
    </>
  );
};
