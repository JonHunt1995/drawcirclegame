import { describe, it, expect } from 'vitest';
import app from '../src/index';
import { createTestD1 } from './d1-sqlite';

describe('GET / (SSR Root & Navigation)', () => {
  it('renders 200 HTML with canvas, script tag, and navbar', async () => {
    const { d1 } = createTestD1();

    const res = await app.request('/', { method: 'GET' }, { DB: d1 });

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');

    const html = await res.text();

    // Canvas & HUD elements
    expect(html).toContain('circleCanvas');
    expect(html).toContain('progress-hud');
    expect(html).toContain('huddle-card');
    expect(html).toContain('/dist/script.js');

    // Navigation bar
    expect(html).toContain('site-nav');
    expect(html).toContain('DrawCircle');
    expect(html).toContain('href="/leaderboard"');
  });

  it('renders navbar on /leaderboard as well', async () => {
    const { d1 } = createTestD1();

    const res = await app.request('/leaderboard', { method: 'GET' }, { DB: d1 });

    expect(res.status).toBe(200);
    const html = await res.text();

    expect(html).toContain('site-nav');
    expect(html).toContain('DrawCircle');
  });
});
