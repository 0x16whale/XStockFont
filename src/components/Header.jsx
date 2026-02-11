import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Header({ currentPage, onNavigate }) {
  return (
    <header className="header">
      <div className="header-container">
        <div className="header-logo" onClick={() => onNavigate("home")}>
          <div className="logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3v18h18" />
              <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
            </svg>
          </div>
          <span className="logo-text">XStock</span>
        </div>

        <nav className="header-nav">
          <button
            className={`nav-link ${currentPage === "home" ? "active" : ""}`}
            onClick={() => onNavigate("home")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            Market
          </button>
        </nav>

        <div className="header-actions">
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
