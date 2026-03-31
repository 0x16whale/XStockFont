import { useState, useEffect, useCallback } from "react";
import { usePublicClient, useChainId, useSwitchChain } from "wagmi";
import { base } from "viem/chains";
import { CONTRACTS, ABIS, CHAIN_ID, CHAIN_NAME } from "../config/contracts";
import { isBaseMainnet } from "../config/networks";

export function useStocks() {
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitchingNetwork } = useSwitchChain();
  const [stocks, setStocks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoSwitchAttempted, setAutoSwitchAttempted] = useState(false);

  const fetchStocks = useCallback(async () => {
    if (!publicClient) {
      setIsLoading(false);
      return;
    }

    // Wait for chainId to be available
    if (chainId === undefined) {
      return;
    }

    // Check if on Base Mainnet
    if (!isBaseMainnet(chainId)) {
      // Auto-switch to Base Mainnet
      if (!autoSwitchAttempted && !isSwitchingNetwork) {
        console.log(`Auto-switching from chain ${chainId} to ${CHAIN_NAME}`);
        setAutoSwitchAttempted(true);
        try {
          await switchChain({ chainId: base.id });
          return;
        } catch (err) {
          console.error("Auto-switch failed:", err);
          setError(`Please switch to ${CHAIN_NAME}`);
        }
      } else if (isSwitchingNetwork) {
        setError(`Switching to ${CHAIN_NAME}...`);
      } else {
        setError(`Please switch to ${CHAIN_NAME}`);
      }
      setIsLoading(false);
      return;
    }

    // Reset auto-switch flag when on correct network
    if (autoSwitchAttempted) {
      setAutoSwitchAttempted(false);
    }

    try {
      setIsLoading(true);
      setError(null);

      const stockId = await publicClient.readContract({
        address: CONTRACTS.StockRegistry,
        abi: ABIS.StockRegistry,
        functionName: "stockId",
      });

      const stockCount = Number(stockId);
      const stockList = [];

      // Batch 1: Fetch all stock info via multicall
      const stockInfoCalls = [];
      for (let i = 0; i < stockCount; i++) {
        stockInfoCalls.push({
          address: CONTRACTS.StockRegistry,
          abi: ABIS.StockRegistry,
          functionName: "getStockInfo",
          args: [BigInt(i)],
        });
      }

      const stockInfoResults = stockCount > 0
        ? await publicClient.multicall({
            contracts: stockInfoCalls,
            allowFailure: true,
          })
        : [];

      // Batch 2: Fetch supplementary data for all stocks via multicall
      const supplementaryCalls = [];
      for (let i = 0; i < stockCount; i++) {
        const info = stockInfoResults[i];
        if (info.status === "success" && info.result) {
          supplementaryCalls.push(
            { address: info.result.stock, abi: ABIS.ERC20, functionName: "totalSupply" },
            { address: info.result.stock, abi: ABIS.ERC20, functionName: "decimals" },
            { address: CONTRACTS.StockMarket, abi: ABIS.StockMarket, functionName: "getStockOracleInfo", args: [i] },
            { address: CONTRACTS.Validator, abi: ABIS.Validator, functionName: "getReserveInfo", args: [BigInt(i)] },
            { address: info.result.collateral, abi: ABIS.ERC20, functionName: "decimals" }
          );
        }
      }

      const supplementaryResults = supplementaryCalls.length > 0
        ? await publicClient.multicall({
            contracts: supplementaryCalls,
            allowFailure: true,
          })
        : [];

      let callIndex = 0;
      for (let i = 0; i < stockCount; i++) {
        const info = stockInfoResults[i];
        if (info.status !== "success" || !info.result) {
          console.error(`Failed to load stock ${i}:`, info.error);
          continue;
        }

        const stockInfo = info.result;

        let totalSupply = "0";
        let decimals = 18;
        let price = "0";
        let lastUpdateTime = 0;
        let reserve = "0";
        let reserveState = 0;
        let reserveUpdateTime = 0;

        const totalSupplyRes = supplementaryResults[callIndex++];
        const decimalsRes = supplementaryResults[callIndex++];
        const priceInfoRes = supplementaryResults[callIndex++];
        const reserveInfoRes = supplementaryResults[callIndex++];
        const collateralDecimalsRes = supplementaryResults[callIndex++];

        if (totalSupplyRes?.status === "success" && decimalsRes?.status === "success") {
          totalSupply = (Number(totalSupplyRes.result) / Math.pow(10, Number(decimalsRes.result))).toString();
          decimals = Number(decimalsRes.result);
        } else {
          console.warn(`Failed to get token info for stock ${i}`);
        }

        if (priceInfoRes?.status === "success") {
          price = priceInfoRes.result.price.toString();
          lastUpdateTime = Number(priceInfoRes.result.lastUpdateTime);
        } else {
          console.warn(`Failed to get price from contract for stock ${i}`);
        }

        if (reserveInfoRes?.status === "success" && collateralDecimalsRes?.status === "success") {
          reserveState = Number(reserveInfoRes.result.state);
          reserveUpdateTime = Number(reserveInfoRes.result.updateTime);
          reserve = (Number(reserveInfoRes.result.latestReserve) / Math.pow(10, Number(collateralDecimalsRes.result))).toString();
        } else {
          console.warn(`Failed to get reserve for stock ${i}`);
        }

        stockList.push({
          id: i,
          name: stockInfo.name,
          symbol: stockInfo.symbol,
          state: Number(stockInfo.state),
          stockType: Number(stockInfo.stockType),
          stock: stockInfo.stock,
          stockFundPool: stockInfo.stockFundPool,
          collateral: stockInfo.collateral,
          oracle: stockInfo.oracle,
          curator: stockInfo.curator,
          proof: stockInfo.proof,
          priceUri: stockInfo.priceUri,
          describe: stockInfo.describe,
          totalSupply,
          decimals,
          price,
          reserve,
          reserveState,
          reserveUpdateTime,
          lastUpdateTime,
        });
      }

      stockList.sort((a, b) => b.id - a.id);
      setStocks(stockList);
    } catch (err) {
      console.error("Failed to fetch stocks:", err);
      setError(err.message || "Failed to fetch stocks");
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, chainId, switchChain, autoSwitchAttempted, isSwitchingNetwork]);

  useEffect(() => {
    fetchStocks();
  }, [fetchStocks]);

  // Reset auto-switch flag when chain changes to correct network
  useEffect(() => {
    if (chainId === base.id && autoSwitchAttempted) {
      setAutoSwitchAttempted(false);
    }
  }, [chainId, autoSwitchAttempted]);

  return { stocks, isLoading, error, refetch: fetchStocks, isSwitchingNetwork };
}

