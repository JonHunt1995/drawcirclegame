import { html } from 'hono/html';
import { ReferenceCircle } from '../../shared/circle';

type GameTemplateProps = {
  playerName: string;
  refCircle: ReferenceCircle;
  score: number;
  svgPath: string;
};

export const gameTemplate = ({ playerName, score, svgPath, refCircle }: GameTemplateProps) => {
  const pad = 30;
  const minX = refCircle.cx - refCircle.r - pad;
  const minY = refCircle.cy - refCircle.r - pad;
  const size = (refCircle.r + pad) * 2;
  const viewBox = `${minX} ${minY} ${size} ${size}`;

  return html`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${playerName}'s Game - Score: ${score.toFixed(1)}</title>

        <meta property="og:title" content="${playerName} scored ${score.toFixed(1)}%!" />
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
        <h1>${playerName} scored ${score.toFixed(1)}%!</h1>

        <div class="drawing-container">
          <svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">
            <circle
              cx="${refCircle.cx}"
              cy="${refCircle.cy}"
              r="${refCircle.r}"
              stroke="#0284c7"
              stroke-width="2"
              stroke-dasharray="6, 6"
              fill="none"
            />
            <circle cx="${refCircle.cx}" cy="${refCircle.cy}" r="4" fill="#0284c7" />
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
};
