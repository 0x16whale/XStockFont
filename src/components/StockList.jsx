import { useAccount } from "wagmi";
import { useStocks } from "../hooks/useStocks";
import {
  formatAddress,
  formatNumber,
  formatPrice,
  timeAgo,
  getStatusBadgeClass,
  formatStockState,
  formatStockType,
} from "../config/contracts";

export default function StockList({ onSelectStock, onCreateStock }) {
  const { isConnected } = useAccount();
  const { stocks, isLoading, error, refetch } = useStocks();

  const getStockIcon = (symbol) => (
    <div className="stock-icon">{symbol?.toUpperCase() || "Undefined"}</div>
  );

  return (
    <div className="stock-list-page">
      <div className="page-header">
        <div className="page-title-section">
          <h1>Stock Token Market</h1>
          <p>Browse and trade tokenized stocks</p>
        </div>
        <div className="page-actions">
          <button
            className="btn btn-secondary"
            onClick={refetch}
            disabled={isLoading}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{
                width: "18px",
                height: "18px",
                animation: isLoading ? "spin 1s linear infinite" : "none",
              }}
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Refresh
          </button>
          <button
            className="btn btn-primary btn-lg"
            onClick={onCreateStock}
            disabled={!isConnected}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ width: "18px", height: "18px" }}
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create Stock
          </button>
        </div>
      </div>

      {!isConnected && (
        <div className="connect-prompt">
          <div className="connect-prompt-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h3>Connect Wallet</h3>
          <p>Connect your wallet to view stock list</p>
        </div>
      )}

      {isConnected && isLoading && (
        <div className="loading-state">
          <div className="spinner spinner-lg"></div>
          <p>Loading...</p>
        </div>
      )}

      {isConnected && error && (
        <div className="error-state">
          <div className="error-state-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h3>Failed to Load</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={refetch}>
            Retry
          </button>
        </div>
      )}

      {isConnected && !isLoading && !error && stocks.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <h3>No Stocks</h3>
          <p>No stock tokens created yet</p>
          <button className="btn btn-primary" onClick={onCreateStock}>
            Create First Stock
          </button>
        </div>
      )}

      {isConnected && !isLoading && !error && stocks.length > 0 && (
        <div className="stock-grid">
          {stocks.map((stock) => (
            <div
              key={stock.id}
              className="stock-card"
              onClick={() => onSelectStock(stock)}
            >
              <div className="stock-card-header">
                {getStockIcon(stock.symbol)}
                <div className="stock-info">
                  <h3 className="stock-name">{stock.name}</h3>
                  <span className="stock-symbol">{stock.symbol}</span>
                </div>
                <span className={`badge ${getStatusBadgeClass(stock.state)}`}>
                  {formatStockState(stock.state)}
                </span>
              </div>

              <div className="stock-card-body">
                <div className="stock-metrics">
                  <div className="metric">
                    <span className="metric-label">Price</span>
                    <span className="metric-value">
                      ${formatPrice(stock.price)}
                    </span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Type</span>
                    <span className="metric-value">
                      {formatStockType(stock.stockType)}
                    </span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Supply</span>
                    <span className="metric-value">
                      {formatNumber(stock.totalSupply)}
                    </span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Reserve</span>
                    <span className="metric-value">
                      ${formatNumber(stock.reserve)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="stock-card-footer">
                <div className="stock-address">
                  <span className="text-muted">Contract:</span>
                  <span>{formatAddress(stock.stock)}</span>
                </div>
                {stock.lastUpdateTime > 0 && (
                  <div className="stock-update">
                    <span className="text-muted">Updated:</span>
                    <span>{timeAgo(stock.lastUpdateTime)}</span>
                  </div>
                )}
              </div>

              {stock.state === 2 && (
                <div className="stock-action">
                  <button
                    className="btn btn-accent btn-sm"
                    style={{ width: "100%" }}
                  >
                    Enter
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
