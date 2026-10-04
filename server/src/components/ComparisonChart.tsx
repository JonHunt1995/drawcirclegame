export type ComparisonItem = {
  name: string;
  value: number;
  count?: number;
};

export type ComparisonChartProps = {
  category: string;
  items: ComparisonItem[];
};

const DisplayBlock = ({ item, isWinner }: { item: ComparisonItem; isWinner: boolean }) => {
  const { name, value, count } = item;

  return (
    <div class={`display-block ${isWinner ? 'display-block--winner' : ''}`}>
      {isWinner && <span class="winner-badge">Leader</span>}
      <h3 class="display-name">{name}</h3>
      <div class="display-value">{value.toFixed(1)}%</div>
      {count !== undefined && (
        <span class="display-count">
          {count} {count === 1 ? 'game' : 'games'}
        </span>
      )}
    </div>
  );
};

export const ComparisonChart = ({ items, category }: ComparisonChartProps) => {
  const winner = items.reduce((acc, item) => Math.max(item.value, acc), 0);

  if (winner === 0 || items.length === 0) {
    return (
      <div class="comparison-chart-wrapper">
        <h2 class="comparison-title">{category}</h2>
        <div class="comparison-empty">No comparison data available yet</div>
      </div>
    );
  }

  return (
    <div class="comparison-chart-wrapper">
      <h2 class="comparison-title">{category}</h2>
      <div class="comparison-chart">
        {items.map((item) => (
          <DisplayBlock
            key={item.name}
            item={item}
            isWinner={item.value === winner && winner > 0}
          />
        ))}
      </div>
    </div>
  );
};
