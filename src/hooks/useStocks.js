import { useState, useEffect, useCallback } from "react";
import { usePublicClient } from "wagmi";
import { CONTRACTS, ABIS } from "../config/contracts";

export function useStocks() {
  const publicClient = usePublicClient();
  const [stocks, setStocks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStocks = useCallback(async () => {
    if (!publicClient) {
      setIsLoading(false);
      return;
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
            console.warn(`Failed to get price for stock ${i}:`, err);
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
            // reserveInfo: [state, updateTime, latestReserve]
            reserveState = Number(reserveInfo.state);
            reserveUpdateTime = Number(reserveInfo.updateTime);
            // latestReserve is uint128, need to format with collateral decimals
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
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient]);

  useEffect(() => {
    fetchStocks();
  }, [fetchStocks]);

  return { stocks, isLoading, error, refetch: fetchStocks };
}

export function useStock(stockId) {
  const publicClient = usePublicClient();
  const [stock, setStock] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStock = async () => {
      if (!publicClient || !stockId) {
        setIsLoading(false);
        return;
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

        let price = "0";
        let lastUpdateTime = 0;
        try {
          const priceInfo = await publicClient.readContract({
            address: CONTRACTS.StockFunctionsOracle,
            abi: ABIS.StockFunctionsOracle,
            functionName: "getStockOracleInfo",
          });
          price = priceInfo.price.toString();
          lastUpdateTime = Number(priceInfo.lastUpdateTime);
        } catch (err) {
          console.warn("Failed to get price:", err);
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
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStock();
  }, [publicClient, stockId]);

  return { stock, isLoading, error };
}
