// AI Portfolio — GET /api/ai/portfolio?address=0x...
import { type NextRequest } from 'next/server';

const TATUM_RPC_URL =
  process.env.TATUM_RPC_URL || 'https://sui-testnet.gateway.tatum.io';
const TATUM_API_KEY = process.env.TATUM_API_KEY || '';

async function tatumRpc(method: string, params: unknown[]) {
  const res = await fetch(TATUM_RPC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': TATUM_API_KEY,
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message ?? 'RPC error');
  return json.result;
}

export async function GET(request: NextRequest) {
  try {
    const address = request.nextUrl.searchParams.get('address');

    if (!address || !address.startsWith('0x')) {
      return Response.json(
        { success: false, error: 'Valid Sui address (0x...) is required' },
        { status: 400 }
      );
    }

    // Fetch balances and owned objects concurrently
    const [balances, ownedObjectsResult] = await Promise.all([
      tatumRpc('suix_getAllBalances', [address]),
      tatumRpc('suix_getOwnedObjects', [
        address,
        { filter: null, options: { showType: true } },
        null, // cursor
        50, // limit
      ]),
    ]);

    const formattedBalances = (balances ?? []).map(
      (b: { coinType: string; totalBalance: string }) => {
        const parts = b.coinType.split('::');
        return {
          coinType: b.coinType,
          totalBalance: b.totalBalance,
          symbol: parts[parts.length - 1] || b.coinType,
        };
      }
    );

    const suiBal = formattedBalances.find(
      (b: { coinType: string }) => b.coinType === '0x2::sui::SUI'
    );

    const ownedObjectsCount = ownedObjectsResult?.data?.length ?? 0;

    return Response.json({
      success: true,
      data: {
        address,
        balances: formattedBalances,
        totalTokenTypes: formattedBalances.length,
        ownedObjectsCount,
        suiBalance: suiBal?.totalBalance ?? '0',
      },
    });
  } catch (error) {
    console.error('Portfolio fetch failed:', error);
    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch portfolio data',
      },
      { status: 500 }
    );
  }
}
