import { describe, it, expect } from 'vitest';
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
