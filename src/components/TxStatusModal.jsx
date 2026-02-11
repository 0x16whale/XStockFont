import { useState, useEffect } from "react";

const EXPLORER_URL = "https://testnet.snowtrace.io/tx/";

export default function TxStatusModal({ isOpen, hash, status, error, onClose }) {
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Handle smooth modal animation
  useEffect(() => {
    if (isOpen && status) {
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    } else {
      setIsVisible(false);
    }
  }, [isOpen, status]);

  if (!isOpen || !status) return null;

  const copyHash = () => {
    if (hash) {
      navigator.clipboard.writeText(hash);
      setShowCopyToast(true);
      setTimeout(() => setShowCopyToast(false), 2000);
    }
  };

  const renderContent = () => {
    switch (status) {
      case "pending":
        return (
          <div className="tx-status-content pending">
            <div className="tx-icon">
              <div className="spinner spinner-lg"></div>
            </div>
            <h3>Confirm in Wallet</h3>
            <p>Please approve the transaction in your wallet</p>
          </div>
        );

      case "confirming":
        return (
          <div className="tx-status-content confirming">
            <div className="tx-icon">
              <div className="spinner spinner-lg"></div>
            </div>
            <h3>Confirming</h3>
            <p>Waiting for blockchain confirmation...</p>
            {hash && (
              <div className="tx-hash-box">
                <code>{hash.slice(0, 20)}...{hash.slice(-8)}</code>
                <button className="copy-btn" onClick={copyHash} title="Copy hash">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        );

      case "success":
        return (
          <div className="tx-status-content success">
            <div className="tx-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h3>Success!</h3>
            <p>Transaction confirmed on chain</p>
            {hash && (
              <>
                <div className="tx-hash-box">
                  <code>{hash.slice(0, 20)}...{hash.slice(-8)}</code>
                  <button className="copy-btn" onClick={copyHash} title="Copy hash">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                </div>
                <a 
                  href={`${EXPLORER_URL}${hash}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="tx-link"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  View on SnowTrace
                </a>
              </>
            )}
          </div>
        );

      case "error":
        return (
          <div className="tx-status-content error">
            <div className="tx-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h3>Transaction Failed</h3>
            <p className="error-message">{error || "Something went wrong"}</p>
            {hash && (
              <>
                <div className="tx-hash-box">
                  <code>{hash.slice(0, 20)}...{hash.slice(-8)}</code>
                  <button className="copy-btn" onClick={copyHash} title="Copy hash">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                </div>
                <a 
                  href={`${EXPLORER_URL}${hash}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="tx-link"
                >
                  View on SnowTrace
                </a>
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const canClose = status === "success" || status === "error";

  return (
    <>
      <div 
        className={`modal-overlay ${canClose ? "can-close" : ""} ${isVisible ? "visible" : ""}`} 
        onClick={canClose ? onClose : undefined}
      >
        <div className={`modal-content tx-modal ${isVisible ? "visible" : ""}`} onClick={(e) => e.stopPropagation()}>
          <div className="modal-body">
            {renderContent()}
          </div>
          {canClose && (
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={onClose}>
                {status === "success" ? "Done" : "Close"}
              </button>
            </div>
          )}
        </div>
      </div>

      {showCopyToast && (
        <div className="copy-toast">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Copied
        </div>
      )}
    </>
  );
}
