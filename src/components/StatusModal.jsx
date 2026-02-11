import { useEffect, useState } from "react";
import { useReadContract } from "wagmi";
import { CONTRACTS, ABIS, formatStockState, getStatusBadgeClass } from "../config/contracts";

export default function StatusModal({ stockId, isOpen, onClose }) {
  const [status, setStatus] = useState(null);
  const [checkCount, setCheckCount] = useState(0);

  const { data: stockState, refetch, isFetching } = useReadContract({
    address: CONTRACTS.StockRegistry,
    abi: ABIS.StockRegistry,
    functionName: "getStockState",
    args: stockId ? [BigInt(stockId)] : undefined,
    query: {
      enabled: !!stockId && isOpen,
    },
  });

  useEffect(() => {
    if (stockState !== undefined) {
      setStatus(Number(stockState));
    }
  }, [stockState]);

  useEffect(() => {
    if (isOpen) {
      setStatus(null);
      setCheckCount(0);
      refetch();
    }
  }, [isOpen, stockId]);

  const handleRefresh = async () => {
    await refetch();
    setCheckCount((prev) => prev + 1);
  };

  if (!isOpen) return null;

  const getStatusIcon = () => {
    if (status === undefined || status === null || isFetching) {
      return (
        <div className="status-icon loading">
          <div className="spinner"></div>
        </div>
      );
    }

    switch (status) {
      case 0:
        return (
          <div className="status-icon draft">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </div>
        );
      case 1:
        return (
          <div className="status-icon pending">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
        );
      case 2:
        return (
          <div className="status-icon approved">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
        );
      case 3:
        return (
          <div className="status-icon rejected">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 0:
        return {
          title: "Draft",
          description: "Stock is in draft status, waiting to submit for review",
          showRefresh: false,
        };
      case 1:
        return {
          title: "Under Review",
          description: "Waiting for admin approval",
          showRefresh: true,
        };
      case 2:
        return {
          title: "Approved",
          description: "Stock approved, ready for trading",
          showRefresh: false,
        };
      case 3:
        return {
          title: "Rejected",
          description: "Stock not approved, contact admin for details",
          showRefresh: false,
        };
      default:
        return {
          title: "Loading...",
          description: "Fetching stock status",
          showRefresh: false,
        };
    }
  };

  const message = getStatusMessage();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content status-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Review Status</h2>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="status-content">
            {getStatusIcon()}

            <div className="status-info">
              <span className={`badge ${getStatusBadgeClass(status)} status-badge`}>
                {formatStockState(status)}
              </span>
              <h3 className="status-title">{message.title}</h3>
              <p className="status-description">{message.description}</p>
            </div>

            {message.showRefresh && (
              <div className="status-action">
                <button 
                  className="btn btn-secondary" 
                  onClick={handleRefresh}
                  disabled={isFetching}
                >
                  {isFetching ? (
                    <>
                      <div className="spinner spinner-sm"></div>
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="23 4 23 10 17 10" />
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                      </svg>
                      Refresh Status
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <div className="status-meta">
            <span>ID: #{stockId}</span>
            {checkCount > 0 && <span>Checked: {checkCount}</span>}
          </div>
          {status === 2 ? (
            <button className="btn btn-accent" onClick={onClose}>
              Trade Now
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
