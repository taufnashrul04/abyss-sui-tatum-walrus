'use client';

import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { useCurrentAccount, useSignAndExecuteTransaction, ConnectButton, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { VaultEncryption } from '@/lib/encryption';
import {
  LockOpen, Search, ShieldAlert, Key, FileText,
  AlertTriangle, Loader2, CheckCircle2, Download, Shield,
} from 'lucide-react';

interface ClaimStatus {
  phase: 'idle' | 'searching' | 'found' | 'claiming' | 'success';
  vaultInfo?: {
    id: string;
    owner: string;
    documentCount: number;
    isExpired: boolean;
    documents?: { name: string; blobId: string; encryptedKey: string; }[];
  };
}

export default function ClaimVault() {
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();

  const [vaultId, setVaultId] = useState('');
  const [status,  setStatus]  = useState<ClaimStatus>({ phase: 'idle' });

  const searchVault = async () => {
    if (!vaultId.startsWith('0x') || vaultId.length < 10) return;
    setStatus({ phase: 'searching' });
    try {
      const vaultObj = await suiClient.getObject({ id: vaultId, options: { showContent: true } });
      if (vaultObj.error || !vaultObj.data?.content) {
        setStatus({ phase: 'idle' });
        alert('Vault not found on blockchain.');
        return;
      }
      const fields = (vaultObj.data.content as any).fields;
      const lastCheckinMs = Number(fields.last_checkin_ms);
      const timeoutMs     = Number(fields.timeout_ms);
      const dynamicallyExpired = fields.is_expired || Date.now() >= lastCheckinMs + timeoutMs;
      const documents = (fields.documents || []).map((d: any) => ({
        name:         new TextDecoder().decode(new Uint8Array(d.fields.name)),
        blobId:       new TextDecoder().decode(new Uint8Array(d.fields.blob_id)),
        encryptedKey: new TextDecoder().decode(new Uint8Array(d.fields.encrypted_key)),
      }));
      setStatus({ phase: 'found', vaultInfo: { id: vaultId, owner: fields.owner, documentCount: documents.length, isExpired: dynamicallyExpired, documents } });
    } catch (err) {
      console.error(err);
      setStatus({ phase: 'idle' });
      alert('Error fetching vault.');
    }
  };

  const handleDownload = async (blobId: string, filename: string, encryptedKeyString: string) => {
    const url = `${process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR}/v1/${blobId}`;
    try {
      const response      = await fetch(url);
      const encryptedText = await response.text();
      let encMeta;
      try { encMeta = JSON.parse(encryptedKeyString); } catch { alert('Failed to parse decryption keys.'); return; }
      const decryptedBuffer = VaultEncryption.decrypt(encryptedText, encMeta.key, encMeta.iv, encMeta.salt);
      const blob        = new Blob([decryptedBuffer]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl; a.download = filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); window.URL.revokeObjectURL(downloadUrl);
    } catch (err) { console.error(err); alert('Failed to download or decrypt from Walrus.'); }
  };

  const handleClaim = () => {
    if (!account || !status.vaultInfo) return;
    setStatus({ ...status, phase: 'claiming' });
    const tx = new Transaction();
    tx.moveCall({ target: `${process.env.NEXT_PUBLIC_PACKAGE_ID}::vault::claim_access`, arguments: [tx.object(status.vaultInfo.id), tx.object('0x6')] });
    signAndExecute({ transaction: tx as any }, {
      onSuccess: () => setStatus({ ...status, phase: 'success' }),
      onError:   (err) => { console.error(err); setStatus({ ...status, phase: 'found' }); },
    });
  };

  /* ── Not connected ── */
  if (!account) {
    return (
      <div className="min-h-screen flex flex-col bg-[#040810] w-full">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="rounded-2xl border border-[rgba(0,212,255,0.15)] w-full max-w-md overflow-hidden" style={{ background: 'linear-gradient(135deg,rgba(8,15,30,0.95),rgba(13,25,41,0.9))', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
            <div className="px-6 py-5 border-b border-[rgba(0,212,255,0.1)] flex items-center gap-3" style={{ background: 'rgba(0,212,255,0.04)' }}>
              <ShieldAlert className="w-5 h-5 text-[#00d4ff]" />
              <h2 className="font-bold text-[#e8f0fe]">Authentication Required</h2>
            </div>
            <div className="p-8">
              <p className="text-[#6b82a8] font-medium mb-8 leading-relaxed text-sm">Connect your wallet to verify your identity and claim access to designated vaults.</p>
              <div className="connect-btn w-full flex justify-center"><ConnectButton /></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#040810] w-full overflow-x-hidden">
      <Navbar />

      {/* Background */}
      <div className="absolute inset-0 line-grid opacity-20 pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 50% at 50% -10%, rgba(0,212,255,0.12) 0%, transparent 60%)' }} />

      <div className="relative z-10 flex-1 w-full max-w-3xl mx-auto px-6 py-14 lg:py-24">
        {/* Header */}
        <div className="mb-12" style={{ animation: 'fadeInUp 0.6s ease forwards' }}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(0,212,255,0.2)] bg-[rgba(0,212,255,0.06)] mb-6">
            <Key className="w-3 h-3 text-[#00d4ff]" />
            <span className="text-[#00d4ff] text-[10px] font-bold uppercase tracking-widest">Recipient Portal</span>
          </div>
          <h1 className="text-4xl lg:text-6xl font-bold tracking-tight text-[#e8f0fe] mb-4">
            Claim{' '}
            <span style={{ background: 'linear-gradient(135deg,#00d4ff,#7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Access
            </span>
          </h1>
          <p className="text-[#6b82a8] font-medium max-w-xl leading-relaxed text-sm">
            Enter a Vault ID to check expiration status. Once the protocol triggers, authorized recipients can decrypt the payload here.
          </p>
        </div>

        {/* Search Box */}
        <div
          className="rounded-2xl border border-[rgba(0,212,255,0.12)] p-6 mb-6"
          style={{ background: 'linear-gradient(135deg,rgba(8,15,30,0.95),rgba(13,25,41,0.85))', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', animation: 'fadeInUp 0.6s 0.1s ease both' }}
        >
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b82a8]" />
              <input
                type="text"
                value={vaultId}
                onChange={e => setVaultId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchVault()}
                placeholder="Enter Vault ID (0x...)"
                disabled={status.phase === 'searching' || status.phase === 'claiming'}
                className="w-full pl-11 pr-4 py-3.5 rounded-xl border text-[#e8f0fe] font-mono text-sm placeholder:text-[#6b82a8] placeholder:font-sans focus:outline-none transition-all duration-200 disabled:opacity-50"
                style={{
                  background: 'rgba(8,15,30,0.8)',
                  borderColor: 'rgba(0,212,255,0.15)',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(0,212,255,0.5)'; e.target.style.boxShadow = '0 0 20px rgba(0,212,255,0.08)'; }}
                onBlur={e  => { e.target.style.borderColor = 'rgba(0,212,255,0.15)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
            <button
              onClick={searchVault}
              disabled={vaultId.length < 10 || status.phase === 'searching' || status.phase === 'claiming'}
              className="btn-primary px-7 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {status.phase === 'searching'
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Searching…</>
                : <><Search className="w-4 h-4" /> Search Vault</>}
            </button>
          </div>
        </div>

        {/* Found */}
        {status.phase === 'found' && status.vaultInfo && (
          <div
            className="rounded-2xl border border-[rgba(0,212,255,0.15)] overflow-hidden"
            style={{ background: 'linear-gradient(135deg,rgba(8,15,30,0.98),rgba(13,25,41,0.9))', animation: 'fadeInUp 0.5s ease forwards' }}
          >
            {/* Top accent */}
            <div className="h-1 w-full" style={{ background: status.vaultInfo.isExpired ? 'linear-gradient(90deg,#00f5a0,#00d4ff)' : 'linear-gradient(90deg,#ffb627,#ff4d6d)' }} />

            <div className="p-7">
              <div className="flex items-start justify-between mb-7 pb-7 border-b border-[rgba(0,212,255,0.08)]">
                <div>
                  <h3 className="text-xl font-bold text-[#e8f0fe] mb-2">Vault Located</h3>
                  <p className="font-mono text-xs text-[#6b82a8] break-all">{status.vaultInfo.id}</p>
                </div>
                <span
                  className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest flex-shrink-0 ml-4"
                  style={status.vaultInfo.isExpired
                    ? { background: 'rgba(0,245,160,0.1)', border: '1px solid rgba(0,245,160,0.3)', color: '#00f5a0' }
                    : { background: 'rgba(255,182,39,0.1)', border: '1px solid rgba(255,182,39,0.3)', color: '#ffb627' }}
                >
                  {status.vaultInfo.isExpired ? 'Protocol Triggered' : 'Secured'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-5 mb-7">
                {[
                  { label: 'Owner',   value: `${status.vaultInfo.owner.slice(0,10)}…${status.vaultInfo.owner.slice(-8)}`, mono: true },
                  { label: 'Payload', value: `${status.vaultInfo.documentCount} Encrypted Files`, mono: false },
                ].map(item => (
                  <div key={item.label} className="rounded-xl border border-[rgba(0,212,255,0.08)] p-4 bg-[rgba(0,212,255,0.02)]">
                    <div className="text-[9px] font-bold uppercase tracking-widest text-[#6b82a8] mb-1.5">{item.label}</div>
                    <div className={`text-[#e8f0fe] text-xs font-bold ${item.mono ? 'font-mono' : ''} flex items-center gap-2`}>
                      {!item.mono && <FileText className="w-3.5 h-3.5 text-[#00d4ff]" />}
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              {status.vaultInfo.isExpired ? (
                <button
                  onClick={handleClaim}
                  className="btn-primary w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-3"
                  style={{ boxShadow: '0 0 32px rgba(0,212,255,0.2)' }}
                >
                  <LockOpen className="w-5 h-5" /> Execute Claim & Decrypt Payload
                </button>
              ) : (
                <div className="rounded-xl border border-[rgba(255,182,39,0.25)] bg-[rgba(255,182,39,0.05)] p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-[#ffb627] flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-[#6b82a8] leading-relaxed">
                    This vault has not yet expired. The owner is still actively pinging the smart contract. You cannot claim access at this time.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Claiming */}
        {status.phase === 'claiming' && (
          <div
            className="rounded-2xl border border-[rgba(0,212,255,0.15)] p-16 flex flex-col items-center text-center"
            style={{ background: 'linear-gradient(135deg,rgba(8,15,30,0.98),rgba(13,25,41,0.9))' }}
          >
            <div className="w-16 h-16 rounded-full border-2 border-[#00d4ff] border-t-transparent animate-spin mb-6" />
            <h3 className="text-xl font-bold text-[#e8f0fe] mb-2">Executing Smart Contract</h3>
            <p className="text-[#6b82a8] font-mono text-sm">Awaiting network confirmation…</p>
          </div>
        )}

        {/* Success */}
        {status.phase === 'success' && (
          <div
            className="rounded-2xl border border-[rgba(0,245,160,0.25)] overflow-hidden"
            style={{ background: 'linear-gradient(135deg,rgba(8,15,30,0.98),rgba(13,25,41,0.9))', boxShadow: '0 0 60px rgba(0,245,160,0.08)', animation: 'scaleIn 0.4s ease forwards' }}
          >
            <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#00f5a0,#00d4ff)' }} />
            <div className="p-8 flex flex-col items-center text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                style={{ background: 'rgba(0,245,160,0.12)', border: '1px solid rgba(0,245,160,0.3)', boxShadow: '0 0 32px rgba(0,245,160,0.2)' }}
              >
                <CheckCircle2 className="w-8 h-8 text-[#00f5a0]" />
              </div>
              <h3 className="text-2xl font-bold text-[#e8f0fe] mb-3">Access Granted</h3>
              <p className="text-[#6b82a8] font-medium max-w-md mb-8 text-sm leading-relaxed">
                Your wallet has been verified on-chain. The encrypted payload has been retrieved from Walrus and decrypted locally.
              </p>

              {/* Document list */}
              <div className="w-full rounded-xl border border-[rgba(0,212,255,0.12)] overflow-hidden text-left">
                <div className="px-5 py-3.5 border-b border-[rgba(0,212,255,0.1)] flex items-center gap-2" style={{ background: 'rgba(0,212,255,0.04)' }}>
                  <Shield className="w-3.5 h-3.5 text-[#00d4ff]" />
                  <span className="text-xs font-bold uppercase tracking-widest text-[#6b82a8]">Decrypted Payload</span>
                </div>
                <div>
                  {status.vaultInfo?.documents?.length ? status.vaultInfo.documents.map((doc, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-5 py-4 border-b border-[rgba(0,212,255,0.06)] last:border-0 hover:bg-[rgba(0,212,255,0.03)] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)' }}>
                          <FileText className="w-4 h-4 text-[#00d4ff]" />
                        </div>
                        <span className="text-[#e8f0fe] text-sm font-medium">{doc.name}</span>
                      </div>
                      <button
                        onClick={() => handleDownload(doc.blobId, doc.name, doc.encryptedKey)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-[#00d4ff] border border-[rgba(0,212,255,0.2)] hover:bg-[rgba(0,212,255,0.1)] transition-all"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </button>
                    </div>
                  )) : (
                    <div className="px-5 py-6 text-sm font-mono text-[#6b82a8]">No documents attached to this vault.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
