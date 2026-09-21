import type { FC } from 'hono/jsx';
import { ReferenceCircle } from '../../shared/circle';
import { SSRShell } from './components/SSRShell';
import { GameCard } from './components/GameCard';

export type GameTemplateProps = {
  playerName: string;
  refCircle: ReferenceCircle;
  score: number;
  svgPath: string;
};

export const GameTemplate: FC<GameTemplateProps> = ({ playerName, score, svgPath, refCircle }) => {
  return (
    <SSRShell
      title={`${playerName}'s Game - Score: ${score.toFixed(1)}%`}
      og={{
        title: `${playerName} scored ${score.toFixed(1)}%!`,
        description: 'Check out my drawing and see if you can beat my score!',
        type: 'website',
      }}
      wrapInAppContainer={true}
      components={[
        <GameCard playerName={playerName} score={score} refCircle={refCircle} svgPath={svgPath} />,
      ]}
    />
  );
};
