import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import {
  Point,
  ReferenceCircle,
  getCircleStatsFromPoints,
  evaluateCircle,
  pointsToSvgPath,
} from '../../shared/circle';
import { OGMetadata, SSRShell } from './components/SSRShell';
import { GameCard } from './components/GameCard';
import type { GameData } from '../../shared/game';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

type gameRequest = {
  name?: string;
  points: Point[];
};

app.post('/api/v1/game', async (c) => {
  const body = await c.req.json<gameRequest>();
  let playerName = 'Anonymous';
  if (body.name && body.name.trim().length > 0) {
    playerName = body.name.trim();
  }

  if (!body.points || body.points.length < 20) {
    throw new HTTPException(400, { message: 'Valid circle path points are required' });
  }

  const fit = ReferenceCircle.fromPoints(body.points);
  if (!fit) {
    throw new HTTPException(400, { message: 'Points do not form a recognizable circle' });
  }

  const stats = getCircleStatsFromPoints(body.points, fit);
  if (!stats) {
    throw new HTTPException(400, { message: 'Points do not form a recognizable circle' });
  }

  const evaluation = evaluateCircle(stats);
  const gameId = crypto.randomUUID();

  await c.env.DB.prepare(
    `INSERT INTO games (id, player_name, paths, score, reference_cx, reference_cy, reference_radius)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(gameId, playerName, JSON.stringify(stats.points), evaluation.score, fit.cx, fit.cy, fit.r)
    .run();

  const payload = {
    gameid: gameId,
    name: playerName,
    score: evaluation.score,
    reference: fit,
  };

  return c.json(payload);
});

app.get('/game/:id', async (c) => {
  const id = c.req.param('id');
  const game = await c.env.DB.prepare('SELECT * FROM games WHERE id = ?')
    .bind(id)
    .first<GameData>();

  if (!game) {
    throw new HTTPException(404, { message: 'Game not found' });
  }

  const points: Point[] = JSON.parse(game.paths);
  const svgPath = pointsToSvgPath(points);
  const refCircle: ReferenceCircle = {
    cx: game.reference_cx,
    cy: game.reference_cy,
    r: game.reference_radius,
  };
  const og: OGMetadata = {
    title: `${game.player_name} scored ${game.score.toFixed(1)}%`,
    description: 'Check out my drawing and see if you can beat my score!',
    type: 'website',
  };

  return c.html(
    <SSRShell title={og.title} og={og}>
      <GameCard
        playerName={game.player_name}
        score={game.score}
        svgPath={svgPath}
        refCircle={refCircle}
      />
    </SSRShell>
  );
});
export default app;
