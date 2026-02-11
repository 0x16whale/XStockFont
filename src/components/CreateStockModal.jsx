import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACTS, ABIS } from "../config/contracts";
import TxStatusModal from "./TxStatusModal";

// Supported collateral tokens
const COLLATERAL_OPTIONS = [
  { symbol: "USDC", address: CONTRACTS.USDC },
];

// Oracle options
const ORACLE_OPTIONS = [
  { name: "StockStreamsOracle (Main Stock)", address: CONTRACTS.StockStreamsOracle },
  { name: "StockFunctionsOracle (Other Stock)", address: CONTRACTS.StockFunctionsOracle },
  { name: "Custom", address: "custom" },
];

export default function CreateStockModal({ isOpen, onClose, onSuccess }) {
  const { address } = useAccount();
  const [showTxModal, setShowTxModal] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [oracleType, setOracleType] = useState("StockFunctionsOracle (Other Stock)");
  const [customOracle, setCustomOracle] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    proof: "",
    priceUri: "",
    describe: "",
    multiSig: "",
    collateral: CONTRACTS.USDC,
    oracle: CONTRACTS.StockFunctionsOracle,
  });
  const [errors, setErrors] = useState({});

  // Handle smooth modal animation
  useEffect(() => {
    if (isOpen) {
      // Small delay to allow DOM to render before adding visible class
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, isError, error: confirmError } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    if (isPending || hash) {
      setShowTxModal(true);
    }
  }, [isPending, hash]);

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        handleClose();
        onSuccess?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess]);

  const validateAddress = (addr) => {
    return addr && addr.startsWith("0x") && addr.length === 42;
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Stock name is required";
    if (!formData.symbol.trim()) newErrors.symbol = "Symbol is required";
    if (formData.symbol.length > 10) newErrors.symbol = "Symbol max 10 chars";
    if (!formData.proof.trim()) newErrors.proof = "Proof URL is required";
    if (!formData.priceUri.trim()) newErrors.priceUri = "Price source is required";
    if (!formData.describe.trim()) newErrors.describe = "Description is required";
    
    // Validate addresses
    if (!formData.multiSig.trim()) {
      newErrors.multiSig = "MultiSig address is required";
    } else if (!validateAddress(formData.multiSig)) {
      newErrors.multiSig = "Invalid Ethereum address";
    }
    
    if (!formData.collateral.trim()) {
      newErrors.collateral = "Collateral address is required";
    } else if (!validateAddress(formData.collateral)) {
      newErrors.collateral = "Invalid Ethereum address";
    }
    
    if (!formData.oracle.trim()) {
      newErrors.oracle = "Oracle address is required";
    } else if (!validateAddress(formData.oracle)) {
      newErrors.oracle = "Invalid Ethereum address";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      writeContract({
        address: CONTRACTS.StockRegistry,
        abi: ABIS.StockRegistry,
        functionName: "createStock",
        args: [
          {
            multiSig: formData.multiSig,
            collateral: formData.collateral,
            oracle: formData.oracle,
            name: formData.name,
            symbol: formData.symbol,
            proof: formData.proof,
            priceUri: formData.priceUri,
            describe: formData.describe,
          },
        ],
      });
    } catch (err) {
      console.error("Create stock failed:", err);
    }
  };

  const handleClose = () => {
    setFormData({
      name: "",
      symbol: "",
      proof: "",
      priceUri: "",
      describe: "",
      multiSig: "",
      collateral: CONTRACTS.USDC,
      oracle: CONTRACTS.StockFunctionsOracle,
    });
    setOracleType("StockFunctionsOracle (Other Stock)");
    setCustomOracle("");
    setErrors({});
    reset();
    setShowTxModal(false);
    onClose();
  };

  const handleOracleTypeChange = (e) => {
    const selectedName = e.target.value;
    setOracleType(selectedName);
    
    const selectedOption = ORACLE_OPTIONS.find(opt => opt.name === selectedName);
    if (selectedOption && selectedOption.address !== "custom") {
      setFormData({ ...formData, oracle: selectedOption.address });
      setCustomOracle("");
    }
  };

  const handleCustomOracleChange = (e) => {
    const value = e.target.value;
    setCustomOracle(value);
    setFormData({ ...formData, oracle: value });
  };

  const handleCollateralChange = (e) => {
    const selectedSymbol = e.target.value;
    const selectedOption = COLLATERAL_OPTIONS.find(opt => opt.symbol === selectedSymbol);
    if (selectedOption) {
      setFormData({ ...formData, collateral: selectedOption.address });
    }
  };

  const getTxStatus = () => {
    if (isPending) return "pending";
    if (isConfirming) return "confirming";
    if (isSuccess) return "success";
    if (isError) return "error";
    return null;
  };

  const getTxError = () => {
    return writeError?.message || confirmError?.message || "Transaction failed";
  };

  if (!isOpen) return null;

  return (
    <>
      <div className={`modal-overlay ${isVisible ? 'visible' : ''}`} onClick={handleClose}>
        <div className={`modal-content ${isVisible ? 'visible' : ''}`} onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">Create Stock Token</h2>
            <button className="modal-close" onClick={handleClose}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    Stock Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-input ${errors.name ? "error" : ""}`}
                    placeholder="e.g. Apple Inc."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                  {errors.name && <span className="error-text">{errors.name}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Symbol <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-input ${errors.symbol ? "error" : ""}`}
                    placeholder="e.g. AAPL"
                    value={formData.symbol}
                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                  />
                  {errors.symbol && <span className="error-text">{errors.symbol}</span>}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Reserve Proof <span className="required">*</span>
                </label>
                <input
                  type="url"
                  className={`form-input ${errors.proof ? "error" : ""}`}
                  placeholder="https://..."
                  value={formData.proof}
                  onChange={(e) => setFormData({ ...formData, proof: e.target.value })}
                />
                {errors.proof && <span className="error-text">{errors.proof}</span>}
                <span className="help-text">Link to reserve proof documentation</span>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Price Source <span className="required">*</span>
                </label>
                <input
                  type="url"
                  className={`form-input ${errors.priceUri ? "error" : ""}`}
                  placeholder="https://api.example.com/price/..."
                  value={formData.priceUri}
                  onChange={(e) => setFormData({ ...formData, priceUri: e.target.value })}
                />
                {errors.priceUri && <span className="error-text">{errors.priceUri}</span>}
                <span className="help-text">API endpoint for stock price data</span>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Description <span className="required">*</span>
                </label>
                <textarea
                  className={`form-textarea ${errors.describe ? "error" : ""}`}
                  placeholder="Brief description of the stock..."
                  value={formData.describe}
                  onChange={(e) => setFormData({ ...formData, describe: e.target.value })}
                  rows={3}
                />
                {errors.describe && <span className="error-text">{errors.describe}</span>}
              </div>

              {/* Address Configuration Section */}
              <div className="form-section-divider">
                <span>Contract Addresses</span>
              </div>

              <div className="form-group">
                <label className="form-label">
                  MultiSig Address <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className={`form-input ${errors.multiSig ? "error" : ""}`}
                  placeholder="0x..."
                  value={formData.multiSig}
                  onChange={(e) => setFormData({ ...formData, multiSig: e.target.value })}
                />
                {errors.multiSig && <span className="error-text">{errors.multiSig}</span>}
                <span className="help-text">Multi-signature wallet address for stock management</span>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Collateral Token <span className="required">*</span>
                </label>
                <select
                  className="form-select"
                  value={COLLATERAL_OPTIONS.find(opt => opt.address === formData.collateral)?.symbol || "USDC"}
                  onChange={handleCollateralChange}
                >
                  {COLLATERAL_OPTIONS.map((option) => (
                    <option key={option.symbol} value={option.symbol}>
                      {option.symbol}
                    </option>
                  ))}
                </select>
                <span className="help-text">Select collateral token for this stock</span>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Oracle Type <span className="required">*</span>
                </label>
                <select
                  className="form-select"
                  value={oracleType}
                  onChange={handleOracleTypeChange}
                >
                  {ORACLE_OPTIONS.map((option) => (
                    <option key={option.name} value={option.name}>
                      {option.name}
                    </option>
                  ))}
                </select>
                <span className="help-text">
                  Main: Real-time Pyth price feeds | Other: Chainlink Functions for custom stocks
                </span>
              </div>

              {oracleType === "Custom" && (
                <div className="form-group">
                  <label className="form-label">
                    Custom Oracle Address <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-input ${errors.oracle ? "error" : ""}`}
                    placeholder="0x..."
                    value={customOracle}
                    onChange={handleCustomOracleChange}
                  />
                  {errors.oracle && <span className="error-text">{errors.oracle}</span>}
                  <span className="help-text">Enter custom oracle contract address</span>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={handleClose}>
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={isPending || isConfirming}
              >
                {isPending || isConfirming ? (
                  <>
                    <div className="spinner spinner-sm"></div>
                    Processing...
                  </>
                ) : (
                  "Create"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <TxStatusModal
        isOpen={showTxModal}
        hash={hash}
        status={getTxStatus()}
        error={getTxError()}
        onClose={() => setShowTxModal(false)}
      />
    </>
  );
}
