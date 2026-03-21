import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useChainId } from "wagmi";
import NetworkSwitcher from "./NetworkSwitcher";

export default function Header({ currentPage, onNavigate, onNetworkSwitch }) {
  const { login, logout, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const chainId = useChainId();

  // Get the active wallet address (first wallet in the list or from user object)
  const activeWallet = wallets[0];
  const address = activeWallet?.address || user?.wallet?.address;

  // Check if on correct network
  const isCorrectNetwork = chainId === 8453;

  // Format address for display
  const formatAddress = (addr) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

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
          {authenticated && address && (
            <NetworkSwitcher onNetworkSwitch={onNetworkSwitch} />
          )}
          {authenticated && address ? (
            <div className="wallet-connected">
              <span className="wallet-address">{formatAddress(address)}</span>
              <button className="wallet-disconnect-btn" onClick={logout}>
                Disconnect
              </button>
            </div>
          ) : (
            <button className="wallet-connect-btn" onClick={login}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 7h-9" />
                <path d="M14 17H5" />
                <circle cx="17" cy="17" r="3" />
                <circle cx="7" cy="7" r="3" />
              </svg>
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