export function useStock(stockId) {
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitchingNetwork } = useSwitchChain();
  const [stock, setStock] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoSwitchAttempted, setAutoSwitchAttempted] = useState(false);

  useEffect(() => {
    const fetchStock = async () => {
      if (!publicClient || stockId === undefined || stockId === null) {
        setIsLoading(false);
        return;
      }

      // Wait for chainId to be available
      if (chainId === undefined) {
        return;
      }

      // Check if on Base Mainnet
      if (!isBaseMainnet(chainId)) {
        // Auto-switch to Base Mainnet
        if (!autoSwitchAttempted && !isSwitchingNetwork) {
          console.log(`Auto-switching from chain ${chainId} to ${CHAIN_NAME}`);
          setAutoSwitchAttempted(true);
          try {
            await switchChain({ chainId: base.id });
            return;
          } catch (err) {
            console.error("Auto-switch failed:", err);
            setError(`Please switch to ${CHAIN_NAME}`);
          }
        } else if (isSwitchingNetwork) {
          setError(`Switching to ${CHAIN_NAME}...`);
        } else {
          setError(`Please switch to ${CHAIN_NAME}`);
        }
        setIsLoading(false);
        return;
      }

      // Reset auto-switch flag when on correct network
      if (autoSwitchAttempted) {
        setAutoSwitchAttempted(false);
      }

      try {
        setIsLoading(true);
        setError(null);

        const stockInfoRes = await publicClient.multicall({
          contracts: [
            {
              address: CONTRACTS.StockRegistry,
              abi: ABIS.StockRegistry,
              functionName: "getStockInfo",
              args: [BigInt(stockId)],
            },
          ],
          allowFailure: true,
        });

        if (stockInfoRes[0].status !== "success") {
          throw new Error("Failed to get stock info");
        }

        const stockInfo = stockInfoRes[0].result;

        const supplementaryRes = await publicClient.multicall({
          contracts: [
            { address: stockInfo.stock, abi: ABIS.ERC20, functionName: "totalSupply" },
            { address: stockInfo.stock, abi: ABIS.ERC20, functionName: "decimals" },
            { address: CONTRACTS.StockMarket, abi: ABIS.StockMarket, functionName: "getStockOracleInfo", args: [stockId] },
            { address: CONTRACTS.Validator, abi: ABIS.Validator, functionName: "getReserveInfo", args: [BigInt(stockId)] },
            { address: stockInfo.collateral, abi: ABIS.ERC20, functionName: "decimals" },
          ],
          allowFailure: true,
        });

        let totalSupply = "0";
        let decimals = 18;
        if (supplementaryRes[0].status === "success" && supplementaryRes[1].status === "success") {
          totalSupply = (Number(supplementaryRes[0].result) / Math.pow(10, Number(supplementaryRes[1].result))).toString();
          decimals = Number(supplementaryRes[1].result);
        } else {
          console.warn("Failed to get token info");
        }

        let price = "0";
        let lastUpdateTime = 0;
        if (supplementaryRes[2].status === "success") {
          price = supplementaryRes[2].result.price.toString();
          lastUpdateTime = Number(supplementaryRes[2].result.lastUpdateTime);
        } else {
          console.warn(`Failed to get price from contract for stock ${stockId}`);
        }

        let reserve = "0";
        let reserveState = 0;
        let reserveUpdateTime = 0;
        if (supplementaryRes[3].status === "success" && supplementaryRes[4].status === "success") {
          reserveState = Number(supplementaryRes[3].result.state);
          reserveUpdateTime = Number(supplementaryRes[3].result.updateTime);
          reserve = (Number(supplementaryRes[3].result.latestReserve) / Math.pow(10, Number(supplementaryRes[4].result))).toString();
        } else {
          console.warn("Failed to get reserve");
        }

        setStock({
          id: stockId,
          name: stockInfo.name,
          symbol: stockInfo.symbol,
          state: Number(stockInfo.state),
          stockType: Number(stockInfo.stockType),
          stock: stockInfo.stock,
          stockFundPool: stockInfo.stockFundPool,
          collateral: stockInfo.collateral,
          oracle: stockInfo.oracle,
          curator: stockInfo.curator,
          proof: stockInfo.proof,
          priceUri: stockInfo.priceUri,
          describe: stockInfo.describe,
          totalSupply,
          decimals,
          price,
          reserve,
          reserveState,
          reserveUpdateTime,
          lastUpdateTime,
        });
      } catch (err) {
        console.error("Failed to fetch stock:", err);
        setError(err.message || "Failed to fetch stock");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStock();
  }, [publicClient, stockId, chainId, switchChain, autoSwitchAttempted, isSwitchingNetwork]);

  // Reset auto-switch flag when chain changes to correct network
  useEffect(() => {
    if (chainId === base.id && autoSwitchAttempted) {
      setAutoSwitchAttempted(false);
    }
  }, [chainId, autoSwitchAttempted]);

  return { stock, isLoading, error, isSwitchingNetwork };
}
