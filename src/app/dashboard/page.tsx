'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { useCurrentAccount, useSignAndExecuteTransaction, ConnectButton, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Lock,
  Plus,
  Shield,
  Clock,
  Users,
  Activity,
  FileText,
  Bot,
  AlertTriangle,
  XCircle,
  HeartPulse,
  ShieldAlert,
  Copy,
  ExternalLink,
  DownloadCloud,
  CheckCircle2,
  FolderOpen,
  Zap,
  Globe,
} from 'lucide-react';

interface Vault {
  id: string;
  capId?: string;
  owner: string;
  recipients: string[];
  timeoutMs: number;
  lastCheckin: number;
  status: 'active' | 'expiring' | 'expired' | 'claimed';
  autoCheckin: boolean;
  createdAt: number;
  hasClaimed: boolean;
}

const statusConfig = {
  active:   { label: 'ACTIVE',   cls: 'status-active' },
  expiring: { label: 'EXPIRING', cls: 'status-expiring' },
  expired:  { label: 'EXPIRED',  cls: 'status-expired' },
  claimed:  { label: 'CLAIMED',  cls: 'status-claimed' },
};

export default function Dashboard() {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const [createdVaults, setCreatedVaults]   = useState<Vault[]>([]);
  const [receivedVaults, setReceivedVaults] = useState<Vault[]>([]);
  const [isLoading, setIsLoading]           = useState(true);
  const [activeTab, setActiveTab]           = useState<'created' | 'received'>('created');
  const [tick, setTick]                     = useState(0);
  const [copiedId, setCopiedId]             = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (account) loadVaults();
  }, [account]);

  const loadVaults = async () => {
    setIsLoading(true);
    try {
      if (!account) return;
      const registryObj = await suiClient.getObject({
        id: process.env.NEXT_PUBLIC_REGISTRY_ID!,
        options: { showContent: true },
      });
      const registryFields = (registryObj.data?.content as any)?.fields;
      const vaultIds: string[] = registryFields?.vaults || [];
      if (vaultIds.length === 0) {
        setCreatedVaults([]); setReceivedVaults([]); setIsLoading(false); return;
      }
      const capObjects = await suiClient.getOwnedObjects({
        owner: account.address,
        filter: { StructType: `${process.env.NEXT_PUBLIC_PACKAGE_ID}::vault::VaultCap` },
        options: { showContent: true },
      });
      const capMap = new Map<string, string>();
      capObjects.data.forEach(obj => {
        const content = obj.data?.content as any;
        const vId = content?.fields?.vault_id;
        if (vId) capMap.set(vId, obj.data!.objectId);
      });
      const chunkSize = 50;
      const vaultObjects = [];
      for (let i = 0; i < vaultIds.length; i += chunkSize) {
        const chunk = vaultIds.slice(i, i + chunkSize);
        const res = await suiClient.multiGetObjects({ ids: chunk, options: { showContent: true } });
        vaultObjects.push(...res);
      }
      const parsedVaults = vaultObjects.map(obj => {
        const fields = (obj.data?.content as any)?.fields;
        if (!fields) return null;
        const capId = capMap.get(fields.id.id);
        const lastCheckinMs = Number(fields.last_checkin_ms);
        const timeoutMs = Number(fields.timeout_ms);
        const isExpired = fields.is_expired;
        let hasClaimed = false;
        const recipientsArray = fields.recipients || [];
        const recipients = recipientsArray.map((r: any) => {
          if (r.fields.has_claimed) hasClaimed = true;
          return r.fields.addr;
        });
        let status: 'active' | 'expiring' | 'expired' | 'claimed' = 'active';
        if (hasClaimed) status = 'claimed';
        else if (isExpired || Date.now() >= lastCheckinMs + timeoutMs) status = 'expired';
        else if (Date.now() >= lastCheckinMs + timeoutMs * 0.8) status = 'expiring';
        return { id: fields.id.id, capId, owner: fields.owner, recipients, timeoutMs, lastCheckin: lastCheckinMs, status, autoCheckin: fields.auto_checkin, createdAt: Number(fields.created_at_ms), hasClaimed } as Vault;
      }).filter(Boolean) as Vault[];
      setCreatedVaults(parsedVaults.filter(v => v.owner === account.address));
      setReceivedVaults(parsedVaults.filter(v => v.recipients.includes(account.address)));
    } catch (error) {
      console.error('Error fetching vaults:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckin = (vaultId: string, capId?: string) => {
    if (!capId) return;
    const tx = new Transaction();
    tx.moveCall({ target: `${process.env.NEXT_PUBLIC_PACKAGE_ID}::vault::check_in`, arguments: [tx.object(vaultId), tx.object(capId), tx.object('0x6')] });
    signAndExecute({ transaction: tx as any }, {
      onSuccess: () => setCreatedVaults(prev => prev.map(v => v.id === vaultId ? { ...v, lastCheckin: Date.now(), status: 'active' } : v)),
    });
  };

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const getTimeRemaining    = (vault: Vault) => Math.max(0, vault.timeoutMs - (Date.now() - vault.lastCheckin));
  const getProgressPercent  = (vault: Vault) => Math.min(100, ((Date.now() - vault.lastCheckin) / vault.timeoutMs) * 100);

  const formatTime = (ms: number) => {
    if (ms < 0) return '00:00:00:00';
    const days  = Math.floor(ms / 86400000);
    const hours = Math.floor((ms % 86400000) / 3600000);
    const mins  = Math.floor((ms % 3600000) / 60000);
    const secs  = Math.floor((ms % 60000) / 1000);
    return [days, hours, mins, secs].map(n => n.toString().padStart(2, '0')).join(':');
  };

  /* ── Not connected ── */
  if (!account) {
    return (
      <div className="min-h-screen flex flex-col bg-[#040810] w-full">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6">
          <div
            className="rounded-2xl border border-[rgba(0,212,255,0.15)] w-full max-w-md overflow-hidden"
            style={{ background: 'linear-gradient(135deg,rgba(8,15,30,0.95),rgba(13,25,41,0.9))', boxShadow: '0 24px 64px rgba(0,0,0,0.6),0 0 60px rgba(0,212,255,0.06)' }}
          >
            <div className="px-6 py-5 border-b border-[rgba(0,212,255,0.1)] flex items-center gap-3" style={{ background: 'rgba(0,212,255,0.04)' }}>
              <ShieldAlert className="w-5 h-5 text-[#00d4ff]" />
              <h2 className="font-bold text-[#e8f0fe] tracking-wide">Authentication Required</h2>
            </div>
            <div className="p-8">
              <p className="text-[#6b82a8] font-medium mb-8 leading-relaxed">Connect your wallet to access your Created and Received Vaults.</p>
              <div className="connect-btn"><ConnectButton /></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const vaultsToDisplay = activeTab === 'created' ? createdVaults : receivedVaults;

  return (
    <div className="min-h-screen flex flex-col bg-[#040810] w-full overflow-x-hidden">
      <Navbar />

      <div className="flex-1 w-full flex flex-col">
        {/* ── Page Header ── */}
        <div className="relative w-full border-b border-[rgba(0,212,255,0.08)] py-14 px-6 lg:px-12 overflow-hidden">
          <div className="absolute inset-0 line-grid opacity-30 pointer-events-none" />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 60% 80% at 0% 50%, rgba(0,212,255,0.07) 0%, transparent 60%)' }}
          />
          <div className="relative z-10 max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
            <div style={{ animation: 'fadeInUp 0.6s ease forwards' }}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(0,212,255,0.2)] bg-[rgba(0,212,255,0.05)] mb-6">
                <Shield className="w-3 h-3 text-[#00d4ff]" />
                <span className="text-[#00d4ff] text-[10px] font-bold uppercase tracking-widest">Management Interface</span>
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-[#e8f0fe] mb-3">
                User{' '}
                <span style={{ background: 'linear-gradient(135deg,#00d4ff,#7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  Dashboard
                </span>
              </h1>
              <p className="text-[#6b82a8] font-mono text-sm">
                {account.address.slice(0, 6)}…{account.address.slice(-4)}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3" style={{ animation: 'fadeInUp 0.6s 0.1s ease both' }}>
              <Link href="/live" className="btn-secondary inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold">
                <Globe className="w-4 h-4" /> Live Vaults
              </Link>
              <Link href="/claim" className="btn-secondary inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold border-[rgba(0,212,255,0.3)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.08)]">
                <DownloadCloud className="w-4 h-4" /> Claim Vault
              </Link>
              <Link href="/create" className="btn-primary inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold">
                <Plus className="w-4 h-4" /> Deploy New Vault
              </Link>
            </div>
          </div>
        </div>

        <div className="w-full max-w-7xl mx-auto px-6 lg:px-12 py-10 flex-1">
          {/* ── Tabs ── */}
          <div className="flex gap-2 mb-10">
            {(['created', 'received'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wide transition-all duration-200',
                  activeTab === tab
                    ? 'text-[#040810]'
                    : 'text-[#6b82a8] bg-[rgba(0,212,255,0.04)] border border-[rgba(0,212,255,0.1)] hover:border-[rgba(0,212,255,0.25)] hover:text-[#e8f0fe]'
                )}
                style={activeTab === tab ? {
                  background: 'linear-gradient(135deg,#00d4ff,#7c3aed)',
                  boxShadow: '0 0 20px rgba(0,212,255,0.25)',
                } : {}}
              >
                {tab === 'created' ? `Created (${createdVaults.length})` : `Received (${receivedVaults.length})`}
              </button>
            ))}
          </div>

          {/* ── Vault List ── */}
          {isLoading ? (
            <div className="rounded-2xl border border-[rgba(0,212,255,0.1)] p-16 text-center" style={{ background: 'rgba(8,15,30,0.6)' }}>
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 rounded-full border-2 border-[#00d4ff] border-t-transparent animate-spin" />
                <span className="text-[#6b82a8] font-mono text-sm uppercase tracking-widest">Scanning blockchain…</span>
              </div>
            </div>
          ) : vaultsToDisplay.length === 0 ? (
            <div
              className="rounded-2xl border border-[rgba(0,212,255,0.08)] p-16 flex flex-col items-center text-center"
              style={{ background: 'linear-gradient(135deg,rgba(8,15,30,0.9),rgba(13,25,41,0.7))' }}
            >
              <div className="w-16 h-16 rounded-2xl border border-[rgba(0,212,255,0.15)] bg-[rgba(0,212,255,0.05)] flex items-center justify-center mb-6">
                <FolderOpen className="w-8 h-8 text-[#6b82a8]" />
              </div>
              <h3 className="text-2xl font-bold text-[#e8f0fe] mb-3">No Vaults Found</h3>
              <p className="text-[#6b82a8] font-medium mb-8 max-w-md">
                {activeTab === 'created' ? "You haven't deployed any vaults yet." : "No one has sent you a vault yet."}
              </p>
              {activeTab === 'created' && (
                <Link href="/create" className="btn-primary inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm">
                  Deploy First Vault <Plus className="w-4 h-4" />
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {vaultsToDisplay.map(vault => {
                const config  = statusConfig[vault.status];
                const progress = getProgressPercent(vault);
                const remaining = getTimeRemaining(vault);

                return (
                  <div
                    key={vault.id}
                    className="vault-card rounded-2xl border border-[rgba(0,212,255,0.1)] overflow-hidden"
                    style={{ background: 'linear-gradient(135deg,rgba(8,15,30,0.95),rgba(13,25,41,0.85))' }}
                  >
                    <div className="flex flex-col lg:flex-row">
                      {/* Left block */}
                      <div className="p-6 border-b lg:border-b-0 lg:border-r border-[rgba(0,212,255,0.08)] w-full lg:w-64 flex flex-col justify-between bg-[rgba(0,212,255,0.02)]">
                        <div>
                          <div className="flex justify-between items-start mb-5">
                            <div className="w-10 h-10 rounded-xl border border-[rgba(0,212,255,0.2)] bg-[rgba(0,212,255,0.06)] flex items-center justify-center">
                              <Lock className="w-5 h-5 text-[#00d4ff]" />
                            </div>
                            <span className={cn('px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest', config.cls)}>
                              {config.label}
                            </span>
                          </div>
                          <div className="font-mono text-sm font-bold text-[#e8f0fe] mb-1">
                            {vault.id.slice(0, 8)}…{vault.id.slice(-6)}
                          </div>
                          <div className="text-[10px] text-[#6b82a8] font-mono uppercase tracking-widest">
                            Owner: {vault.owner.slice(0, 6)}…{vault.owner.slice(-4)}
                          </div>
                        </div>
                      </div>

                      {/* Middle block */}
                      <div className="p-6 flex-1 flex flex-col justify-between">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-6">
                          {[
                            { icon: <Clock className="w-3.5 h-3.5" />, label: 'Threshold',  value: formatTime(vault.timeoutMs) },
                            { icon: <Users className="w-3.5 h-3.5" />, label: 'Authorized', value: `${vault.recipients.length} Wallets` },
                            { icon: <Activity className="w-3.5 h-3.5" />, label: 'Last Ping', value: `-${formatTime(Date.now() - vault.lastCheckin)}` },
                            { icon: <Bot className="w-3.5 h-3.5" />,  label: 'Auto-Ping',  value: vault.autoCheckin ? 'ACTIVE' : 'OFF', color: vault.autoCheckin ? '#00f5a0' : undefined },
                          ].map((item, i) => (
                            <div key={i}>
                              <div className="flex items-center gap-1.5 text-[#6b82a8] mb-1.5">
                                {item.icon}
                                <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
                              </div>
                              <div className="font-mono font-bold text-sm" style={{ color: item.color || '#e8f0fe' }}>
                                {item.value}
                              </div>
                            </div>
                          ))}
                        </div>

                        {vault.status === 'claimed' ? (
                          <div
                            className="w-full py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest"
                            style={{ background: 'rgba(0,212,255,0.08)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.2)' }}
                          >
                            <CheckCircle2 className="w-4 h-4" /> Payload Decrypted by Recipient
                          </div>
                        ) : (
                          <div>
                            <div className="flex justify-between mb-2">
                              <span className="text-[10px] text-[#6b82a8] font-bold uppercase tracking-widest">Countdown Trigger</span>
                              <span
                                className="text-[10px] font-mono font-bold"
                                style={{ color: progress > 80 ? '#ff4d6d' : '#e8f0fe' }}
                              >
                                T-{formatTime(remaining)}
                              </span>
                            </div>
                            <div className="progress-track h-2 w-full">
                              <div
                                className="progress-fill"
                                style={{
                                  width: `${progress}%`,
                                  background: progress > 80
                                    ? 'linear-gradient(90deg,#ff4d6d,#ff4d6d80)'
                                    : progress > 50
                                    ? 'linear-gradient(90deg,#ffb627,#ff4d6d)'
                                    : 'linear-gradient(90deg,#00d4ff,#7c3aed)',
                                  boxShadow: progress > 80 ? '0 0 12px rgba(255,77,109,0.5)' : '0 0 12px rgba(0,212,255,0.4)',
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right block: actions */}
                      <div className="p-5 border-t lg:border-t-0 lg:border-l border-[rgba(0,212,255,0.08)] w-full lg:w-44 bg-[rgba(0,212,255,0.02)] flex flex-col gap-2.5 justify-center">
                        {activeTab === 'created' ? (
                          <>
                            <button
                              onClick={() => handleCheckin(vault.id, vault.capId)}
                              disabled={vault.status === 'claimed' || vault.status === 'expired'}
                              className={cn(
                                'w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 transition-all duration-200',
                                vault.status === 'claimed' || vault.status === 'expired'
                                  ? 'opacity-30 cursor-not-allowed bg-[rgba(0,212,255,0.05)] border border-[rgba(0,212,255,0.1)] text-[#6b82a8]'
                                  : 'btn-primary'
                              )}
                            >
                              <HeartPulse className="w-3.5 h-3.5" /> Ping Alive
                            </button>
                            <button
                              onClick={() => handleCopy(vault.id)}
                              className="w-full py-2 px-4 rounded-xl text-[10px] font-bold uppercase tracking-wide flex items-center justify-center gap-2 border border-[rgba(0,212,255,0.15)] text-[#6b82a8] hover:text-[#e8f0fe] hover:bg-[rgba(0,212,255,0.06)] transition-all"
                            >
                              {copiedId === vault.id ? <CheckCircle2 className="w-3 h-3 text-[#00f5a0]" /> : <Copy className="w-3 h-3" />}
                              {copiedId === vault.id ? 'Copied!' : 'Copy ID'}
                            </button>
                          </>
                        ) : (
                          <Link
                            href="/claim"
                            className="btn-primary w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2"
                          >
                            <DownloadCloud className="w-3.5 h-3.5" /> Claim Vault
                          </Link>
                        )}
                        <a
                          href={`https://suiscan.xyz/testnet/object/${vault.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full py-2 px-4 rounded-xl text-[10px] font-bold uppercase tracking-wide flex items-center justify-center gap-2 border border-[rgba(0,212,255,0.1)] text-[#6b82a8] hover:text-[#00d4ff] hover:border-[rgba(0,212,255,0.3)] transition-all"
                        >
                          <ExternalLink className="w-3 h-3" /> Explorer
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
