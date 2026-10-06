import { describe, expect, it, vi } from 'vitest';
import app from '../src/index';
import { createTestD1, insertTestGame } from './d1-sqlite';

function generateCirclePoints() {
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i <= 36; i++) {
    const theta = (i / 36) * 2 * Math.PI;
    points.push({
      x: Math.round(150 + 60 * Math.cos(theta)),
      y: Math.round(150 + 60 * Math.sin(theta)),
    });
  }
  return points;
}

describe('Observability: Request Correlation IDs (X-Request-Id)', () => {
  it('generates a new UUID X-Request-Id header when none is provided', async () => {
    const { d1 } = createTestD1();
    const res = await app.request('/', { method: 'GET' }, { DB: d1 });

    expect(res.status).toBe(200);
    const requestId = res.headers.get('x-request-id');
    expect(requestId).toBeTruthy();
    // UUID v4 format regex
    expect(requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('preserves an incoming X-Request-Id correlation ID', async () => {
    const { d1 } = createTestD1();
    const customId = 'client-trace-abc-123';
    const res = await app.request(
      '/leaderboard',
      {
        method: 'GET',
        headers: { 'X-Request-Id': customId },
      },
      { DB: d1 }
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('x-request-id')).toBe(customId);
  });
});

describe('Observability: Server-Timing Headers', () => {
  it('includes Server-Timing on /api/v1/game with geo and db metrics', async () => {
    const { d1 } = createTestD1();
    const points = generateCirclePoints();

    const res = await app.request(
      '/api/v1/game',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'TimingPlayer',
          points,
          screenWidth: 1024,
          isTouch: false,
        }),
      },
      { DB: d1 }
    );

    expect(res.status).toBe(200);
    const timing = res.headers.get('server-timing');
    expect(timing).toBeTruthy();
    expect(timing).toContain('geo;dur=');
    expect(timing).toContain('db;dur=');
    expect(timing).toContain('total;dur=');
  });

  it('includes Server-Timing with db metric on /leaderboard', async () => {
    const { d1 } = createTestD1();
    const res = await app.request('/leaderboard', { method: 'GET' }, { DB: d1 });

    expect(res.status).toBe(200);
    const timing = res.headers.get('server-timing');
    expect(timing).toBeTruthy();
    expect(timing).toContain('db;dur=');
    expect(timing).toContain('total;dur=');
  });

  it('includes Server-Timing with db metric on /stats', async () => {
    const { d1 } = createTestD1();
    const res = await app.request('/stats', { method: 'GET' }, { DB: d1 });

    expect(res.status).toBe(200);
    const timing = res.headers.get('server-timing');
    expect(timing).toBeTruthy();
    expect(timing).toContain('db;dur=');
    expect(timing).toContain('total;dur=');
  });

  it('includes Server-Timing with db metric on /game/:id', async () => {
    const { db, d1 } = createTestD1();
    const game = insertTestGame(db, { player_name: 'TimingGame', score: 90 });

    const res = await app.request(`/game/${game.id}`, { method: 'GET' }, { DB: d1 });

    expect(res.status).toBe(200);
    const timing = res.headers.get('server-timing');
    expect(timing).toBeTruthy();
    expect(timing).toContain('db;dur=');
  });
});

describe('Observability: Centralized Error Handling (app.onError)', () => {
  it('formats HTTPExceptions on API routes as JSON with requestId and error message', async () => {
    const { d1 } = createTestD1();
    const res = await app.request(
      '/api/v1/game',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json',
      },
      { DB: d1 }
    );

    expect(res.status).toBe(400);
    expect(res.headers.get('content-type')).toContain('application/json');
    const data = (await res.json()) as { error: string; requestId: string };
    expect(data.error).toBe('Invalid JSON payload');
    expect(data.requestId).toBeTruthy();
    expect(data.requestId).toBe(res.headers.get('x-request-id'));
  });

  it('renders clean HTML error page for non-API 404 routes with requestId', async () => {
    const { d1 } = createTestD1();
    const customId = 'missing-game-trace';
    const res = await app.request(
      '/game/non-existent-id',
      {
        method: 'GET',
        headers: { 'X-Request-Id': customId },
      },
      { DB: d1 }
    );

    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toContain('text/html');
    const html = await res.text();
    expect(html).toContain('Page Not Found');
    expect(html).toContain('Game not found');
    expect(html).toContain(customId);
    expect(html).toContain('Back to Game');
  });

  it('catches unhandled database errors and logs structured error without leaking internals to API client', async () => {
    const brokenD1 = {
      prepare() {
        throw new Error('D1 internal connection failure');
      },
      batch() {
        throw new Error('D1 batch failure');
      },
    } as unknown as D1Database;

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const points = generateCirclePoints();

    const res = await app.request(
      '/api/v1/game',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'CrashPlayer',
          points,
        }),
      },
      { DB: brokenD1 }
    );

    expect(res.status).toBe(500);
    const data = (await res.json()) as { error: string; requestId: string };
    expect(data.error).toBe('Internal Server Error');
    expect(data.requestId).toBeTruthy();

    errorSpy.mockRestore();
  });
});

describe('Observability: Request Logger', () => {
  it('logs structured JSON in production environment', async () => {
    const { d1 } = createTestD1();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await app.request('/', { method: 'GET' }, { DB: d1, ENVIRONMENT: 'production' });

    expect(logSpy).toHaveBeenCalled();
    const logOutput = logSpy.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('"path":"/"')
    );
    expect(logOutput).toBeDefined();

    const parsed = JSON.parse(logOutput![0]);
    expect(parsed.method).toBe('GET');
    expect(parsed.path).toBe('/');
    expect(parsed.status).toBe(200);
    expect(parsed.level).toBe('info');
    expect(typeof parsed.durationMs).toBe('number');
    expect(parsed.requestId).toBeTruthy();

    logSpy.mockRestore();
  });
});
