export function CanvasGame() {
  return (
    <>
      <h1 class="game-title">Circle Drawing Game</h1>
      <div class="canvas-wrapper">
        <canvas id="circleCanvas"></canvas>

        {/* Real-time HUD */}
        <div id="progress-hud" class="hud">
          Draw a continuous circle
        </div>

        {/* Top Huddle Result Card (Non-blocking) */}
        <div id="huddle-card" class="huddle-card hidden">
          <div class="huddle-left">
            <div class="score-badge">
              <span id="score-val">0.0</span>
              <span class="pct">%</span>
            </div>
          </div>

          <div class="huddle-stats">
            <div class="stat-item">
              <span class="stat-label">Aspect</span>
              <span id="stat-aspect" class="stat-val">
                1.00
              </span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Radius Dev</span>
              <span id="stat-variance" class="stat-val">
                0.0%
              </span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Isoperimetric</span>
              <span id="stat-iso" class="stat-val">
                0.00
              </span>
            </div>
          </div>

          <div class="huddle-actions">
            <button id="submit-btn" class="huddle-btn">
              Submit
            </button>
            <button id="reset-btn" class="huddle-btn huddle-btn-secondary">
              Reset
            </button>
          </div>
        </div>
      </div>

      <script src="/dist/script.js"></script>
    </>
  );
}
