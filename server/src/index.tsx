import { Hono } from 'hono';
import { csrf } from 'hono/csrf';
import { HTTPException } from 'hono/http-exception';
import { requestId } from 'hono/request-id';
import { endTime, startTime, timing } from 'hono/timing';
import {
  evaluateCircle,
  getCircleStats,
  type Point,
  pointsToSvgPath,
  ReferenceCircle,
} from '../../shared/circle';
import {
  categorizeDevice,
  type GameData,
  type GameRequest,
  type RankedGameData,
} from '../../shared/game';
import { CanvasGame } from './components/CanvasGame';
import { ComparisonChart, type ComparisonItem } from './components/ComparisonChart';
import { GameCard } from './components/GameCard';
import { LeaderBoard, type Timeframe } from './components/LeaderBoard';
import { type OGMetadata, SSRShell } from './components/SSRShell';
import { StatCard, type StatCategory } from './components/StatCard';
import { openApiDoc } from './openapi';

type Bindings = {
  DB: D1Database;
  ENVIRONMENT?: string;
};

type Variables = {
  requestId: string;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use('*', requestId());
app.use('*', timing());
app.use('*', async (c, next) => {
  const start = performance.now();
  await next();
  const durationMs = Math.round(performance.now() - start);
  const reqId = c.get('requestId');
  const method = c.req.method;
  const path = c.req.path;
  const status = c.res.status;

  if (c.env?.ENVIRONMENT === 'production' || process.env.NODE_ENV === 'production') {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info',
        requestId: reqId,
        method,
        path,
        status,
        durationMs,
      })
    );
  } else if (process.env.NODE_ENV !== 'test') {
    console.log(`[${reqId}] ${method} ${path} ${status} - ${durationMs}ms`);
  }
});

app.use(csrf());

app.onError((err, c) => {
  const reqId = c.get('requestId') || 'unknown';
  const isHttpException = err instanceof HTTPException;
  const status = isHttpException ? err.status : 500;
  const message = isHttpException ? err.message : 'Internal Server Error';

  if (c.env?.ENVIRONMENT === 'production' || process.env.NODE_ENV === 'production') {
    console.error(
      JSON.stringify({
        level: 'error',
        timestamp: new Date().toISOString(),
        requestId: reqId,
        status,
        method: c.req.method,
        path: c.req.path,
        error: err.message,
        stack: err.stack,
      })
    );
  } else if (process.env.NODE_ENV !== 'test') {
    console.error(`[${reqId}] ERROR ${c.req.method} ${c.req.path} ${status} - ${err.message}`);
    if (err.stack) {
      console.error(err.stack);
    }
  }

  if (c.req.path.startsWith('/api/') || c.req.header('accept')?.includes('application/json')) {
    return c.json(
      {
        error: message,
        requestId: reqId,
      },
      status
    );
  }

  return c.html(
    <SSRShell title={`${status} - CircleDraw`} currentPath={c.req.path}>
      <main
        class="game-container"
        style="text-align: center; padding: var(--space-xl) var(--space-m);"
      >
        <h1 class="game-title">{status === 404 ? 'Page Not Found' : 'Something Went Wrong'}</h1>
        <p style="color: var(--color-text-muted); margin: var(--space-m) 0;">{message}</p>
        {reqId !== 'unknown' && (
          <p style="font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: var(--space-l);">
            Request ID: <code>{reqId}</code>
          </p>
        )}
        <a href="/" class="huddle-btn" style="text-decoration: none; display: inline-block;">
          Back to Game
        </a>
      </main>
    </SSRShell>,
    status
  );
});

app.get('/', (c) => {
  const og: OGMetadata = {
    title: 'Draw a Circle - Precision Drawing Game',
    description: 'Draw a circle as perfectly as you can and test your accuracy!',
    type: 'website',
  };

  return c.html(
    <SSRShell title={og.title} og={og} currentPath="/">
      <CanvasGame />
    </SSRShell>
  );
});

