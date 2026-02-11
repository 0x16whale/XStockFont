import { useState, useEffect, useCallback, useRef } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useBalance,
  usePublicClient,
  useReadContract,
} from "wagmi";
import { parseUnits, formatUnits } from "viem";
import {
  CONTRACTS,
  ABIS,
  formatAddress,
  formatNumber,
  formatPrice,
  formatStockState,
  formatStockType,
  getStatusBadgeClass,
  timeAgo,
  formatTimestamp,
} from "../config/contracts";
import { useStock } from "../hooks/useStocks";
import TxStatusModal from "../components/TxStatusModal";
import {
  encodeTouchPythOraclePrice,
  encodeSendRequest,
  getIssueOtherSelector,
  CHAINLINK_CONFIG,
} from "../utils/contractUtils";

// Pyth price feed IDs (Stable channel)
const PYTH_PRICE_FEED_IDS = {
  NVDA: "0xb1073854ed24cbc755dc527418f52b7d271f6cc967bbf8d8129112b18860a593",
  AAPL: "0x49f6b65cb1de6b10eaf75e7c03ca029c306d0357e91b5311b175084a5ad55688",
  TSLA: "0x0e9ec6a3d0cd494a4c6dc900c6a66a2ee1aa7c9d5c28dd47bb3423e0b8ff2b7c",
  MSFT: "0xd0ca44519e74c4007c1d87f5e3aafc4d15f0f3e57fb96c0f3c4e3e5b0e3d3f6a",
  GOOGL: "0xde65b5f3185e5b4d8b3c2e5c5e5d5e5f5a5b5c5d5e5f5a5b5c5d5e5f5a5b5c5d",
  AMZN: "0x5e5d5c5b5a595857565554535251504f4e4d4c4b4a494847464544434241403f",
};

// Fetch Pyth price update data from Hermes API
async function fetchPythUpdateData(priceFeedId) {
  const url = `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${priceFeedId}`;
  const response = await fetch(url);
  const data = await response.json();
  const updateData = data.binary.data.map((hex) =>
    hex.startsWith("0x") ? hex : "0x" + hex,
  );
  return { updateData, price: data.parsed[0].price.price };
}

