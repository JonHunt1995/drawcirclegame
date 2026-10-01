import { describe, expect, it } from 'vitest';
import { StatCard, type StatCategory } from '../src/components/StatCard';

describe('StatCard component', () => {
  it('renders standard distribution with bar segments, legend, and footnote', () => {
    const categories: StatCategory[] = [
      { name: 'desktop', quantity: 25, color: '#38bdf8' },
      { name: 'mobile', quantity: 20, color: '#34d399' },
      { name: 'tablet', quantity: 5, color: '#f59e0b' },
    ];

    const element = StatCard({ title: 'Device Breakdown', categories });
    const html = String(element);

    // Title and container
    expect(html).toContain('Device Breakdown');
    expect(html).toContain('class="stat-card"');
    expect(html).toContain('aria-labelledby="stat-card-device-breakdown"');

    // BarGraph accessibility & segments
    expect(html).toContain('role="img"');
    expect(html).toContain(
      'aria-label="Distribution: desktop: 50.0%, mobile: 40.0%, tablet: 10.0%"'
    );
    expect(html).toContain('width:50.00%');
    expect(html).toContain('width:40.00%');
    expect(html).toContain('width:10.00%');
    expect(html).toContain('title="desktop: 25 (50.0%)"');
    expect(html).toContain('title="mobile: 20 (40.0%)"');
    expect(html).toContain('title="tablet: 5 (10.0%)"');

    // Legend
    expect(html).toContain('class="stat-legend"');
    expect(html).toContain('desktop');
    expect(html).toContain('(50.0%)');
    expect(html).toContain('mobile');
    expect(html).toContain('(40.0%)');
    expect(html).toContain('tablet');
    expect(html).toContain('(10.0%)');
    expect(html).toContain('aria-hidden="true"');

    // Footnote
    expect(html).toContain('* Percentages may not total 100% due to rounding.');
  });

  it('handles sum === 0 without NaN% or layout errors', () => {
    const categories: StatCategory[] = [
      { name: 'desktop', quantity: 0, color: '#38bdf8' },
      { name: 'mobile', quantity: 0, color: '#34d399' },
      { name: 'tablet', quantity: 0, color: '#f59e0b' },
    ];

    const element = StatCard({ title: 'Empty Stats', categories });
    const html = String(element);

    // Must not produce NaN
    expect(html).not.toContain('NaN');

    // Empty bar graph state
    expect(html).toContain('stat-bar-empty');
    expect(html).toContain('No data recorded yet');

    // Legend shows 0 count and (0.0%)
    expect(html).toContain('class="stat-legend-count">0</span>');
    expect(html).toContain('(0.0%)');

    // Footnote is omitted when there is no data
    expect(html).not.toContain('* Percentages may not total 100% due to rounding.');
  });

  it('filters zero-quantity categories from bar graph while retaining them in legend', () => {
    const categories: StatCategory[] = [
      { name: 'clockwise', quantity: 15, color: '#38bdf8' },
      { name: 'counterclockwise', quantity: 0, color: '#f43f5e' },
    ];

    const element = StatCard({ title: 'Stroke Direction', categories });
    const html = String(element);

    // BarGraph only has 1 active segment (100%)
    expect(html).toContain('aria-label="Distribution: clockwise: 100.0%"');
    expect(html).toContain('width:100.00%');
    expect(html).not.toContain('title="counterclockwise: 0');

    // Legend still lists both categories
    expect(html).toContain('clockwise');
    expect(html).toContain('(100.0%)');
    expect(html).toContain('counterclockwise');
    expect(html).toContain('(0.0%)');
  });

  it('handles an empty category array gracefully', () => {
    const element = StatCard({ title: 'No Categories', categories: [] });
    const html = String(element);

    expect(html).not.toContain('NaN');
    expect(html).toContain('stat-bar-empty');
    expect(html).toContain('No data recorded yet');
  });
});
