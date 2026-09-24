export interface NavBarProps {
  currentPath?: string;
}

export function NavBar({ currentPath }: NavBarProps) {
  return (
    <nav class="site-nav">
      <a href="/" class="nav-brand">
        DrawCircle
      </a>
      <div class="nav-links">
        <a href="/" class={`nav-link ${currentPath === '/' ? 'active' : ''}`}>
          Play
        </a>
        <a href="/leaderboard" class={`nav-link ${currentPath === '/leaderboard' ? 'active' : ''}`}>
          Leaderboard
        </a>
      </div>
    </nav>
  );
}
