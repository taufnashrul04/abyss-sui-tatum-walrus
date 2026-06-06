// MCP Server endpoint - Blockchain tools via Tatum RPC
import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod/v3';

const TATUM_RPC_URL =
  process.env.TATUM_RPC_URL || 'https://sui-testnet.gateway.tatum.io';
const TATUM_API_KEY = process.env.TATUM_API_KEY || '';
const SUI_TESTNET_RPC = 'https://fullnode.testnet.sui.io:443';
const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || '';

// ── Helpers ──────────────────────────────────────────────────────────────────

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

async function suiTestnetRpc(method: string, params: unknown[]) {
  const res = await fetch(SUI_TESTNET_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message ?? 'RPC error');
  return json.result;
}

// ── MCP Handler ──────────────────────────────────────────────────────────────

const handler = createMcpHandler(
  (server) => {
    // ── Tool 1: check_wallet_security ────────────────────────────────────
    server.registerTool(
      'check_wallet_security',
      {
        title: 'Check Wallet Security',
        description:
          'Analyzes a Sui wallet address for suspicious activity using transaction history. Returns a risk assessment with score and details.',
        inputSchema: {
          address: z
            .string()
            .describe('The Sui wallet address to check (0x...)'),
        },
      },
      async ({ address }) => {
        try {
          // Query recent transactions
          const txResult = await tatumRpc('suix_queryTransactionBlocks', [
            {
              filter: { FromAddress: address },
              options: { showInput: true, showEffects: true },
            },
            null, // cursor
            20, // limit
            true, // descending
          ]);

          const txCount = txResult?.data?.length ?? 0;
          const details: string[] = [];
          let riskScore = 0;

          // Check tx frequency
          if (txCount === 0) {
            details.push('No transaction history found — new or inactive wallet');
            riskScore += 30;
          } else if (txCount < 3) {
            details.push(
              `Very low activity: only ${txCount} recent transaction(s)`
            );
            riskScore += 20;
          }

          // Check for rapid transactions (possible bot)
          if (txCount >= 15) {
            details.push(
              'High transaction frequency detected — possible automated activity'
            );
            riskScore += 25;
          }

          // Check for failed transactions
          const failedTxs = (txResult?.data ?? []).filter(
            (tx: { effects?: { status?: { status?: string } } }) =>
              tx.effects?.status?.status === 'failure'
          );
          if (failedTxs.length > 3) {
            details.push(
              `Multiple failed transactions (${failedTxs.length}) — unusual pattern`
            );
            riskScore += 20;
          }

          // Get balances for additional context
          const balances = await tatumRpc('suix_getAllBalances', [address]);
          const suiBal = balances?.find(
            (b: { coinType: string }) => b.coinType === '0x2::sui::SUI'
          );
          const suiAmount = suiBal
            ? Number(suiBal.totalBalance) / 1e9
            : 0;

          if (suiAmount === 0) {
            details.push('Zero SUI balance');
            riskScore += 10;
          }

          if (details.length === 0) {
            details.push('No suspicious patterns detected');
          }

          riskScore = Math.min(100, Math.max(0, riskScore));
          const riskLevel =
            riskScore >= 60 ? 'high' : riskScore >= 30 ? 'medium' : 'low';

          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    address,
                    riskLevel,
                    riskScore,
                    details,
                    recentTxCount: txCount,
                    suiBalance: suiAmount.toFixed(4),
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } catch (err) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error checking wallet security: ${err instanceof Error ? err.message : String(err)}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // ── Tool 2: get_wallet_portfolio ─────────────────────────────────────
    server.registerTool(
      'get_wallet_portfolio',
      {
        title: 'Get Wallet Portfolio',
        description:
          'Retrieves all token balances and owned object count for a Sui wallet address.',
        inputSchema: {
          address: z
            .string()
            .describe('The Sui wallet address to query (0x...)'),
        },
      },
      async ({ address }) => {
        try {
          const [balances, ownedObjects] = await Promise.all([
            tatumRpc('suix_getAllBalances', [address]),
            tatumRpc('suix_getOwnedObjects', [
              address,
              { filter: null, options: { showType: true } },
              null, // cursor
              1, // limit — we only need the count
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

          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    address,
                    balances: formattedBalances,
                    totalTokenTypes: formattedBalances.length,
                    ownedObjectsCount: ownedObjects?.data?.length ?? 0,
                    suiBalance: suiBal?.totalBalance ?? '0',
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } catch (err) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error fetching portfolio: ${err instanceof Error ? err.message : String(err)}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // ── Tool 3: get_vault_status ─────────────────────────────────────────
    server.registerTool(
      'get_vault_status',
      {
        title: 'Get Vault Status',
        description:
          'Queries a WalrusVault object on Sui testnet and returns its details including owner, recipient count, timeout, check-in status, and document count.',
        inputSchema: {
          vaultId: z
            .string()
            .describe('The vault object ID on Sui testnet (0x...)'),
        },
      },
      async ({ vaultId }) => {
        try {
          const result = await suiTestnetRpc('sui_getObject', [
            vaultId,
            { showContent: true },
          ]);

          if (!result?.data?.content?.fields) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: 'Vault object not found or has no content fields.',
                },
              ],
              isError: true,
            };
          }

          const fields = result.data.content.fields;

          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    vaultId,
                    owner: fields.owner ?? null,
                    recipientsCount: Array.isArray(fields.recipients)
                      ? fields.recipients.length
                      : fields.recipients?.fields?.contents?.length ?? 0,
                    timeoutMs: fields.timeout_ms ?? null,
                    lastCheckinMs: fields.last_checkin_ms ?? null,
                    isExpired: fields.is_expired ?? false,
                    autoCheckin: fields.auto_checkin ?? false,
                    documentsCount: Array.isArray(fields.documents)
                      ? fields.documents.length
                      : fields.documents?.fields?.contents?.length ?? 0,
                    packageId: PACKAGE_ID,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } catch (err) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error fetching vault status: ${err instanceof Error ? err.message : String(err)}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // ── Tool 4: get_transaction_history ───────────────────────────────────
    server.registerTool(
      'get_transaction_history',
      {
        title: 'Get Transaction History',
        description:
          'Returns recent transactions for a Sui wallet address via Tatum RPC.',
        inputSchema: {
          address: z
            .string()
            .describe('The Sui wallet address to query (0x...)'),
        },
      },
      async ({ address }) => {
        try {
          const txResult = await tatumRpc('suix_queryTransactionBlocks', [
            {
              filter: { FromAddress: address },
              options: {
                showInput: true,
                showEffects: true,
                showEvents: true,
              },
            },
            null,
            10,
            true,
          ]);

          const transactions = (txResult?.data ?? []).map(
            (tx: {
              digest?: string;
              timestampMs?: string;
              effects?: { status?: { status?: string }; gasUsed?: { computationCost?: string; storageCost?: string } };
              transaction?: { data?: { sender?: string } };
            }) => ({
              digest: tx.digest,
              timestampMs: tx.timestampMs ?? null,
              status: tx.effects?.status?.status ?? 'unknown',
              sender: tx.transaction?.data?.sender ?? address,
              gasUsed: tx.effects?.gasUsed
                ? {
                    computation: tx.effects.gasUsed.computationCost ?? '0',
                    storage: tx.effects.gasUsed.storageCost ?? '0',
                  }
                : null,
            })
          );

          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    address,
                    totalReturned: transactions.length,
                    transactions,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } catch (err) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error fetching transactions: ${err instanceof Error ? err.message : String(err)}`,
              },
            ],
            isError: true,
          };
        }
      }
    );
  },
  {
    serverInfo: {
      name: 'WalrusVault MCP Server',
      version: '1.0.0',
    },
  },
  {
    basePath: '/api',
    maxDuration: 60,
    verboseLogs: process.env.NODE_ENV === 'development',
  }
);

export { handler as GET, handler as POST, handler as DELETE };
