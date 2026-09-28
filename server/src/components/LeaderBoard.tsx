import type { GameData } from '../../../shared/game';

export type Timeframe = 'all' | 'daily' | 'weekly' | 'monthly';

export interface LeaderBoardProps {
  entries?: GameData[];
  timeframe?: Timeframe;
}

export const LeaderBoard = ({ entries = [], timeframe = 'all' }: LeaderBoardProps) => {
  const headerNames = ['Rank', 'Name', 'Score', 'Link'];
  const headers = headerNames.map((header) => <th>{header}</th>);
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

  const rows = entries.map((entry, i) => (
    <tr key={entry.id}>
      <th scope="row">{i + 1}</th>
      <td>{entry.player_name}</td>
      <td class="leaderboard-score">{entry.score.toFixed(1)}%</td>
      <td>
        <a href={`/game/${entry.id}`} class="huddle-btn">
          View
        </a>
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
