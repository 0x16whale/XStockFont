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

      for (let i = 0; i < stockCount; i++) {
        try {
          const stockInfo = await publicClient.readContract({
            address: CONTRACTS.StockRegistry,
            abi: ABIS.StockRegistry,
            functionName: "getStockInfo",
            args: [BigInt(i)],
          });

          // Get token decimals and total supply
          let totalSupply = "0";
          let decimals = 18;
          try {
            const [supply, tokenDecimals] = await Promise.all([
              publicClient.readContract({
                address: stockInfo.stock,
                abi: ABIS.ERC20,
                functionName: "totalSupply",
              }),
              publicClient.readContract({
                address: stockInfo.stock,
                abi: ABIS.ERC20,
                functionName: "decimals",
              }),
            ]);
            totalSupply = (
              Number(supply) / Math.pow(10, tokenDecimals)
            ).toString();
            decimals = Number(tokenDecimals);
          } catch (err) {
            console.warn(`Failed to get token info for stock ${i}:`, err);
          }

          // Fetch price from StockMarket contract getStockOracleInfo
          let price = "0";
          let lastUpdateTime = 0;
          try {
            const priceInfo = await publicClient.readContract({
              address: CONTRACTS.StockMarket,
              abi: ABIS.StockMarket,
              functionName: "getStockOracleInfo",
              args: [i],
            });
            price = priceInfo.price.toString();
            lastUpdateTime = Number(priceInfo.lastUpdateTime);
          } catch (err) {
            console.warn(`Failed to get price from contract for stock ${i}:`, err);
            price = "0";
            lastUpdateTime = 0;
          }

          // Get reserve info from Validator
          let reserve = "0";
          let reserveState = 0;
          let reserveUpdateTime = 0;
          try {
            const reserveInfo = await publicClient.readContract({
              address: CONTRACTS.Validator,
              abi: ABIS.Validator,
              functionName: "getReserveInfo",
              args: [BigInt(i)],
            });
            reserveState = Number(reserveInfo.state);
            reserveUpdateTime = Number(reserveInfo.updateTime);
            const collateralDecimals = await publicClient.readContract({
              address: stockInfo.collateral,
              abi: ABIS.ERC20,
              functionName: "decimals",
            });
            reserve = (Number(reserveInfo.latestReserve) / Math.pow(10, collateralDecimals)).toString();
          } catch (err) {
            console.warn(`Failed to get reserve for stock ${i}:`, err);
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
        } catch (err) {
          console.error(`Failed to load stock ${i}:`, err);
        }
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

        const stockInfo = await publicClient.readContract({
          address: CONTRACTS.StockRegistry,
          abi: ABIS.StockRegistry,
          functionName: "getStockInfo",
          args: [BigInt(stockId)],
        });

        let totalSupply = "0";
        let decimals = 18;
        try {
          const [supply, tokenDecimals] = await Promise.all([
            publicClient.readContract({
              address: stockInfo.stock,
              abi: ABIS.ERC20,
              functionName: "totalSupply",
            }),
            publicClient.readContract({
              address: stockInfo.stock,
              abi: ABIS.ERC20,
              functionName: "decimals",
            }),
          ]);
          totalSupply = (
            Number(supply) / Math.pow(10, tokenDecimals)
          ).toString();
          decimals = Number(tokenDecimals);
        } catch (err) {
          console.warn("Failed to get token info:", err);
        }

        // Fetch price from StockMarket contract getStockOracleInfo
        let price = "0";
        let lastUpdateTime = 0;
        try {
          const priceInfo = await publicClient.readContract({
            address: CONTRACTS.StockMarket,
            abi: ABIS.StockMarket,
            functionName: "getStockOracleInfo",
            args: [stockId],
          });
          price = priceInfo.price.toString();
          lastUpdateTime = Number(priceInfo.lastUpdateTime);
        } catch (err) {
          console.warn(`Failed to get price from contract for stock ${stockId}:`, err);
          price = "0";
          lastUpdateTime = 0;
        }

        // Get reserve info from Validator
        let reserve = "0";
        let reserveState = 0;
        let reserveUpdateTime = 0;
        try {
          const reserveInfo = await publicClient.readContract({
            address: CONTRACTS.Validator,
            abi: ABIS.Validator,
            functionName: "getReserveInfo",
            args: [BigInt(stockId)],
          });
          reserveState = Number(reserveInfo.state);
          reserveUpdateTime = Number(reserveInfo.updateTime);
          const collateralDecimals = await publicClient.readContract({
            address: stockInfo.collateral,
            abi: ABIS.ERC20,
            functionName: "decimals",
          });
          reserve = (Number(reserveInfo.latestReserve) / Math.pow(10, collateralDecimals)).toString();
        } catch (err) {
          console.warn("Failed to get reserve:", err);
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
