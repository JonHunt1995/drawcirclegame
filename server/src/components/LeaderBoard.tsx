import type { GameData } from '../../../shared/game';

export const LeaderBoard = ({ entries = [] }: { entries?: GameData[] }) => {
  if (entries.length === 0) {
    return (
      <>
        <h1 class="game-title">Top 25 Circle Drawings</h1>
        <div class="leaderboard-wrapper">
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
        </div>
      </>
    );
  }

  const headerNames = ['Rank', 'Name', 'Score', 'Link'];
  const headers = headerNames.map((header) => <th>{header}</th>);

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
      <h1 class="game-title">Top 25 Circle Drawings</h1>
      <div class="leaderboard-wrapper">
        <table class="leaderboard">
          <thead>
            <tr>{headers}</tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
      </div>
      <div style={{ textAlign: 'center', marginTop: 'var(--space-s)' }}>
        <a href="/" class="huddle-btn" style={{ textDecoration: 'none', display: 'inline-block' }}>
          Draw Your Own Circle
        </a>
      </div>
    </>
  );
};
