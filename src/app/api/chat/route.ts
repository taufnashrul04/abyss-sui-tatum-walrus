// AI Chat — POST /api/ai/chat (streaming with tools)
import { NextRequest } from 'next/server';
import { z } from 'zod';

const LLM_API_KEY = process.env.LLM_API_KEY || '';
const LLM_BASE_URL = process.env.LLM_BASE_URL || '';
const LLM_MODEL = process.env.LLM_MODEL || 'mimo-v2-omni';
const TATUM_API_KEY = process.env.TATUM_API_KEY || '';
const TATUM_RPC_URL = process.env.TATUM_RPC_URL || 'https://sui-testnet.gateway.tatum.io';

// Vercel AI SDK is completely bypassed in favor of custom robust implementation

const SYSTEM_PROMPT = `You are Abyss AI, the intelligent assistant for Abyss Protocol (WalrusVault) - a decentralized dead man's switch platform built on Sui blockchain with Walrus storage. You help users understand vault management, blockchain security, and the platform's features. You can analyze wallet addresses for security risks, check vault health status, and provide portfolio insights. Keep responses concise and technical but friendly. Use the tools provided to fetch real-time blockchain data when a user asks for it. ALWAYS check vault status when given a vault ID. Format numbers neatly and clearly.`;

async function tatumRpc(method: string, params: unknown[]) {
  const res = await fetch(TATUM_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': TATUM_API_KEY },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message ?? 'RPC error');
  return json.result;
}

const toolsDefinition = [
  {
    type: 'function',
    function: {
      name: 'get_vault_health',
      description: 'Get the health status, countdown progress, and details of a specific vault object on Sui testnet',
      parameters: {
        type: 'object',
        properties: { vaultId: { type: 'string', description: 'The Sui object ID of the vault' } },
        required: ['vaultId'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'analyze_portfolio',
      description: 'Get the token balances and owned objects of a Sui wallet address',
      parameters: {
        type: 'object',
        properties: { address: { type: 'string', description: 'The Sui wallet address' } },
        required: ['address'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'scan_security',
      description: 'Scan a Sui wallet address for security risks based on recent activity',
      parameters: {
        type: 'object',
        properties: { address: { type: 'string', description: 'The Sui wallet address' } },
        required: ['address'],
        additionalProperties: false
      }
    }
  }
];

const runTool = async (name: string, argsRaw: string) => {
  const args = JSON.parse(argsRaw || '{}');
  
  if (name === 'get_vault_health') {
    try {
      const res = await fetch(`https://fullnode.testnet.sui.io:443`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'sui_getObject', params: [args.vaultId, { showContent: true }] }),
      });
      const json = await res.json();
      const content = json.result?.data?.content;
      if (!content || content.dataType !== 'moveObject') return { error: 'Vault not found or invalid' };
      const fields = content.fields as any;
      const now = Date.now();
      const lastCheckin = Number(fields.last_checkin_ms || 0);
      const timeout = Number(fields.timeout_ms || 0);
      const timeElapsed = now - lastCheckin;
      const progress = timeout > 0 ? timeElapsed / timeout : 0;
      const remaining = timeout - timeElapsed;
      let status = 'healthy';
      if (progress > 0.8) status = 'critical';
      else if (progress > 0.5) status = 'warning';
      if (fields.is_expired) status = 'expired';
      return { vaultId: args.vaultId, owner: fields.owner, status, progressPercentage: Math.min(100, Math.round(progress * 100)), timeRemainingSeconds: Math.max(0, Math.floor(remaining / 1000)), isExpired: fields.is_expired, documentCount: fields.documents?.length || 0, recipientCount: fields.recipients?.length || 0, autoCheckin: fields.auto_checkin || false };
    } catch (e: any) { return { error: e.message }; }
  }
  
  if (name === 'analyze_portfolio') {
    try {
      const [balances, objects] = await Promise.all([
        tatumRpc('suix_getAllBalances', [args.address]),
        tatumRpc('suix_getOwnedObjects', [args.address, { filter: null, options: { showType: true } }, null, 50]),
      ]);
      const suiBal = (balances || []).find((b: any) => b.coinType === '0x2::sui::SUI');
      const suiVal = suiBal ? Number(suiBal.totalBalance) / 1e9 : 0;
      return { address: args.address, suiBalance: `${suiVal} SUI`, totalTokenTypes: balances?.length || 0, ownedObjectsCount: objects?.data?.length || 0 };
    } catch (e: any) { return { error: e.message }; }
  }
  
  if (name === 'scan_security') {
    try {
      const txs = await tatumRpc('suix_queryTransactionBlocks', [{ filter: { FromAddress: args.address }, options: { showEffects: true } }, null, 10, true]);
      const recent = txs?.data || [];
      let riskScore = 10;
      const details = ['Active address detected'];
      if (recent.length > 5) { riskScore += 20; details.push('High transaction frequency'); }
      if (recent.length === 0) { details.push('No recent transactions'); }
      let riskLevel = 'low';
      if (riskScore > 30) riskLevel = 'medium';
      if (riskScore > 70) riskLevel = 'high';
      return { address: args.address, riskLevel, riskScore, details, recentTxCount: recent.length };
    } catch (e: any) { return { error: e.message }; }
  }
  
  return { error: 'Tool not found' };
};

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    let currentMessages = [{ role: 'system', content: SYSTEM_PROMPT }, ...messages];
    let finalContent = '';
    
    // Convert Vercel's message format to OpenAI standard format
    currentMessages = currentMessages.map(m => {
      let content = m.content;
      if (Array.isArray(content)) {
         content = content.map((c: any) => c.text || c.input_text || '').join('');
      }
      return { ...m, content };
    });

    for (let step = 0; step < 4; step++) {
      const res = await fetch(`${LLM_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LLM_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: LLM_MODEL,
          messages: currentMessages,
          tools: toolsDefinition,
          stream: false
        })
      });
      
      const data = await res.json();
      if (!data.choices || data.choices.length === 0) throw new Error(data.error?.message || 'Invalid API response');
      
      const msg = data.choices[0].message;
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        currentMessages.push({ role: 'assistant', content: msg.content || '', tool_calls: msg.tool_calls });
        for (const call of msg.tool_calls) {
          const result = await runTool(call.function.name, call.function.arguments);
          currentMessages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
        }
      } else {
        finalContent = msg.content || '';
        break;
      }
    }

    const stream = new ReadableStream({
      start(controller) {
        const enqueue = (obj: any) => controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(obj)}\n\n`));
        enqueue({ type: 'start' });
        if (finalContent) {
          enqueue({ type: 'text', text: finalContent });
        }
        enqueue({ type: 'finish-step' });
        enqueue({ type: 'finish', finishReason: 'stop' });
        controller.enqueue(new TextEncoder().encode(`data: [DONE]\n\n`));
        controller.close();
      }
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream; charset=utf-8' }
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to process chat' },
      { status: 500 }
    );
  }
}
