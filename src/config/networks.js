import { base } from "viem/chains";
import deployedAddress from "../../deployedAddress.json";

// Base Mainnet only - hardcoded configuration
export const TARGET_CHAIN = base;
export const TARGET_CHAIN_ID = 8453;
export const TARGET_CHAIN_NAME = "Base Mainnet";
export const NATIVE_CURRENCY = "ETH";
export const EXPLORER_URL = "https://basescan.org";

// For compatibility with PrivyProvider
export const SUPPORTED_CHAINS = [base];
export const DEFAULT_CHAIN = base;

// Hardcoded contract addresses from deployedAddress.json
const baseConfig = deployedAddress[TARGET_CHAIN_ID] || {};
export const CONTRACTS = {
  StockRegistry: baseConfig.StockRegistry,
  StockMarket: baseConfig.StockMarket,
  StockFunctionsOracle: baseConfig.StockFunctionsOracle,
  StockStreamsOracle: baseConfig.StockStreamsOracle,
  USDC: baseConfig.USDC,
  Validator: baseConfig.Validator,
  Management: baseConfig.Management,
};

// Check if current chain is Base Mainnet
export const isBaseMainnet = (chainId) => chainId === TARGET_CHAIN_ID;

// Explorer URLs
export const getExplorerAddressUrl = (address) => {
  if (!address) return "#";
  return `${EXPLORER_URL}/address/${address}`;
};

export const getExplorerTxUrl = (hash) => {
  if (!hash) return "#";
  return `${EXPLORER_URL}/tx/${hash}`;
};

// Chainlink Functions config for Base Mainnet
export const CHAINLINK_CONFIG = {
  subscriptionId: 136n,
  gasLimit: 300000,
  donID: "0x66756e2d626173652d6d61696e6e65742d310000000000000000000000000000",
  oracleFee: parseUnits("0.001", 18),
  updateFee: 0n,
};

// Helper function for parseUnits
function parseUnits(value, decimals) {
  const valueStr = value.toString();
  const [integerPart, fractionalPart = ""] = valueStr.split(".");
  const paddedFraction = fractionalPart.padEnd(decimals, "0").slice(0, decimals);
  const totalStr = integerPart + paddedFraction;
  return BigInt(totalStr);
}
