import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
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

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

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
  const body = await c.req.json<GameRequest>();
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

  const stats = getCircleStats(body.points, fit);
  if (!stats) {
    throw new HTTPException(400, { message: 'Points do not form a recognizable circle' });
  }

  const evaluation = evaluateCircle(stats);
  const gameId = crypto.randomUUID();
  const device = categorizeDevice(body.screenWidth, body.isTouch);
  const direction = stats.direction;

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
  const game = await c.env.DB.prepare(query).bind(id).first<RankedGameData>();

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
  const { results } = await c.env.DB.prepare(query).bind().all<GameData>();

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

export type StatsResponse = {
  device: StatsAggregateRow[];
  direction: StatsAggregateRow[];
};

app.get('/api/v1/stats', async (c) => {
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

  return c.json({
    device: deviceBatch.results ?? [],
    direction: directionBatch.results ?? [],
  });
});

app.get('/stats', async (c) => {
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

export default app;
