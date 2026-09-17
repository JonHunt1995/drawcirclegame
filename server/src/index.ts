import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import {
  Point,
  ReferenceCircle,
  fitCircle,
  evaluateCircle,
  pointsToSvgPath,
} from '../../shared/circle';
import { gameTemplate } from './template';

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

type gameRequest = {
  name?: string;
  points: Point[];
};

type gameData = {
  gameid: string;
  name: string;
  score: number;
  reference: ReferenceCircle;
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

  const fit = fitCircle(body.points);
  if (!fit) {
    throw new HTTPException(400, { message: 'Points do not form a recognizable circle' });
  }

  const evaluation = evaluateCircle(body.points, fit);
  const gameId = crypto.randomUUID();

  await c.env.DB.prepare(
    `INSERT INTO games (id, player_name, paths, score, reference_cx, reference_cy, reference_radius)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(gameId, playerName, JSON.stringify(body.points), evaluation.score, fit.cx, fit.cy, fit.r)
    .run();

  const payload: gameData = {
    gameid: gameId,
    name: playerName,
    score: evaluation.score,
    reference: fit,
  };

  return c.json(payload);
});

app.get('/game/:id', async (c) => {
  const id = c.req.param('id');
  const game = await c.env.DB.prepare('SELECT * FROM games WHERE id = ?').bind(id).first<{
    id: string;
    player_name: string;
    paths: string;
    score: number;
    reference_cx: number;
    reference_cy: number;
    reference_radius: number;
    created_at: string;
  }>();

  if (!game) {
    throw new HTTPException(404, { message: 'Game not found' });
  }

  const points: Point[] = JSON.parse(game.paths);
  const svgPath = pointsToSvgPath(points);

  return c.html(
    gameTemplate({
      playerName: game.player_name,
      score: game.score,
      svgPath,
    })
  );
});

export default app;
