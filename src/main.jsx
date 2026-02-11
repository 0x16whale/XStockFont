import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, http } from "wagmi";
import { avalancheFuji } from "wagmi/chains";
import {
  rabbyWallet,
  okxWallet,
  zerionWallet,
} from "@rainbow-me/rainbowkit/wallets";
import "@rainbow-me/rainbowkit/styles.css";

const config = getDefaultConfig({
  appName: "XStock",
  projectId:
    import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || "YOUR_PROJECT_ID",
  chains: [avalancheFuji],
  transports: {
    [avalancheFuji.id]: http(import.meta.env.VITE_AVALANCHE_FUJI_RPC),
  },
  wallets: [
    {
      groupName: "Recommended",
      wallets: [rabbyWallet, okxWallet, zerionWallet],
    },
  ],
  ssr: false,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          showRecentTransactions={true}
          coolMode={true}
          appInfo={{
            appName: "XStock",
          }}
        >
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
);
