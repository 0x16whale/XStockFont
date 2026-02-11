import { encodeFunctionData, toFunctionSelector } from "viem";
import { ABIS } from "../config/contracts";

// Encode touchPythOraclePrice for Main stocks
export function encodeTouchPythOraclePrice(priceFeedId, priceUpdate, age) {
  try {
    const data = encodeFunctionData({
      abi: ABIS.StockStreamsOracle,
      functionName: "touchPythOraclePrice",
      args: [priceFeedId, priceUpdate, age],
    });
    return data;
  } catch (e) {
    console.error("Encode touchPythOraclePrice error:", e);
    return "0x";
  }
}

// Encode sendRequest for Chainlink Functions
export function encodeSendRequest(
  encryptedSecretsUrls,
  donHostedSecretsSlotID,
  donHostedSecretsVersion,
  args,
  bytesArgs,
  subscriptionId,
  gasLimit,
  donID
) {
  try {
    const data = encodeFunctionData({
      abi: ABIS.StockFunctionsOracle,
      functionName: "sendRequest",
      args: [
        encryptedSecretsUrls,
        donHostedSecretsSlotID,
        donHostedSecretsVersion,
        args,
        bytesArgs,
        subscriptionId,
        gasLimit,
        donID,
      ],
    });
    return data;
  } catch (e) {
    console.error("Encode sendRequest error:", e);
    return "0x";
  }
}

// Get issueOther function selector
export function getIssueOtherSelector() {
  return toFunctionSelector(
    "function issueOther((uint16 spot,uint64 id,uint64 deadline,uint128 price,uint128 collateralAmount,address[] signers,bytes[] signatures))"
  );
}

// Format price to BigInt with 18 decimals
export function toBigIntWithDecimals(amount, decimals = 18) {
  const amountStr = amount.toString();
  const [integerPart, fractionalPart = ""] = amountStr.split(".");
  const paddedFraction = fractionalPart.padEnd(decimals, "0").slice(0, decimals);
  const totalStr = integerPart + paddedFraction;
  return BigInt(totalStr);
}

// Stock price feed IDs for Pyth (Stable channel)
export const PYTH_PRICE_FEED_IDS = {
  AVAX: "0x93da3352f9f1d105fdfe4971cfa80e9dd777bfc5d0f683ebb6e1294b92137bb7",
  NVDA: "0xb1073854ed24cbc755dc527418f52b7d271f6cc967bbf8d8129112b18860a593",
  AAPL: "0x49f6b65cb1de6b10eaf75e7c03ca029c306d0357e91b5311b175084a5ad55688",
  TSLA: "0x0e9ec6a3d0cd494a4c6dc900c6a66a2ee1aa7c9d5c28dd47bb3423e0b8ff2b7c",
  MSFT: "0xd0ca44519e74c4007c1d87f5e3aafc4d15f0f3e57fb96c0f3c4e3e5b0e3d3f6a",
  GOOGL: "0xde65b5f3185e5b4d8b3c2e5c5e5d5e5f5a5b5c5d5e5f5a5b5c5d5e5f5a5b5c5d",
  AMZN: "0x5e5d5c5b5a595857565554535251504f4e4d4c4b4a494847464544434241403f",
};

// Chainlink Functions config
export const CHAINLINK_CONFIG = {
  subscriptionId: 15766n,
  gasLimit: 300000,
  donID: "0x66756e2d6176616c616e6368652d66756a692d31000000000000000000000000",
};