app.post('/api/v1/game', async (c) => {
  let body: GameRequest;
  try {
    body = await c.req.json<GameRequest>();
  } catch {
    throw new HTTPException(400, { message: 'Invalid JSON payload' });
  }

  if (!body || typeof body !== 'object') {
    throw new HTTPException(400, { message: 'Invalid request payload' });
  }

  let playerName = 'Anonymous';
  if (typeof body.name === 'string' && body.name.trim().length > 0) {
    playerName = body.name.trim().slice(0, 32);
  }

  if (!Array.isArray(body.points) || body.points.length < 20) {
    throw new HTTPException(400, { message: 'Valid circle path points are required' });
  }

  const hasInvalidPoints = body.points.some(
    (p) =>
      !p ||
      typeof p.x !== 'number' ||
      !Number.isFinite(p.x) ||
      typeof p.y !== 'number' ||
      !Number.isFinite(p.y)
  );
  if (hasInvalidPoints) {
    throw new HTTPException(400, { message: 'Points must contain valid numeric coordinates' });
  }

  const hasNonIntegers = body.points.some((p) => !Number.isInteger(p.x) || !Number.isInteger(p.y));
  if (hasNonIntegers) {
    throw new HTTPException(400, { message: 'Points must contain integer screen coordinates' });
  }

  let minDelta = Number.POSITIVE_INFINITY;
  let maxDelta = Number.NEGATIVE_INFINITY;
  for (let i = 1; i < body.points.length; i++) {
    const dist = Math.hypot(
      body.points[i].x - body.points[i - 1].x,
      body.points[i].y - body.points[i - 1].y
    );
    if (dist < minDelta) minDelta = dist;
    if (dist > maxDelta) maxDelta = dist;
  }

  if (maxDelta - minDelta < 0.05) {
    throw new HTTPException(400, { message: 'Inhuman uniform stroke spacing detected' });
  }

  startTime(c, 'geo', 'Circle Geometry');
  const fit = ReferenceCircle.fromPoints(body.points);
  if (!fit) {
    endTime(c, 'geo');
    throw new HTTPException(400, { message: 'Points do not form a recognizable circle' });
  }

  const stats = getCircleStats(body.points, fit);
  if (!stats) {
    endTime(c, 'geo');
    throw new HTTPException(400, { message: 'Points do not form a recognizable circle' });
  }

  const evaluation = evaluateCircle(stats);
  endTime(c, 'geo');

  const gameId = crypto.randomUUID();
  const device = categorizeDevice(body.screenWidth, body.isTouch);
  const direction = stats.direction;

  startTime(c, 'db', 'D1 Insert');
  await c.env.DB.prepare(
    `INSERT INTO games (id, player_name, paths, score, reference_cx, reference_cy, reference_radius, direction, device)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      gameId,
      playerName,
      JSON.stringify(stats.points),
      evaluation.score,
      fit.cx,
      fit.cy,
      fit.r,
      direction,
      device
    )
    .run();
  endTime(c, 'db');

  const payload = {
    gameid: gameId,
    name: playerName,
    score: evaluation.score,
    reference: fit,
    direction,
    device,
  };

  return c.json(payload);
});

app.get('/game/:id', async (c) => {
  const id = c.req.param('id');
  const query = `
  WITH ranked_games AS (
    SELECT *,
      RANK() OVER (ORDER BY score DESC) AS rank,
      COUNT(*) OVER () AS game_count
    FROM games
  )
  SELECT * FROM ranked_games WHERE id = ?
  `;
  startTime(c, 'db', 'D1 Query');
  const game = await c.env.DB.prepare(query).bind(id).first<RankedGameData>();
  endTime(c, 'db');

  if (!game) {
    throw new HTTPException(404, { message: 'Game not found' });
  }

  const percentile =
    game.game_count > 1 ? 100 * (1 - (game.rank - 1) / (game.game_count - 1)) : 100;
  const points: Point[] = JSON.parse(game.paths);
  const svgPath = pointsToSvgPath(points);
  const refCircle: ReferenceCircle = {
    cx: game.reference_cx,
    cy: game.reference_cy,
    r: game.reference_radius,
  };
  const og: OGMetadata = {
    title: `${game.player_name} scored ${game.score.toFixed(1)}%, which beats ${percentile.toFixed(1)}% of all games`,
    description: 'Check out my drawing and see if you can beat my score!',
    type: 'website',
  };

  return c.html(
    <SSRShell title={og.title} og={og} currentPath={`/game/${id}`}>
      <GameCard
        percentile={percentile}
        playerName={game.player_name}
        score={game.score}
        svgPath={svgPath}
        refCircle={refCircle}
      />
    </SSRShell>
  );
});

const timeframeQueries: Record<Timeframe, string> = {
  all: '',
  daily: "WHERE created_at >= datetime('now', '-1 day')",
  weekly: "WHERE created_at >= datetime('now', '-7 day')",
  monthly: "WHERE created_at >= datetime('now', '-30 day')",
};

app.get('/leaderboard/:timeframe?', async (c) => {
  const param = c.req.param('timeframe') as Timeframe;
  const filterQuery = (param && timeframeQueries[param]) || '';
  const query = `
  SELECT player_name, score, id, direction, device
  FROM games
  ${filterQuery}
  ORDER BY score DESC
  LIMIT 25
  `;
  startTime(c, 'db', 'D1 Query');
  const { results } = await c.env.DB.prepare(query).bind().all<GameData>();
  endTime(c, 'db');

  const og: OGMetadata = {
    title: 'Leaderboard - Top 25 Circles',
    description: 'The 25 best circle drawings',
    type: 'website',
  };

  return c.html(
    <SSRShell title={og.title} og={og} currentPath="/leaderboard">
      <LeaderBoard entries={results} timeframe={param || 'all'} />
    </SSRShell>
  );
});

export type StatsAggregateRow = {
  name: string;
  count: number;
  avg_score: number;
};

app.get('/stats', async (c) => {
  startTime(c, 'db', 'D1 Batch Query');
  const [deviceBatch, directionBatch] = await c.env.DB.batch<StatsAggregateRow>([
    c.env.DB.prepare(`
      SELECT device AS name, COUNT(*) AS count, ROUND(AVG(score), 1) AS avg_score
      FROM games
      WHERE device IS NOT NULL
      GROUP BY device
      ORDER BY count DESC
    `),
    c.env.DB.prepare(`
      SELECT direction AS name, COUNT(*) AS count, ROUND(AVG(score), 1) AS avg_score
      FROM games
      WHERE direction IS NOT NULL
      GROUP BY direction
      ORDER BY count DESC
    `),
  ]);
  endTime(c, 'db');

  const deviceRows = deviceBatch.results ?? [];
  const directionRows = directionBatch.results ?? [];

  const deviceComparisonItems: ComparisonItem[] = deviceRows.map((r) => ({
    name: r.name,
    value: r.avg_score,
    count: r.count,
  }));

  const directionComparisonItems: ComparisonItem[] = directionRows.map((r) => ({
    name: r.name,
    value: r.avg_score,
    count: r.count,
  }));

  const deviceColors: Record<string, string> = {
    desktop: '#38bdf8',
    mobile: '#34d399',
    tablet: '#f59e0b',
  };

  const directionColors: Record<string, string> = {
    clockwise: '#38bdf8',
    counterclockwise: '#f43f5e',
  };

  const deviceCategories: StatCategory[] = deviceRows.map((r) => ({
    name: r.name,
    quantity: r.count,
    color: deviceColors[r.name] ?? '#94a3b8',
  }));

  const directionCategories: StatCategory[] = directionRows.map((r) => ({
    name: r.name,
    quantity: r.count,
    color: directionColors[r.name] ?? '#94a3b8',
  }));

  const og: OGMetadata = {
    title: 'CircleDraw Statistics - Accuracy and Distribution',
    description: 'Compare accuracy scores across devices and drawing directions!',
    type: 'website',
  };

  return c.html(
    <SSRShell title={og.title} og={og} currentPath="/stats">
      <div class="stats-container">
        <h1 class="game-title">Accuracy & Distribution Stats</h1>

        <div class="stats-grid">
          <ComparisonChart category="Device Accuracy" items={deviceComparisonItems} />
          <ComparisonChart category="Stroke Direction Accuracy" items={directionComparisonItems} />
        </div>

        <div class="stats-grid">
          <StatCard title="Device Breakdown" categories={deviceCategories} />
          <StatCard title="Stroke Direction Breakdown" categories={directionCategories} />
        </div>
      </div>
    </SSRShell>
  );
});

app.get('/openapi.json', (c) => {
  return c.json(openApiDoc);
});

app.get('/docs', (c) => {
  return c.html(`<!doctype html>
<html>
  <head>
    <title>CircleDraw API Reference</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <script id="api-reference" data-url="/openapi.json" src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`);
});

export default app;
