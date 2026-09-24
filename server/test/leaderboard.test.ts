import { describe, it, expect } from 'vitest';
import app from '../src/index';
import { createTestD1, insertTestGame } from './d1-sqlite';

describe('GET /leaderboard (SSR HTML)', () => {
  it('renders 200 HTML with empty state when no games have been drawn', async () => {
    const { d1 } = createTestD1();

    const res = await app.request('/leaderboard', { method: 'GET' }, { DB: d1 });

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');

    const html = await res.text();
    expect(html).toContain('No circles drawn yet');
    expect(html).toContain('href="/"');
  });

  it('renders games in descending score order using real SQLite ordering', async () => {
    const { db, d1 } = createTestD1();

    // Insert games in arbitrary order
    const alice = insertTestGame(db, { player_name: 'Alice', score: 82.5 });
    const bob = insertTestGame(db, { player_name: 'Bob', score: 99.1 });
    const charlie = insertTestGame(db, { player_name: 'Charlie', score: 91.0 });

    const res = await app.request('/leaderboard', { method: 'GET' }, { DB: d1 });

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');

    const html = await res.text();

    // Verify Bob (99.1%) comes before Charlie (91.0%), and Charlie before Alice (82.5%)
    const bobIndex = html.indexOf('Bob');
    const charlieIndex = html.indexOf('Charlie');
    const aliceIndex = html.indexOf('Alice');

    expect(bobIndex).toBeGreaterThan(-1);
    expect(charlieIndex).toBeGreaterThan(-1);
    expect(aliceIndex).toBeGreaterThan(-1);

    expect(bobIndex).toBeLessThan(charlieIndex);
    expect(charlieIndex).toBeLessThan(aliceIndex);

    // Verify score formatting and replay links
    expect(html).toContain('99.1%');
    expect(html).toContain('91.0%');
    expect(html).toContain('82.5%');
    expect(html).toContain(`/game/${bob.id}`);
  });

  it('limits results to the top 25 scores', async () => {
    const { db, d1 } = createTestD1();

    // Insert 30 games with distinct scores
    for (let i = 1; i <= 30; i++) {
      insertTestGame(db, { player_name: `Player_${i}`, score: i * 3.0 });
    }

    const res = await app.request('/leaderboard', { method: 'GET' }, { DB: d1 });

    expect(res.status).toBe(200);
    const html = await res.text();

    // Top player (score 90) must appear
    expect(html).toContain('Player_30');
    // 25th player (score 18, rank 25) must appear
    expect(html).toContain('Player_6');
    // 26th-30th players (lower scores) should NOT appear
    expect(html).not.toContain('<td>Player_5</td>');
    expect(html).not.toContain('<td>Player_1</td>');
  });
});
