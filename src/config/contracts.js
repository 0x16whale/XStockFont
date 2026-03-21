import deployedAddress from "../../deployedAddress.json";
import StockRegistryABI from "../abis/StockRegistry.json";
import StockMarketABI from "../abis/StockMarket.json";
import StockFunctionOracleABI from "../abis/StockFunctionOracle.json";
import StockStreamsOracleABI from "../abis/StockStreamsOracle.json";
import ERC20ABI from "../abis/ERC20.json";
import ValidatorABI from "../abis/Validator.json";
import ManagementABI from "../abis/Management.json";
import {
  TARGET_CHAIN_ID,
  TARGET_CHAIN_NAME,
  NATIVE_CURRENCY,
  EXPLORER_URL,
  CONTRACTS,
  CHAINLINK_CONFIG,
  getExplorerAddressUrl,
  getExplorerTxUrl,
} from "./networks";

// Re-export constants
export {
  TARGET_CHAIN_ID as CHAIN_ID,
  TARGET_CHAIN_NAME as CHAIN_NAME,
  NATIVE_CURRENCY,
  EXPLORER_URL,
  CONTRACTS,
  CHAINLINK_CONFIG,
  getExplorerAddressUrl,
  getExplorerTxUrl,
};

// Contract ABIs
export const ABIS = {
  StockRegistry: StockRegistryABI.abi,
  StockMarket: StockMarketABI.abi,
  StockFunctionsOracle: StockFunctionOracleABI.abi,
  StockStreamsOracle: StockStreamsOracleABI.abi,
  ERC20: ERC20ABI.abi,
  Validator: ValidatorABI.abi,
  Management: ManagementABI.abi,
};

// Legacy: DON_ID for Base Mainnet
export const DON_ID = CHAINLINK_CONFIG.donID;

// Stock State Enum
export const StockState = {
  0: "Invalid",
  1: "Review",
  2: "Approved",
  3: "Paused",
};

// ChangeWay Enum (for Management.sendChangeRequest)
export const ChangeWay = {
  0: "ChangeName",
  1: "ChangeSymbol",
  2: "ChangeDescribe",
  3: "ChangeProof",
  4: "ChangePriceURI",
  5: "ChangeOracle",
};

export const formatChangeWay = (way) => {
  return ChangeWay[way] || "Unknown";
};

// Stock Type Enum
export const StockType = {
  0: "Other",
  1: "Main",
};

export const formatStockState = (state) => {
  return StockState[state] || "Unknown";
};

export const formatStockType = (type) => {
  return StockType[type] || "Unknown";
};

export const isMainStock = (type) => {
  return Number(type) === 1;
};

export const formatAddress = (address, start = 6, end = 4) => {
  if (!address) return "";
  return `${address.slice(0, start)}...${address.slice(-end)}`;
};

export const formatNumber = (num, decimals = 2) => {
  if (!num) return "0";
  const numStr = typeof num === "string" ? num : num.toString();
  const parts = numStr.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (parts[1]) {
    parts[1] = parts[1].slice(0, decimals);
  }
  return parts.join(".");
};

export const formatPrice = (price) => {
  if (!price) return "0.00";
  const priceNum = Number(price) / 1e18;
  return priceNum.toFixed(4);
};

// Format raw price without scaling (for API-fetched prices)
export const formatRawPrice = (price) => {
  if (!price) return "0.00";
  const priceNum = Number(price);
  return priceNum.toFixed(4);
};

export const formatTimestamp = (timestamp) => {
  if (!timestamp || timestamp === 0) return "0";
  const date = new Date(Number(timestamp) * 1000);
  // Convert to Shanghai time (UTC+8)
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Shanghai",
  });
};

export const timeAgo = (timestamp) => {
  if (!timestamp) return "-";
  const seconds = Math.floor((Date.now() - Number(timestamp) * 1000) / 1000);

  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatTimestamp(timestamp);
};

export const calculateTokenAmount = (
  collateralAmount,
  price,
  collateralDecimals = 6,
) => {
  if (!collateralAmount || !price) return "0";
  const collateral =
    Number(collateralAmount) / Math.pow(10, collateralDecimals);
  const priceNum = Number(price) / 1e8;
  return (collateral / priceNum).toFixed(6);
};

export const getStatusBadgeClass = (state) => {
  const stateNum = Number(state);
  switch (stateNum) {
    case 0:
      return "badge-draft";
    case 1:
      return "badge-pending";
    case 2:
      return "badge-approved";
    case 3:
      return "badge-rejected";
    default:
      return "badge-draft";
  }
};
