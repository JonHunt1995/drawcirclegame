import type { GameData } from '../../../shared/game';

export type Timeframe = 'all' | 'daily' | 'weekly' | 'monthly';

export interface LeaderBoardProps {
  entries?: GameData[];
  timeframe?: Timeframe;
}

export const LeaderBoard = ({ entries = [], timeframe = 'all' }: LeaderBoardProps) => {
  const headerNames = ['Rank', 'Name', 'Score', 'Device', 'Direction'];
  const headers = [
    ...headerNames.map((header) => <th key={header}>{header}</th>),
    <th key="chevron" aria-label="View Game" class="leaderboard-th-chevron" />,
  ];
  const timeframeButtonNames: string[] = ['1D', '7D', '30D', 'All Time'];
  const namesToUrlSlug: Record<string, string> = {
    '1D': 'daily',
    '7D': 'weekly',
    '30D': 'monthly',
    'All Time': 'all',
  };
  const timeframeButtons = timeframeButtonNames.map((name) => {
    const slug = namesToUrlSlug[name];
    const isActive = slug === timeframe;
    return (
      <a
        class={`timeframe-tab huddle-btn ${isActive ? 'active' : 'huddle-btn-secondary'}`}
        href={`/leaderboard/${slug}`}
      >
        {name}
      </a>
    );
  });

  const formatLabel = (val?: string | null) =>
    val ? val.charAt(0).toUpperCase() + val.slice(1) : 'N/A';

  const rows = entries.map((entry, i) => (
    <tr key={entry.id} class="leaderboard-row">
      <th scope="row">{i + 1}</th>
      <td class="leaderboard-name-cell">
        <a href={`/game/${entry.id}`} class="leaderboard-row-link" title="View Game">
          {entry.player_name}
        </a>
      </td>
      <td class="leaderboard-score">{entry.score.toFixed(1)}%</td>
      <td class="leaderboard-meta">{formatLabel(entry.device)}</td>
      <td class="leaderboard-meta">{formatLabel(entry.direction)}</td>
      <td class="leaderboard-chevron" aria-hidden="true">
        ›
      </td>
    </tr>
  ));

  return (
    <>
      <div class="leaderboard-header">
        <h1 class="game-title">Top 25 Circle Drawings</h1>
        <div class="leaderboard-tabs">{timeframeButtons}</div>
      </div>
      <div class="leaderboard-wrapper">
        {entries.length === 0 ? (
          <div class="leaderboard-empty">
            <p style={{ marginBottom: 'var(--space-s)' }}>No circles drawn yet</p>
            <a
              href="/"
              class="huddle-btn"
              style={{ textDecoration: 'none', display: 'inline-block' }}
            >
              Draw a Circle
            </a>
          </div>
        ) : (
          <table class="leaderboard">
            <thead>
              <tr>{headers}</tr>
            </thead>
            <tbody>{rows}</tbody>
          </table>
        )}
      </div>
      {entries.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: 'var(--space-s)' }}>
          <a
            href="/"
            class="huddle-btn"
            style={{ textDecoration: 'none', display: 'inline-block' }}
          >
            Draw Your Own Circle
          </a>
        </div>
      )}
    </>
  );
};
