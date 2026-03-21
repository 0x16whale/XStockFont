import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

import { PrivyProvider } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "@privy-io/wagmi";
import { createConfig } from "@privy-io/wagmi";
import { http } from "wagmi";
import { base } from "viem/chains";
import { SUPPORTED_CHAINS, DEFAULT_CHAIN } from "./config/networks";

// RPC URLs from environment variables
const baseRpcUrl = import.meta.env.VITE_BASE_RPC || "https://mainnet.base.org";

// Create wagmi config with Privy - supports Base Mainnet only
const config = createConfig({
  chains: SUPPORTED_CHAINS,
  transports: {
    [base.id]: http(baseRpcUrl),
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Privy configuration
const privyConfig = {
  // Supported chains for this app
  supportedChains: SUPPORTED_CHAINS,
  defaultChain: DEFAULT_CHAIN,
  // Wallet configuration
  embeddedWallets: {
    createOnLogin: "users-without-wallets",
    showWalletUIs: true,
  },
  // Login methods
  loginMethods: ["wallet", "email", "sms"],
  // Appearance
  appearance: {
    theme: "dark",
    accentColor: "#3b82f6",
    logo: "https://your-logo-url.com/logo.png",
    showWalletLoginFirst: true,
  },
  // Wallet list configuration
  // External wallets that users can connect
  externalWallets: {
    coinbaseWallet: {
      // Enables the Smart Wallet feature from Coinbase
      connectionOptions: "smartWalletOnly",
    },
    // Supported wallet connectors
    connectors: [
      { id: "metaMask", name: "MetaMask" },
      { id: "rabby", name: "Rabby" },
      { id: "okx", name: "OKX Wallet" },
      { id: "walletConnect", name: "WalletConnect" },
    ],
  },
};

const privyAppId = import.meta.env.VITE_PRIVY_APP_ID;

if (!privyAppId) {
  console.error("VITE_PRIVY_APP_ID is not set in .env file");
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <PrivyProvider appId={privyAppId} config={privyConfig}>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={config}>
          <App />
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  </StrictMode>
);
