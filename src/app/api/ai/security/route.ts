// AI Security Analysis — POST /api/ai/security
import { NextRequest } from 'next/server';

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address } = body as { address?: string };

    if (!address || typeof address !== 'string' || !address.startsWith('0x')) {
      return Response.json(
        { success: false, error: 'Valid Sui address (0x...) is required' },
        { status: 400 }
      );
    }

    // Fetch transactions and balances concurrently
    const [txResult, balances] = await Promise.all([
      tatumRpc('suix_queryTransactionBlocks', [
        {
          filter: { FromAddress: address },
          options: { showInput: true, showEffects: true },
        },
        null,
        50,
        true,
      ]),
      tatumRpc('suix_getAllBalances', [address]),
    ]);

    const txData = txResult?.data ?? [];
    const txCount = txData.length;
    const details: string[] = [];
    let riskScore = 0;

    // ── Tx frequency analysis ──────────────────────────────────────────
    if (txCount === 0) {
      details.push('No transaction history found — new or dormant wallet');
      riskScore += 30;
    } else if (txCount < 3) {
      details.push(
        `Very low activity: only ${txCount} recent transaction(s)`
      );
      riskScore += 20;
    } else if (txCount >= 40) {
      details.push(
        'Extremely high transaction volume — possible automated activity'
      );
      riskScore += 30;
    } else if (txCount >= 20) {
      details.push('High transaction frequency detected');
      riskScore += 15;
    }

    // ── Failed tx analysis ─────────────────────────────────────────────
    const failedTxs = txData.filter(
      (tx: { effects?: { status?: { status?: string } } }) =>
        tx.effects?.status?.status === 'failure'
    );
    if (failedTxs.length > 5) {
      details.push(
        `High failure rate: ${failedTxs.length}/${txCount} transactions failed`
      );
      riskScore += 25;
    } else if (failedTxs.length > 2) {
      details.push(
        `Some failed transactions: ${failedTxs.length}/${txCount}`
      );
      riskScore += 10;
    }

    // ── Timing analysis ────────────────────────────────────────────────
    if (txCount >= 2) {
      const timestamps = txData
        .map((tx: { timestampMs?: string }) =>
          tx.timestampMs ? Number(tx.timestampMs) : null
        )
        .filter((t: number | null): t is number => t !== null)
        .sort((a: number, b: number) => b - a);

      if (timestamps.length >= 2) {
        const gaps = [];
        for (let i = 0; i < timestamps.length - 1; i++) {
          gaps.push(timestamps[i] - timestamps[i + 1]);
        }
        const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
        // Less than 5 seconds average gap is suspicious
        if (avgGap < 5000) {
          details.push(
            'Transactions submitted in rapid succession — bot-like pattern'
          );
          riskScore += 20;
        }
      }
    }

    // ── Balance analysis ───────────────────────────────────────────────
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
    if (!suiBal || suiBal.totalBalance === '0') {
      details.push('Zero SUI balance — wallet may be drained');
      riskScore += 10;
    }

    if (details.length === 0) {
      details.push('No suspicious patterns detected');
    }

    riskScore = Math.min(100, Math.max(0, riskScore));
    const riskLevel: 'low' | 'medium' | 'high' =
      riskScore >= 60 ? 'high' : riskScore >= 30 ? 'medium' : 'low';

    // Determine last activity timestamp
    let lastActivity: number | null = null;
    if (txCount > 0 && txData[0]?.timestampMs) {
      lastActivity = Number(txData[0].timestampMs);
    }

    return Response.json({
      success: true,
      data: {
        address,
        riskLevel,
        riskScore,
        details,
        balances: formattedBalances,
        recentTxCount: txCount,
        lastActivity,
      },
    });
  } catch (error) {
    console.error('Security analysis failed:', error);
    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to analyze wallet security',
      },
      { status: 500 }
    );
  }
}
