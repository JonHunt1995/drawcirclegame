import type { FC } from 'hono/jsx';

export type StatCategory = {
  name: string;
  quantity: number;
  color: string;
};

export type StatCardProps = {
  title: string;
  categories: StatCategory[];
};

type BarGraphProps = {
  categories: StatCategory[];
  sum: number;
};

const BarGraph: FC<BarGraphProps> = ({ categories, sum }) => {
  if (sum === 0) {
    return (
      <div class="stat-bar-graph stat-bar-empty" role="img" aria-label="No data available">
        <span>No data recorded yet</span>
      </div>
    );
  }

  const activeCategories = categories.filter((c) => c.quantity > 0);
  const ariaSummary = activeCategories
    .map((c) => `${c.name}: ${((c.quantity / sum) * 100).toFixed(1)}%`)
    .join(', ');

  return (
    <div class="stat-bar-graph" role="img" aria-label={`Distribution: ${ariaSummary}`}>
      {activeCategories.map(({ name, quantity, color }) => {
        const percentage = (quantity / sum) * 100;
        return (
          <div
            key={name}
            class="stat-bar-segment"
            title={`${name}: ${quantity} (${percentage.toFixed(1)}%)`}
            style={{
              width: `${percentage.toFixed(2)}%`,
              backgroundColor: color,
            }}
          />
        );
      })}
    </div>
  );
};

type LegendProps = {
  categories: StatCategory[];
  sum: number;
};

const Legend: FC<LegendProps> = ({ categories, sum }) => {
  return (
    <ul class="stat-legend">
      {categories.map(({ name, quantity, color }) => {
        const percentage = sum > 0 ? (quantity / sum) * 100 : 0;
        return (
          <li key={name} class="stat-legend-item">
            <span
              class="stat-legend-swatch"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
            <span class="stat-legend-label">
              <strong class="stat-legend-name">{name}</strong>{' '}
              <span class="stat-legend-count">{quantity}</span>{' '}
              <span class="stat-legend-pct">({percentage.toFixed(1)}%)</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
};

export const StatCard: FC<StatCardProps> = ({ title, categories }) => {
  const sum = categories.reduce((acc, { quantity }) => acc + quantity, 0);

  return (
    <section
      class="stat-card"
      aria-labelledby={`stat-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <h3 id={`stat-card-${title.toLowerCase().replace(/\s+/g, '-')}`} class="stat-card-title">
        {title}
      </h3>
      <BarGraph categories={categories} sum={sum} />
      <Legend categories={categories} sum={sum} />
      {sum > 0 && <p class="stat-footnote">* Percentages may not total 100% due to rounding.</p>}
    </section>
  );
};