export default function StockDetail({ stock, onBack }) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [activeTab, setActiveTab] = useState("mint");
  const [mintAmount, setMintAmount] = useState("");
  const [redeemAmount, setRedeemAmount] = useState("");
  const [showTxModal, setShowTxModal] = useState(false);
  const [txStatus, setTxStatus] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [txError, setTxError] = useState(null);

  // For Other stocks - waiting for oracle
  const [oracleRequestSent, setOracleRequestSent] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [canIssueOther, setCanIssueOther] = useState(false);

  const { stock: stockDetails } = useStock(stock?.id);
  const displayStock = stockDetails || stock;

  const { data: tokenBalance } = useBalance({
    address,
    token: displayStock?.stock,
    query: { enabled: !!address && !!displayStock?.stock },
  });

  const { data: usdcBalance } = useBalance({
    address,
    token: CONTRACTS.USDC,
    query: { enabled: !!address },
  });

  // Get oracle fee for Other stocks
  const { data: oracleFee } = useReadContract({
    address: CONTRACTS.StockMarket,
    abi: ABIS.StockMarket,
    functionName: "oracleFee",
    query: { enabled: displayStock?.stockType === 1 },
  });

  // Get signer nonce for Other stocks
  const { data: signerNonce, refetch: refetchNonce } = useReadContract({
    address: CONTRACTS.StockMarket,
    abi: ABIS.StockMarket,
    functionName: "signerNonce",
    args: address ? [address] : undefined,
    query: { enabled: !!address && displayStock?.stockType === 1 },
  });

  // Write contract hooks
  const { writeContract: approveCall, isPending: isApprove } =
    useWriteContract();
  const { writeContract: sendRequestCall, isPending: isSendingRequest } =
    useWriteContract();
  const { writeContract: issueMainCall, isPending: isIssuingMain } =
    useWriteContract();
  const { writeContract: issueOtherCall, isPending: isIssuingOther } =
    useWriteContract();
  const { writeContract: redeemCall, isPending: isRedeeming } =
    useWriteContract();

  // For approval pending state
  const [isApproving, setIsApproving] = useState(false);
  const pendingIssueParamsRef = useRef(null);
  const pendingIssueTypeRef = useRef(null); // 'main' or 'other'

  // Countdown timer for Other stocks
  useEffect(() => {
    if (oracleRequestSent && countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (oracleRequestSent && countdown === 0) {
      setCanIssueOther(true);
    }
  }, [oracleRequestSent, countdown]);

  // Handle send request for Other stocks (Step 1)
  const handleSendRequest = async () => {
    try {
      setTxStatus("pending");
      setTxHash(null);
      setTxError(null);
      setShowTxModal(true);

      const oracleData = encodeSendRequest(
        "", // encryptedSecretsUrls
        0, // donHostedSecretsSlotID
        0, // donHostedSecretsVersion
        [displayStock.symbol], // args - stock symbol
        [], // bytesArgs
        CHAINLINK_CONFIG.subscriptionId,
        CHAINLINK_CONFIG.gasLimit,
        CHAINLINK_CONFIG.donID,
      );

      sendRequestCall(
        {
          address: CONTRACTS.StockMarket,
          abi: ABIS.StockMarket,
          functionName: "sendRequest",
          args: [false, BigInt(displayStock.id), 0n, oracleData],
          value: oracleFee,
        },
        {
          onSuccess: (hash) => {
            setTxHash(hash);
            setTxStatus("confirming");
            setOracleRequestSent(true);
            setCountdown(30);
          },
          onError: (error) => {
            setTxError(error.message);
            setTxStatus("error");
          },
        },
      );
    } catch (err) {
      setTxError(err.message);
      setTxStatus("error");
      setShowTxModal(true);
    }
  };

  // Check and perform approval if needed, returns true if approval is needed and initiated
  const checkApprove = async (tokenAddress, tokenOwner, spender, value) => {
    try {
      const allowance = await publicClient.readContract({
        address: tokenAddress,
        abi: ABIS.ERC20,
        functionName: "allowance",
        args: [tokenOwner, spender],
      });
      if (allowance < value) {
        // Need approval - initiate it and return true to indicate caller should wait
        approveCall(
          {
            address: tokenAddress,
            abi: ABIS.ERC20,
            functionName: "approve",
            args: [spender, value],
          },
          {
            onSuccess: (hash) => {
              setTxHash(hash);
              setTxStatus("confirming");
              setIsApproving(true);
              // Wait for approval to be confirmed, then proceed with issue
              publicClient
                .waitForTransactionReceipt({ hash })
                .then((receipt) => {
                  if (receipt.status === "success") {
                    setIsApproving(false);
                    setTxStatus(null);
                    setTxHash(null);
                    // Continue with pending issue (use ref to get latest value)
                    if (
                      pendingIssueTypeRef.current === "main" &&
                      pendingIssueParamsRef.current
                    ) {
                      executeIssueMain(pendingIssueParamsRef.current);
                    } else if (
                      pendingIssueTypeRef.current === "other" &&
                      pendingIssueParamsRef.current
                    ) {
                      executeIssueOther(pendingIssueParamsRef.current);
                    }
                  } else {
                    setTxStatus("error");
                    setTxError("Approval transaction failed");
                    setIsApproving(false);
                    pendingIssueParamsRef.current = null;
                    pendingIssueTypeRef.current = null;
                  }
                });
            },
            onError: (error) => {
              setTxError(error.message);
              setTxStatus("error");
              setIsApproving(false);
              pendingIssueParamsRef.current = null;
              pendingIssueTypeRef.current = null;
            },
          },
        );
        return true; // Approval needed and initiated
      }
      return false; // No approval needed
    } catch (e) {
      setTxError(e.message);
      setTxStatus("error");
      return false;
    }
  };

  // Execute Main stock issuance after approval check
  const executeIssueMain = async (params) => {
    const { value, oracleData, pythFee } = params;

    issueMainCall(
      {
        address: CONTRACTS.StockMarket,
        abi: ABIS.StockMarket,
        functionName: "issue",
        args: [BigInt(displayStock.id), value, oracleData],
        value: pythFee,
      },
      {
        onSuccess: (hash) => {
          setTxHash(hash);
          setTxStatus("confirming");
          pendingIssueParamsRef.current = null;
          pendingIssueTypeRef.current = null;
        },
        onError: (error) => {
          setTxError(error.message);
          setTxStatus("error");
          pendingIssueParamsRef.current = null;
          pendingIssueTypeRef.current = null;
        },
      },
    );
  };

  // Handle Main stock issuance
  const handleIssueMain = async () => {
    try {
      setTxStatus("pending");
      setTxHash(null);
      setTxError(null);
      setShowTxModal(true);

      // Get Pyth price feed ID based on symbol
      const priceFeedId =
        PYTH_PRICE_FEED_IDS[displayStock.symbol.toUpperCase()];
      if (!priceFeedId) {
        throw new Error(`No Pyth price feed found for ${displayStock.symbol}`);
      }

      // Fetch Pyth update data
      const { updateData } = await fetchPythUpdateData(priceFeedId);

      const MAX_AGE = 86400 * 7;

      // Encode oracle call data
      const oracleData = encodeTouchPythOraclePrice(
        priceFeedId,
        updateData,
        86400,
      );

      // Get Pyth fee
      const pythFee = await publicClient.readContract({
        address: CONTRACTS.StockStreamsOracle,
        abi: ABIS.StockStreamsOracle,
        functionName: "getUpdatePriceFee",
        args: [updateData],
      });

      const collateralDecimals = await publicClient.readContract({
        address: displayStock.collateral,
        abi: ABIS.ERC20,
        functionName: "decimals",
        args: [],
      });
      console.log("collateralDecimals:", collateralDecimals);

      const value = parseUnits(mintAmount, collateralDecimals);

      // Check if approval is needed
      const approvalNeeded = await checkApprove(
        displayStock.collateral,
        address,
        CONTRACTS.StockMarket,
        value,
      );

      if (approvalNeeded) {
        // Store params for later execution after approval completes
        pendingIssueParamsRef.current = { value, oracleData, pythFee };
        pendingIssueTypeRef.current = "main";
        return; // Exit here, will continue after approval confirms
      }

      // No approval needed, proceed directly
      await executeIssueMain({ value, oracleData, pythFee });
    } catch (err) {
      setTxError(err.message);
      setTxStatus("error");
      setShowTxModal(true);
    }
  };

  // Execute Other stock issuance after approval check
  const executeIssueOther = async (params) => {
    issueOtherCall(
      {
        address: CONTRACTS.StockMarket,
        abi: ABIS.StockMarket,
        functionName: "issueOther",
        args: [params],
      },
      {
        onSuccess: (hash) => {
          setTxHash(hash);
          setTxStatus("confirming");
          refetchNonce(); // Refresh nonce after use
          pendingIssueParamsRef.current = null;
          pendingIssueTypeRef.current = null;
        },
        onError: (error) => {
          setTxError(error.message);
          setTxStatus("error");
          pendingIssueParamsRef.current = null;
          pendingIssueTypeRef.current = null;
        },
      },
    );
  };

  // Handle Other stock issuance with signature
  const handleIssueOther = async () => {
    try {
      setTxStatus("pending");
      setTxHash(null);
      setTxError(null);
      setShowTxModal(true);

      // Fetch latest price from Finnhub or use oracle price
      const timestamp = Math.floor(Date.now() / 1000);
      const deadline = timestamp + 10000; // 10 seconds from now

      // Get pack data for signing
      const functionSelector = getIssueOtherSelector();

      const packData = await publicClient.readContract({
        address: CONTRACTS.StockMarket,
        abi: ABIS.StockMarket,
        functionName: "packData",
        args: [
          BigInt(displayStock.id),
          BigInt(deadline),
          BigInt(displayStock.price || 0),
          functionSelector,
          address,
          signerNonce,
        ],
      });

      // Request signature from user
      let signature;
      try {
        signature = await publicClient.request({
          method: "personal_sign",
          params: [packData, address],
        });
      } catch (signErr) {
        throw new Error("Signature rejected by user");
      }

      const collateralDecimals = await publicClient.readContract({
        address: displayStock.collateral,
        abi: ABIS.ERC20,
        functionName: "decimals",
        args: [],
      });
      console.log("collateralDecimals:", collateralDecimals);

      const value = parseUnits(mintAmount, collateralDecimals);

      // Check if approval is needed
      const approvalNeeded = await checkApprove(
        displayStock.collateral,
        address,
        CONTRACTS.StockMarket,
        value,
      );

      const params = {
        spot: 1000, // 10% slippage
        id: BigInt(displayStock.id),
        price: BigInt(displayStock.price || 0),
        deadline: BigInt(deadline),
        collateralAmount: value,
        signers: [address],
        signatures: [signature],
      };

      if (approvalNeeded) {
        // Store params for later execution after approval completes
        pendingIssueParamsRef.current = params;
        pendingIssueTypeRef.current = "other";
        return; // Exit here, will continue after approval confirms
      }

      // No approval needed, proceed directly
      await executeIssueOther(params);
    } catch (err) {
      setTxError(err.message);
      setTxStatus("error");
      setShowTxModal(true);
    }
  };

  // Handle redeem using sendRequest
  const handleRedeem = async () => {
    setTxStatus("pending");
    setTxHash(null);
    setTxError(null);
    setShowTxModal(true);

    try {
      // Encode oracle data for redeem
      const oracleData = encodeSendRequest(
        "", // encryptedSecretsUrls
        0, // donHostedSecretsSlotID
        0, // donHostedSecretsVersion
        [displayStock.symbol], // args - stock symbol
        [], // bytesArgs
        CHAINLINK_CONFIG.subscriptionId,
        CHAINLINK_CONFIG.gasLimit,
        CHAINLINK_CONFIG.donID,
      );

      redeemCall(
        {
          address: CONTRACTS.StockMarket,
          abi: ABIS.StockMarket,
          functionName: "sendRequest",
          args: [
            true, // isRedeemStock
            BigInt(displayStock.id),
            parseUnits(redeemAmount, displayStock.decimals || 18),
            oracleData,
          ],
          value: oracleFee,
        },
        {
          onSuccess: (hash) => {
            setTxHash(hash);
            setTxStatus("confirming");
          },
          onError: (error) => {
            setTxError(error.message);
            setTxStatus("error");
          },
        },
      );
    } catch (err) {
      setTxError(err.message);
      setTxStatus("error");
      setShowTxModal(true);
    }
  };

  const handleTxClose = () => {
    setShowTxModal(false);
    // Reset states after modal closes
    setTimeout(() => {
      setTxStatus(null);
      setTxHash(null);
      setTxError(null);
    }, 300);
  };

  // Check if transaction is confirming/success
  useEffect(() => {
    if (txHash && txStatus === "confirming") {
      const checkReceipt = async () => {
        try {
          const receipt = await publicClient.waitForTransactionReceipt({
            hash: txHash,
          });
          if (receipt.status === "success") {
            setTxStatus("success");
          } else {
            setTxStatus("error");
            setTxError("Transaction failed on chain");
          }
        } catch (err) {
          // Still waiting or error
        }
      };
      checkReceipt();
    }
  }, [txHash, txStatus, publicClient]);

  const isMain = displayStock?.stockType === 1;

  const estimatedTokens =
    mintAmount && displayStock?.price
      ? (Number(mintAmount) / (Number(displayStock.price) / 1e18)).toFixed(6)
      : "0";

  const estimatedUsdc =
    redeemAmount && displayStock?.price
      ? (Number(redeemAmount) * (Number(displayStock.price) / 1e18)).toFixed(2)
      : "0";

  return (
    <>
      <div className="stock-detail-page">
        <button className="back-button" onClick={onBack}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back
        </button>

        <div className="detail-grid">
          <div className="detail-card info-card">
            <div className="detail-header">
              <div className="detail-stock-icon">
                {displayStock?.symbol?.slice(0, 2)?.toUpperCase() || "ST"}
              </div>
              <div className="detail-title">
                <h1>{displayStock?.name || "Loading..."}</h1>
                <div className="detail-meta">
                  <span className="detail-symbol">{displayStock?.symbol}</span>
                  <span
                    className={`badge ${getStatusBadgeClass(displayStock?.state)}`}
                  >
                    {formatStockState(displayStock?.state)}
                  </span>
                  <span className="badge badge-secondary">
                    {formatStockType(displayStock?.stockType)}
                  </span>
                </div>
              </div>
            </div>

            <div className="detail-stats">
              <div className="stat-item">
                <span className="stat-label">Price</span>
                <span className="stat-value price">
                  ${formatPrice(displayStock?.price)}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Supply</span>
                <span className="stat-value">
                  {formatNumber(displayStock?.totalSupply)}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Reserve</span>
                <span className="stat-value">
                  ${formatNumber(displayStock?.reserve)}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Updated (Shanghai)</span>
                <span className="stat-value">
                  {formatTimestamp(displayStock?.lastUpdateTime)}
                </span>
              </div>
            </div>

            <div className="detail-contracts">
              <div className="contract-item">
                <span className="contract-label">Token Contract</span>
                <span className="contract-value">
                  {formatAddress(displayStock?.stock)}
                </span>
              </div>
              <div className="contract-item">
                <span className="contract-label">Pool</span>
                <span className="contract-value">
                  {formatAddress(displayStock?.stockFundPool)}
                </span>
              </div>
              <div className="contract-item">
                <span className="contract-label">Curator</span>
                <span className="contract-value">
                  {formatAddress(displayStock?.curator)}
                </span>
              </div>
            </div>

            {displayStock?.describe && (
              <div className="detail-description">
                <h4>About</h4>
                <p>{displayStock.describe}</p>
              </div>
            )}
          </div>

          <div className="detail-card trading-card">
            <div className="trading-tabs">
              <button
                className={`trading-tab ${activeTab === "mint" ? "active" : ""}`}
                onClick={() => setActiveTab("mint")}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Mint
              </button>
              <button
                className={`trading-tab ${activeTab === "redeem" ? "active" : ""}`}
                onClick={() => setActiveTab("redeem")}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Redeem
              </button>
            </div>

            <div className="trading-content">
              {!isConnected ? (
                <div className="connect-prompt-small">
                  <p>Connect wallet to start trading</p>
                </div>
              ) : displayStock?.state !== 2 ? (
                <div className="not-approved-notice">
                  <div className="notice-icon">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>
                  <p>Stock under review, trading unavailable</p>
                </div>
              ) : (
                <>
                  {activeTab === "mint" && (
                    <div className="trading-form">
                      {!isMain && !canIssueOther && (
                        <div className="price-update-notice">
                          <div className="notice-icon">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <circle cx="12" cy="12" r="10" />
                              <line x1="12" y1="8" x2="12" y2="12" />
                              <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                          </div>
                          <div className="notice-content">
                            <h4>Oracle Update Required</h4>
                            <p>
                              Non-Main stocks require price update from
                              Chainlink before minting
                            </p>
                            {oracleRequestSent ? (
                              countdown > 0 ? (
                                <div className="countdown">
                                  Wait {countdown}s...
                                </div>
                              ) : (
                                <button
                                  className="btn btn-primary"
                                  onClick={() => setCanIssueOther(true)}
                                >
                                  Proceed to Mint
                                </button>
                              )
                            ) : (
                              <button
                                className="btn btn-primary"
                                onClick={handleSendRequest}
                                disabled={isSendingRequest}
                              >
                                {isSendingRequest && (
                                  <div className="spinner spinner-sm"></div>
                                )}
                                Send Oracle Request
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {(isMain || canIssueOther) && (
                        <>
                          <div className="balance-info">
                            <span>
                              Balance:{" "}
                              {formatNumber(usdcBalance?.formatted || "0")} USDC
                            </span>
                          </div>
                          <div className="form-group">
                            <label className="form-label">
                              Mint Amount (USDC)
                            </label>
                            <input
                              type="number"
                              className="form-input"
                              placeholder="0.00"
                              value={mintAmount}
                              onChange={(e) => setMintAmount(e.target.value)}
                            />
                          </div>
                          <div className="estimated-receive">
                            <span>
                              You will receive: {formatNumber(estimatedTokens)}{" "}
                              {displayStock?.symbol}
                            </span>
                          </div>
                          <button
                            className="btn btn-accent btn-lg"
                            style={{ width: "100%" }}
                            onClick={
                              isMain ? handleIssueMain : handleIssueOther
                            }
                            disabled={
                              !mintAmount ||
                              isIssuingMain ||
                              isIssuingOther ||
                              isApproving ||
                              isApprove
                            }
                          >
                            {(isIssuingMain ||
                              isIssuingOther ||
                              isApproving ||
                              isApprove) && (
                              <div className="spinner spinner-sm"></div>
                            )}
                            {isApproving || isApprove
                              ? "Approving..."
                              : isMain
                                ? "Mint"
                                : "Mint (Signature Required)"}
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {activeTab === "redeem" && (
                    <div className="trading-form">
                      <div className="balance-info">
                        <span>
                          Balance:{" "}
                          {formatNumber(tokenBalance?.formatted || "0")}{" "}
                          {displayStock?.symbol}
                        </span>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Redeem Amount</label>
                        <input
                          type="number"
                          className="form-input"
                          placeholder="0.00"
                          value={redeemAmount}
                          onChange={(e) => setRedeemAmount(e.target.value)}
                        />
                      </div>
                      <div className="estimated-receive">
                        <span>
                          You will receive: ${formatNumber(estimatedUsdc)} USDC
                        </span>
                      </div>
                      <button
                        className="btn btn-primary btn-lg"
                        style={{ width: "100%" }}
                        onClick={handleRedeem}
                        disabled={!redeemAmount || isRedeeming}
                      >
                        {isRedeeming && (
                          <div className="spinner spinner-sm"></div>
                        )}
                        Redeem
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <TxStatusModal
        isOpen={showTxModal}
        hash={txHash}
        status={txStatus}
        error={txError}
        onClose={handleTxClose}
      />
    </>
  );
}
