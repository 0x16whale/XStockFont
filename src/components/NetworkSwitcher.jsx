import { useState, useRef, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useChainId, useSwitchChain } from "wagmi";
import { base } from "viem/chains";
import { isBaseMainnet } from "../config/networks";
import { CHAIN_NAME } from "../config/contracts";

export default function NetworkSwitcher({ onRefresh }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { authenticated } = usePrivy();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Only show for authenticated users
  if (!authenticated) return null;

  const isCorrectNetwork = isBaseMainnet(chainId);

  const handleSwitchToBase = async () => {
    try {
      await switchChain({ chainId: base.id });
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to switch network:", error);
    }
  };

  const handleRefresh = () => {
    onRefresh?.();
    setIsOpen(false);
  };

  // Wrong network - show switch button
  if (!isCorrectNetwork) {
    return (
      <div className="network-switcher warning">
        <div className="network-status">
          <span className="network-indicator error"></span>
          <span className="network-name">Wrong Network</span>
        </div>
        <button 
          className="switch-network-btn"
          onClick={handleSwitchToBase}
          disabled={isSwitching}
        >
          {isSwitching ? (
            <div className="spinner spinner-sm"></div>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          )}
          {isSwitching ? "Switching..." : `Switch to ${CHAIN_NAME}`}
        </button>
      </div>
    );
  }

  // Correct network - show dropdown with refresh option
  return (
    <div className="network-dropdown" ref={dropdownRef}>
      <button 
        className="network-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="network-status">
          <span className="network-indicator"></span>
          <span className="network-name">{CHAIN_NAME}</span>
        </div>
        <svg 
          className={`dropdown-arrow ${isOpen ? 'open' : ''}`}
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="network-dropdown-menu">
          <div className="network-dropdown-header">
            <span>Network</span>
          </div>
          <div className="network-dropdown-item active">
            <div className="network-item-left">
              <span className="network-indicator"></span>
              <span className="network-item-name">{CHAIN_NAME}</span>
            </div>
            <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="network-dropdown-footer">
            <button 
              className="refresh-data-btn"
              onClick={handleRefresh}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Refresh Data
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
