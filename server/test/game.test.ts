import { describe, expect, it } from 'vitest';
import app from '../src/index';
import { createTestD1, insertTestGame } from './d1-sqlite';

describe('GET /game/:id (SSR Game Share Page)', () => {
  it('returns 404 when game is not found', async () => {
    const { d1 } = createTestD1();
    const res = await app.request('/game/non-existent-id', { method: 'GET' }, { DB: d1 });
    expect(res.status).toBe(404);
  });

  it('calculates 100.0% percentile when only one game exists in database', async () => {
    const { db, d1 } = createTestD1();
    const game = insertTestGame(db, { player_name: 'SoloPlayer', score: 85.5 });

    const res = await app.request(`/game/${game.id}`, { method: 'GET' }, { DB: d1 });
    expect(res.status).toBe(200);

    const html = await res.text();
    expect(html).toContain('SoloPlayer');
    expect(html).toContain('85.5%');
    expect(html).toContain('beats 100.0% of all games');
  });

  it('calculates correct rank and percentile across multiple games', async () => {
    const { db, d1 } = createTestD1();
    const topGame = insertTestGame(db, { player_name: 'TopPlayer', score: 98.0 });
    const midGame = insertTestGame(db, { player_name: 'MidPlayer', score: 90.0 });
    const lowGame = insertTestGame(db, { player_name: 'LowPlayer', score: 80.0 });

    // 1. Top player (rank 1 of 3 -> beats 100.0%)
    const topRes = await app.request(`/game/${topGame.id}`, { method: 'GET' }, { DB: d1 });
    expect(topRes.status).toBe(200);
    const topHtml = await topRes.text();
    expect(topHtml).toContain('TopPlayer');
    expect(topHtml).toContain('beats 100.0% of all games');

    // 2. Mid player (rank 2 of 3 -> beats 50.0%)
    const midRes = await app.request(`/game/${midGame.id}`, { method: 'GET' }, { DB: d1 });
    expect(midRes.status).toBe(200);
    const midHtml = await midRes.text();
    expect(midHtml).toContain('MidPlayer');
    expect(midHtml).toContain('beats 50.0% of all games');

    // 3. Low player (rank 3 of 3 -> beats 0.0%)
    const lowRes = await app.request(`/game/${lowGame.id}`, { method: 'GET' }, { DB: d1 });
    expect(lowRes.status).toBe(200);
    const lowHtml = await lowRes.text();
    expect(lowHtml).toContain('LowPlayer');
    expect(lowHtml).toContain('beats 0.0% of all games');
  });

  it('renders SVG path and share button', async () => {
    const { db, d1 } = createTestD1();
    const game = insertTestGame(db, { player_name: 'DrawingPlayer', score: 92.4 });

    const res = await app.request(`/game/${game.id}`, { method: 'GET' }, { DB: d1 });
    expect(res.status).toBe(200);

    const html = await res.text();
    expect(html).toContain('<svg');
    expect(html).toContain('id="share-btn"');
    expect(html).toContain('/dist/gameshare.js');
  });
});

