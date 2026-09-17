import { html } from 'hono/html';

type GameTemplateProps = {
  playerName: string;
  score: number;
  svgPath: string;
};

export const gameTemplate = ({ playerName, score, svgPath }: GameTemplateProps) => html`
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${playerName}'s Game - Score: ${score}</title>

      <meta property="og:title" content="${playerName} scored ${score} points!" />
      <meta
        property="og:description"
        content="Check out my drawing and see if you can beat my score!"
      />
      <meta property="og:type" content="website" />

      <style>
        body {
          font-family: system-ui, sans-serif;
          text-align: center;
          background-color: #f4f4f5;
          padding: 2rem;
        }
        .drawing-container {
          background: white;
          max-width: 500px;
          margin: 2rem auto;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          overflow: hidden;
        }
        svg {
          width: 100%;
          height: auto;
          display: block;
        }
        .btn {
          display: inline-block;
          background: #000;
          color: #fff;
          padding: 10px 20px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <h1>${playerName} scored ${score} points!</h1>

      <div class="drawing-container">
        <svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">
          <path
            d="${svgPath}"
            stroke="black"
            stroke-width="4"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>

      <a href="/" class="btn">Play the game yourself!</a>
    </body>
  </html>
`;
