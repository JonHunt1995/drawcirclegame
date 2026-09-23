import type { GameData } from '../../../shared/game';

export const LeaderBoard = ({ entries }: { entries: GameData[] }) => {
  if (entries.length === 0) {
    return (
      <div>
        <p>No circles drawn yet</p>
        <a href="/">Draw a Circle</a>
      </div>
    );
  }

  const headerNames = ['Rank', 'Name', 'Score', 'Link'];
  const headers = headerNames.map((header) => <th>{header}</th>);

  const rows = entries.map((entry, i) => (
    <tr>
      <th scope="row">{i + 1}</th>
      <td>{entry.player_name}</td>
      <td>{entry.score.toFixed(1)}%</td>
      <td>
        <a href={`/game/${entry.id}`} class="huddle-btn">
          Click here!
        </a>
      </td>
    </tr>
  ));

  return (
    <table class="leaderboard">
      <tr>{headers}</tr>
      {rows}
    </table>
  );
};