describe('POST /api/v1/game (Submission API)', () => {
  function generateCirclePoints(clockwise = true) {
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i <= 36; i++) {
      const theta = (clockwise ? 1 : -1) * (i / 36) * 2 * Math.PI;
      points.push({
        x: Math.round(150 + 60 * Math.cos(theta)),
        y: Math.round(150 + 60 * Math.sin(theta)),
      });
    }
    return points;
  }

  it('records clockwise stroke and mobile device for touch screen under 768px', async () => {
    const { db, d1 } = createTestD1();
    const points = generateCirclePoints(true);

    const res = await app.request(
      '/api/v1/game',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'MobilePlayer',
          points,
          screenWidth: 390,
          isTouch: true,
        }),
      },
      { DB: d1 }
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      gameid: string;
      direction: string;
      device: string;
    };
    expect(data.direction).toBe('clockwise');
    expect(data.device).toBe('mobile');

    const row = db.prepare('SELECT direction, device FROM games WHERE id = ?').get(data.gameid) as {
      direction: string;
      device: string;
    };
    expect(row.direction).toBe('clockwise');
    expect(row.device).toBe('mobile');
  });

  it('records counterclockwise stroke and desktop for non-touch device', async () => {
    const { db, d1 } = createTestD1();
    const points = generateCirclePoints(false);

    const res = await app.request(
      '/api/v1/game',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'DesktopPlayer',
          points,
          screenWidth: 600,
          isTouch: false,
        }),
      },
      { DB: d1 }
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      gameid: string;
      direction: string;
      device: string;
    };
    expect(data.direction).toBe('counterclockwise');
    expect(data.device).toBe('desktop');

    const row = db.prepare('SELECT direction, device FROM games WHERE id = ?').get(data.gameid) as {
      direction: string;
      device: string;
    };
    expect(row.direction).toBe('counterclockwise');
    expect(row.device).toBe('desktop');
  });

  it('records tablet device for touch screen between 768px and 1024px', async () => {
    const { db, d1 } = createTestD1();
    const points = generateCirclePoints(true);

    const res = await app.request(
      '/api/v1/game',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'TabletPlayer',
          points,
          screenWidth: 820,
          isTouch: true,
        }),
      },
      { DB: d1 }
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      gameid: string;
      direction: string;
      device: string;
    };
    expect(data.device).toBe('tablet');

    const row = db.prepare('SELECT direction, device FROM games WHERE id = ?').get(data.gameid) as {
      direction: string;
      device: string;
    };
    expect(row.device).toBe('tablet');
  });

  it('truncates player names longer than 32 characters', async () => {
    const { db, d1 } = createTestD1();
    const points = generateCirclePoints(true);
    const longName = 'A'.repeat(50);

    const res = await app.request(
      '/api/v1/game',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: longName,
          points,
        }),
      },
      { DB: d1 }
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as { gameid: string; name: string };
    expect(data.name).toBe('A'.repeat(32));
    expect(data.name.length).toBe(32);

    const row = db.prepare('SELECT player_name FROM games WHERE id = ?').get(data.gameid) as {
      player_name: string;
    };
    expect(row.player_name).toBe('A'.repeat(32));
  });

  it('rejects malformed payloads with 400 Bad Request', async () => {
    const { d1 } = createTestD1();

    // Invalid JSON / body
    const emptyRes = await app.request(
      '/api/v1/game',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json',
      },
      { DB: d1 }
    );
    expect(emptyRes.status).toBe(400);

    // Non-array points
    const nonArrayRes = await app.request(
      '/api/v1/game',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: 'not-an-array' }),
      },
      { DB: d1 }
    );
    expect(nonArrayRes.status).toBe(400);

    // Too few points (< 20)
    const fewPointsRes = await app.request(
      '/api/v1/game',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: [{ x: 0, y: 0 }] }),
      },
      { DB: d1 }
    );
    expect(fewPointsRes.status).toBe(400);

    // Points with non-numeric coordinates
    const invalidCoordsRes = await app.request(
      '/api/v1/game',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          points: Array(25).fill({ x: 'bad', y: null }),
        }),
      },
      { DB: d1 }
    );
    expect(invalidCoordsRes.status).toBe(400);
  });

  it('blocks cross-origin form CSRF attacks with 403 Forbidden', async () => {
    const { d1 } = createTestD1();
    const points = generateCirclePoints(true);

    const res = await app.request(
      '/api/v1/game',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          Origin: 'https://evil.com',
          'Sec-Fetch-Site': 'cross-site',
        },
        body: JSON.stringify({
          name: 'Hacker',
          points,
        }),
      },
      { DB: d1 }
    );

    expect(res.status).toBe(403);
  });

  it('rejects floating-point non-integer coordinates with 400 Bad Request', async () => {
    const { d1 } = createTestD1();
    const points = generateCirclePoints(true).map((p, idx) =>
      idx === 5 ? { x: p.x + 0.5, y: p.y } : p
    );

    const res = await app.request(
      '/api/v1/game',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'FloatCheater',
          points,
        }),
      },
      { DB: d1 }
    );

    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).toContain('Points must contain integer screen coordinates');
  });

  it('rejects mathematically uniform synthetic step spacing with 400 Bad Request', async () => {
    const { d1 } = createTestD1();
    // Points with identical step spacing (every step delta is exactly 10.00)
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i <= 36; i++) {
      points.push({
        x: i * 10,
        y: 100,
      });
    }

    const res = await app.request(
      '/api/v1/game',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'BotCheater',
          points,
        }),
      },
      { DB: d1 }
    );

    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).toContain('Inhuman uniform stroke spacing detected');
  });
});
