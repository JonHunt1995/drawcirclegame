import { describe, expect, it } from 'vitest';
import { ComparisonChart, type ComparisonItem } from '../src/components/ComparisonChart';
import app from '../src/index';
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
