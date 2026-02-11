import deployedAddress from "../../deployedAddress.json";
import StockRegistryABI from "../abis/StockRegistry.json";
import StockMarketABI from "../abis/StockMarket.json";
import StockFunctionOracleABI from "../abis/StockFunctionOracle.json";
import StockStreamsOracleABI from "../abis/StockStreamsOracle.json";
import ERC20ABI from "../abis/ERC20.json";

// Fuji Testnet Chain ID
export const FUJI_CHAIN_ID = 43113;

// Contract Addresses
export const CONTRACTS = {
  StockRegistry: deployedAddress[FUJI_CHAIN_ID].StockRegistry,
  StockMarket: deployedAddress[FUJI_CHAIN_ID].StockMarket,
  StockFunctionsOracle: deployedAddress[FUJI_CHAIN_ID].StockFunctionsOracle,
  StockStreamsOracle: deployedAddress[FUJI_CHAIN_ID].StockStreamsOracle,
  USDC: deployedAddress[FUJI_CHAIN_ID].USDC,
};

// Contract ABIs
export const ABIS = {
  StockRegistry: StockRegistryABI.abi,
  StockMarket: StockMarketABI.abi,
  StockFunctionsOracle: StockFunctionOracleABI.abi,
  StockStreamsOracle: StockStreamsOracleABI.abi,
  ERC20: ERC20ABI.abi,
};

// Stock State Enum
export const StockState = {
  0: "Invalid",
  1: "Review",
  2: "Approved",
  3: "Paused",
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

export const formatTimestamp = (timestamp) => {
  if (!timestamp) return "-";
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
