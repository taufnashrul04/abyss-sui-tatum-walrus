// AI Vault Health — GET /api/ai/vault-health?vaultId=0x...
import { type NextRequest } from 'next/server';

const SUI_TESTNET_RPC = 'https://fullnode.testnet.sui.io:443';

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

function formatDuration(ms: number): string {
  if (ms <= 0) return '0m';

  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);

  return parts.join(' ');
}

export async function GET(request: NextRequest) {
  try {
    const vaultId = request.nextUrl.searchParams.get('vaultId');

    if (!vaultId || !vaultId.startsWith('0x')) {
      return Response.json(
        { success: false, error: 'Valid vault ID (0x...) is required' },
        { status: 400 }
      );
    }

    const result = await suiTestnetRpc('sui_getObject', [
      vaultId,
      { showContent: true },
    ]);

    if (!result?.data?.content?.fields) {
      return Response.json(
        { success: false, error: 'Vault object not found or has no content' },
        { status: 404 }
      );
    }

    const fields = result.data.content.fields;

    // Parse vault fields
    const owner: string = fields.owner ?? '';
    const timeoutMs = Number(fields.timeout_ms ?? 0);
    const lastCheckinMs = Number(fields.last_checkin_ms ?? 0);
    const isExpired: boolean = fields.is_expired ?? false;
    const autoCheckin: boolean = fields.auto_checkin ?? false;

    // Count recipients (handle Move vector encoding)
    let recipientCount = 0;
    if (Array.isArray(fields.recipients)) {
      recipientCount = fields.recipients.length;
    } else if (fields.recipients?.fields?.contents) {
      recipientCount = fields.recipients.fields.contents.length;
    } else if (fields.recipients?.fields?.size) {
      recipientCount = Number(fields.recipients.fields.size);
    }

    // Count documents
    let documentCount = 0;
    if (Array.isArray(fields.documents)) {
      documentCount = fields.documents.length;
    } else if (fields.documents?.fields?.contents) {
      documentCount = fields.documents.fields.contents.length;
    } else if (fields.documents?.fields?.size) {
      documentCount = Number(fields.documents.fields.size);
    }

    // Calculate health metrics
    const now = Date.now();
    const timeElapsed = now - lastCheckinMs;
    const progress = timeoutMs > 0 ? Math.min(1, timeElapsed / timeoutMs) : 0;
    const timeRemainingMs = Math.max(0, timeoutMs - timeElapsed);

    let healthStatus: 'healthy' | 'warning' | 'critical' | 'expired';
    if (isExpired) {
      healthStatus = 'expired';
    } else if (progress > 0.8) {
      healthStatus = 'critical';
    } else if (progress > 0.5) {
      healthStatus = 'warning';
    } else {
      healthStatus = 'healthy';
    }

    return Response.json({
      success: true,
      data: {
        vaultId,
        owner,
        recipientCount,
        documentCount,
        timeoutMs,
        lastCheckinMs,
        isExpired,
        autoCheckin,
        healthStatus,
        progress: Math.round(progress * 10000) / 10000, // 4 decimal places
        timeRemainingMs,
        timeRemainingFormatted: formatDuration(timeRemainingMs),
      },
    });
  } catch (error) {
    console.error('Vault health check failed:', error);
    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to check vault health',
      },
      { status: 500 }
    );
  }
}
