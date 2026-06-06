// Tatum API Integration for auto check-in monitoring

const TATUM_API_URL = 'https://sui-mainnet.gateway.tatum.io';
const TATUM_API_KEY = process.env.TATUM_API_KEY || '';

export interface WalletActivity {
  address: string;
  lastTransactionTime: number;
  transactionCount: number;
  isActive: boolean;
}

export class TatumMonitor {
  private apiKey: string;
  private rpcUrl: string;

  constructor(apiKey?: string, rpcUrl?: string) {
    this.apiKey = apiKey || TATUM_API_KEY;
    this.rpcUrl = rpcUrl || TATUM_API_URL;
  }

  /**
   * Get recent transactions for a wallet
   */
  async getRecentTransactions(
    address: string,
    limit: number = 10
  ): Promise<any[]> {
    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'suix_queryTransactionBlocks',
        params: [
          {
            filter: {
              FromOrToAddress: { addr: address },
            },
            options: {
              showInput: true,
              showEffects: true,
              showTimestamp: true,
            },
          },
          null, // cursor
          limit,
          true, // descending order
        ],
      }),
    });

    const data = await response.json();
    return data.result?.data || [];
  }

  /**
   * Check if wallet is active (has recent transactions)
   */
  async checkWalletActivity(
    address: string,
    daysThreshold: number = 30
  ): Promise<WalletActivity> {
    const txs = await this.getRecentTransactions(address, 1);
    
    const lastTx = txs[0];
    const lastTxTime = lastTx?.timestampMs 
      ? Number(lastTx.timestampMs) 
      : 0;
    
    const now = Date.now();
    const thresholdMs = daysThreshold * 24 * 60 * 60 * 1000;
    const isActive = (now - lastTxTime) < thresholdMs;

    return {
      address,
      lastTransactionTime: lastTxTime,
      transactionCount: txs.length,
      isActive,
    };
  }

  /**
   * Get wallet balance
   */
  async getBalance(address: string): Promise<{
    suiBalance: string;
    tokenCount: number;
  }> {
    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'suix_getAllBalances',
        params: [address],
      }),
    });

    const data = await response.json();
    const balances = data.result || [];
    
    const suiBalance = balances.find((b: any) => b.coinType === '0x2::sui::SUI');
    
    return {
      suiBalance: suiBalance?.totalBalance || '0',
      tokenCount: balances.length,
    };
  }

  /**
   * Get owned objects (NFTs, etc.)
   */
  async getOwnedObjects(address: string): Promise<any[]> {
    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'suix_getOwnedObjects',
        params: [
          address,
          {
            options: {
              showType: true,
              showContent: true,
              showDisplay: true,
            },
          },
          null,
          50,
        ],
      }),
    });

    const data = await response.json();
    return data.result?.data || [];
  }

  /**
   * Monitor multiple wallets for activity
   */
  async monitorWallets(
    addresses: string[],
    daysThreshold: number = 30
  ): Promise<WalletActivity[]> {
    const results = await Promise.all(
      addresses.map(addr => this.checkWalletActivity(addr, daysThreshold))
    );
    return results;
  }
}

// Singleton
let tatumInstance: TatumMonitor | null = null;

export function getTatumClient(): TatumMonitor {
  if (!tatumInstance) {
    tatumInstance = new TatumMonitor();
  }
  return tatumInstance;
}
