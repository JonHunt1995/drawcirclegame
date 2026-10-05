# CircleDraw

A precision circle-drawing game evaluated at the edge with Cloudflare Workers and Hono.

**Live Game**: [circledraw.jonhunt.dev](https://circledraw.jonhunt.dev) | **API Docs**: [circledraw.jonhunt.dev/docs](https://circledraw.jonhunt.dev/docs)

Draw a circle with a mouse or touchscreen. The game fits an ideal circle to your stroke, grades your geometric precision using algebraic fitting and quadratic deviation penalties, and ranks your score on a global leaderboard.

---

## Mathematical Scoring Model

CircleDraw evaluates player strokes using algebraic circle fitting and multi-factor geometric deviation.

### 1. Reference Circle Fitting (Kåsa's Method)

Given a sequence of $N$ sampled stroke points $P_i = (x_i, y_i)$, coordinates are first translated relative to the mean centroid $(\bar{x}, \bar{y})$:

$$
\bar{x} = \frac{1}{N} \sum_{i=1}^N x_i, \quad \bar{y} = \frac{1}{N} \sum_{i=1}^N y_i
$$

$$
u_i = x_i - \bar{x}, \quad v_i = y_i - \bar{y}
$$

The central moments of the point distribution are computed:

$$
S_{uu} = \sum_{i=1}^N u_i^2, \quad S_{vv} = \sum_{i=1}^N v_i^2, \quad S_{uv} = \sum_{i=1}^N u_i v_i
$$

$$
S_{uuu} = \sum_{i=1}^N u_i^3, \quad S_{vvv} = \sum_{i=1}^N v_i^3, \quad S_{uvv} = \sum_{i=1}^N u_i v_i^2, \quad S_{vuu} = \sum_{i=1}^N v_i u_i^2
$$

The determinant and algebraic center $(c_x, c_y)$ are solved via Cramer's rule:

$$
\det = S_{uu} S_{vv} - S_{uv}^2
$$

$$
u_c = \frac{(S_{uuu} + S_{uvv}) S_{vv} - (S_{vvv} + S_{vuu}) S_{uv}}{2 \cdot \det}
$$

$$
v_c = \frac{(S_{vvv} + S_{vuu}) S_{uu} - (S_{uuu} + S_{uvv}) S_{uv}}{2 \cdot \det}
$$

$$
c_x = u_c + \bar{x}, \quad c_y = v_c + \bar{y}
$$

The reference radius $R$ is the root-mean-square distance from the points to the fitted center:

$$
R = \sqrt{\frac{1}{N} \sum_{i=1}^N \left( (x_i - c_x)^2 + (y_i - c_y)^2 \right)}
$$

---

### 2. The Three Metric Categories

#### Category A: Isoperimetric Quotient ($Q$) - Loop Integrity & Area Efficiency
Measures how close the drawn polygon is to an ideal circle of equal perimeter, using the Shoelace formula for area $A$ and segment summation for perimeter $L$:

$$
Q = \frac{4 \pi A}{L^2}, \quad Q \in [0, 1]
$$

- For a perfect continuous circle, $Q = 1$.
- Any non-circularity, waviness, or perimeter waste reduces $Q < 1$.

#### Category B: Radial Coefficient of Variation ($CV_r$) - Stroke Roundness
Measures the standard deviation of radial distances $d_i = \sqrt{(x_i - c_x)^2 + (y_i - c_y)^2}$ relative to the fitted radius $R$:

$$
\sigma_r = \sqrt{\frac{1}{N} \sum_{i=1}^N (d_i - R)^2}
$$

$$
CV_r = \frac{\sigma_r}{R}
$$

#### Category C: Aspect Ratio ($AR$) - Bounding Box Symmetry
Measures horizontal and vertical bounds $W = \max(x) - \min(x)$ and $H = \max(y) - \min(y)$ to penalize oblong ellipses:

$$
AR = \frac{\min(W, H)}{\max(W, H)}, \quad AR \in [0, 1]
$$

---

### 3. Quadratic Penalties and Composite Score

Rather than linear drops, CircleDraw applies **quadratic penalties** to radial deviation and aspect ratio. This allows minor hand jitter without massive score loss, while severely penalizing visible wobble or egg shapes.

#### Normalized Error Terms
With tolerance thresholds $\tau_r = 0.16$ (16% radial CV) and $\tau_{\text{aspect}} = 0.40$:

$$
\text{err}_r = \min\left(1, \, \frac{CV_r}{0.16}\right)
$$

$$
\text{err}_{\text{aspect}} = \min\left(1, \, \frac{1 - AR}{0.40}\right)
$$

#### Quadratic Multipliers

$$
F_{\text{radial}} = \max\left(0, \, 1 - \text{err}_r^2\right)
$$

$$
F_{\text{aspect}} = \max\left(0, \, 1 - \text{err}_{\text{aspect}}^2\right)
$$

#### Final Composite Score

$$
\text{Score} = \text{clamp}\left(100 \times Q \times F_{\text{radial}} \times F_{\text{aspect}}, \, 0, \, 100\right)
$$

$$
= 100 \times Q \times \left(1 - \text{err}_r^2\right) \times \left(1 - \text{err}_{\text{aspect}}^2\right)
$$

---

## Architecture & Tech Stack

- **Client**: Vanilla TypeScript and HTML5 Canvas. Zero framework dependencies, bundled with esbuild into a `< 10 KB` asset.
- **Server**: Server-Side Rendered (SSR) with Hono JSX running on Cloudflare Workers edge nodes.
- **Database**: Cloudflare D1 (SQLite at the edge) with batched DQL queries (`c.env.DB.batch`) to eliminate waterfall latency.
- **Environments**: Isolated database instances for local development, PR preview deployments, and production.

---

## Quickstart

### Prerequisites
- Node.js >= 20
- pnpm >= 11
- Cloudflare Wrangler CLI

### Setup & Run

```bash
# Install dependencies
pnpm install

# Run local development server (automatically applies local D1 migrations)
pnpm dev
```

The game will be available at `http://localhost:8788`.

---

## Scripts & Quality Checks

- `pnpm dev`: Start local Wrangler dev server with local SQLite D1.
- `pnpm test`: Run Vitest test suite for geometry and server routes.
- `pnpm lint`: Run Biome linter and formatter check.
- `pnpm lint:fix`: Automatically fix Biome lint and format issues.
- `pnpm format`: Format all files with Biome.
- `pnpm typecheck`: Run TypeScript compiler check (`tsc --noEmit`).
- `pnpm build`: Bundle client canvas scripts with esbuild into `client/dist`.

---

## Database Migrations

CircleDraw isolates database environments to prevent migrations or test data from leaking across stages:

- `pnpm run migrate:local`: Apply pending migrations to the local dev SQLite database.
- `pnpm run migrate:preview`: Apply migrations to the staging/preview Cloudflare D1 database.
- `pnpm run migrate:remote`: Apply migrations to the production Cloudflare D1 database.

Lifecycle hooks in `package.json` automate local migrations before dev (`predev`) and production migrations before deploy (`predeploy`).

---

## Routes & API

### Pages (SSR)
- `/`: Interactive canvas drawing game.
- `/leaderboard`: Top 25 scores filtered by all-time, daily, weekly, or monthly timeframes.
- `/stats`: Comparison charts and breakdown metrics grouped by device and stroke direction.
- `/game/:id`: Permanent score card with SVG stroke replay, percentile ranking, and Open Graph share metadata.

### Endpoints
- `POST /api/v1/game`: Submit a completed stroke for evaluation and ranking.
- `GET /openapi.json`: OpenAPI 3.1 specification for CircleDraw APIs ([Live Spec](https://circledraw.jonhunt.dev/openapi.json)).
- `GET /docs`: Interactive API documentation and explorer powered by Scalar ([Interactive Docs](https://circledraw.jonhunt.dev/docs)).
