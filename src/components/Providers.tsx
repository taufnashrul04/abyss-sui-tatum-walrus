'use client';

import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useEffect } from 'react';

// Config options for the networks you want to connect to
const { networkConfig } = createNetworkConfig({
  testnet: { 
    url: getJsonRpcFullnodeUrl('testnet'),
    network: 'testnet' as const,
  },
  mainnet: { 
    url: getJsonRpcFullnodeUrl('mainnet'),
    network: 'mainnet' as const,
  },
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Run cron check immediately on mount and then every 1 minute
    const runCron = async () => {
      try {
        await fetch('/api/cron/check-vaults');
      } catch (e) {
        console.error('Failed to run background cron check:', e);
      }
    };
    
    runCron(); // Initial check
    const interval = setInterval(runCron, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <WalletProvider autoConnect>
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
