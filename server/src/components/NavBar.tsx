export interface NavBarProps {
  currentPath?: string;
}

export function NavBar({ currentPath }: NavBarProps) {
  return (
    <nav class="site-nav">
      <a href="/" class="nav-brand">
        CircleDraw
      </a>
      <div class="nav-links">
        <a href="/" class={`nav-link ${currentPath === '/' ? 'active' : ''}`}>
          Play
        </a>
        <a href="/leaderboard" class={`nav-link ${currentPath === '/leaderboard' ? 'active' : ''}`}>
          Leaderboard
        </a>
        <a href="/stats" class={`nav-link ${currentPath === '/stats' ? 'active' : ''}`}>
          Stats
        </a>
        <a
          href="https://github.com/JonHunt1995/drawcirclegame"
          class="nav-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
      </div>
    </nav>
  );
}
