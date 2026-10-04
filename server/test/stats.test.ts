import { describe, expect, it } from 'vitest';
import { ComparisonChart, type ComparisonItem } from '../src/components/ComparisonChart';
import app, { type StatsResponse } from '../src/index';
import { createTestD1, insertTestGame } from './d1-sqlite';

describe('ComparisonChart component', () => {
  it('renders contender blocks and highlights the highest scoring leader', () => {
    const items: ComparisonItem[] = [
      { name: 'desktop', value: 72.4, count: 50 },
      { name: 'mobile', value: 83.2, count: 40 },
      { name: 'tablet', value: 91.0, count: 10 },
    ];

    const element = ComparisonChart({ category: 'Device Accuracy', items });
    const html = String(element);

    expect(html).toContain('Device Accuracy');
    expect(html).toContain('class="comparison-chart-wrapper"');

    // Desktop
    expect(html).toContain('desktop');
    expect(html).toContain('72.4%');
    expect(html).toContain('50 games');

    // Mobile
    expect(html).toContain('mobile');
    expect(html).toContain('83.2%');
    expect(html).toContain('40 games');

    // Tablet (Winner)
    expect(html).toContain('tablet');
    expect(html).toContain('91.0%');
    expect(html).toContain('10 games');
    expect(html).toContain('display-block--winner');
    expect(html).toContain('Leader');
  });

  it('handles ties by highlighting all top performers', () => {
    const items: ComparisonItem[] = [
      { name: 'clockwise', value: 88.5, count: 20 },
      { name: 'counterclockwise', value: 88.5, count: 20 },
    ];

    const element = ComparisonChart({ category: 'Stroke Direction Accuracy', items });
    const html = String(element);

    const winnerCount = (html.match(/display-block--winner/g) || []).length;
    expect(winnerCount).toBe(2);
  });

  it('renders empty state when items are empty or all values are 0', () => {
    const emptyItems = ComparisonChart({ category: 'Empty Category', items: [] });
    expect(String(emptyItems)).toContain('No comparison data available yet');

    const zeroItems = ComparisonChart({
      category: 'Zero Category',
      items: [{ name: 'mobile', value: 0 }],
    });
    expect(String(zeroItems)).toContain('No comparison data available yet');
  });
});

describe('GET /api/v1/stats', () => {
  it('returns empty arrays when no games exist', async () => {
    const { d1 } = createTestD1();

    const res = await app.request('/api/v1/stats', { method: 'GET' }, { DB: d1 });
    expect(res.status).toBe(200);

    const json = (await res.json()) as { device: unknown[]; direction: unknown[] };
    expect(json.device).toEqual([]);
    expect(json.direction).toEqual([]);
  });

  it('aggregates device and direction volume and average score', async () => {
    const { db, d1 } = createTestD1();

    insertTestGame(db, { player_name: 'P1', score: 90, device: 'desktop', direction: 'clockwise' });
    insertTestGame(db, { player_name: 'P2', score: 80, device: 'desktop', direction: 'clockwise' });
    insertTestGame(db, {
      player_name: 'P3',
      score: 70,
      device: 'mobile',
      direction: 'counterclockwise',
    });

    const res = await app.request('/api/v1/stats', { method: 'GET' }, { DB: d1 });
    expect(res.status).toBe(200);

    const json = (await res.json()) as StatsResponse;

    // Desktop: count 2, avg 85.0
    const desktop = json.device.find((d) => d.name === 'desktop');
    expect(desktop).toBeDefined();
    expect(desktop?.count).toBe(2);
    expect(desktop?.avg_score).toBe(85.0);

    // Mobile: count 1, avg 70.0
    const mobile = json.device.find((d) => d.name === 'mobile');
    expect(mobile).toBeDefined();
    expect(mobile?.count).toBe(1);
    expect(mobile?.avg_score).toBe(70.0);

    // Clockwise: count 2, avg 85.0
    const clockwise = json.direction.find((d) => d.name === 'clockwise');
    expect(clockwise).toBeDefined();
    expect(clockwise?.count).toBe(2);
    expect(clockwise?.avg_score).toBe(85.0);

    // Counterclockwise: count 1, avg 70.0
    const counterclockwise = json.direction.find((d) => d.name === 'counterclockwise');
    expect(counterclockwise).toBeDefined();
    expect(counterclockwise?.count).toBe(1);
    expect(counterclockwise?.avg_score).toBe(70.0);
  });
});

describe('GET /stats (SSR HTML)', () => {
  it('renders stats page with comparison charts and distribution cards', async () => {
    const { db, d1 } = createTestD1();

    insertTestGame(db, {
      player_name: 'P1',
      score: 95.0,
      device: 'desktop',
      direction: 'clockwise',
    });
    insertTestGame(db, {
      player_name: 'P2',
      score: 85.0,
      device: 'mobile',
      direction: 'counterclockwise',
    });

    const res = await app.request('/stats', { method: 'GET' }, { DB: d1 });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');

    const html = await res.text();
    expect(html).toContain('Accuracy &amp; Distribution Stats');
    expect(html).toContain('Device Accuracy');
    expect(html).toContain('Stroke Direction Accuracy');
    expect(html).toContain('Device Breakdown');
    expect(html).toContain('Stroke Direction Breakdown');
    expect(html).toContain('Leader');
  });
});
