'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { useSuiClient } from '@mysten/dapp-kit';
import { cn } from '@/lib/utils';
import { Lock, Clock, Activity, Globe, Database, ExternalLink, Bot, Users, Shield, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface LiveVault {
  id: string;
  owner: string;
  timeoutMs: number;
  lastCheckin: number;
  status: 'active' | 'expiring' | 'expired' | 'claimed';
  autoCheckin: boolean;
  createdAt: number;
  recipientCount: number;
}

const statusMeta = {
  active:   { cls: 'status-active',   dot: '#00f5a0', label: 'ACTIVE' },
  expiring: { cls: 'status-expiring', dot: '#ffb627', label: 'EXPIRING' },
  expired:  { cls: 'status-expired',  dot: '#ff4d6d', label: 'EXPIRED' },
  claimed:  { cls: 'status-claimed',  dot: '#00d4ff', label: 'CLAIMED' },
};

export default function LiveVaults() {
  const suiClient = useSuiClient();
  const [vaults, setVaults]       = useState<LiveVault[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tick, setTick]           = useState(0);
  const [filter, setFilter]       = useState<'all' | 'active' | 'expiring' | 'expired' | 'claimed'>('all');

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => { loadVaults(); }, []);

  const loadVaults = async (refresh = false) => {
    if (refresh) setIsRefreshing(true); else setIsLoading(true);
    try {
      const registryObj = await suiClient.getObject({ id: process.env.NEXT_PUBLIC_REGISTRY_ID!, options: { showContent: true } });
      const registryFields = (registryObj.data?.content as any)?.fields;
      const vaultIds: string[] = registryFields?.vaults || [];
      if (vaultIds.length === 0) { setVaults([]); return; }
      const chunkSize = 50;
      const vaultObjects = [];
      for (let i = 0; i < vaultIds.length; i += chunkSize) {
        const res = await suiClient.multiGetObjects({ ids: vaultIds.slice(i, i + chunkSize), options: { showContent: true } });
        vaultObjects.push(...res);
      }
      const parsed = vaultObjects.map(obj => {
        const fields = (obj.data?.content as any)?.fields;
        if (!fields) return null;
        const lastCheckinMs = Number(fields.last_checkin_ms);
        const timeoutMs     = Number(fields.timeout_ms);
        const isExpired     = fields.is_expired;
        let hasClaimed      = false;
        const recipientsArray = fields.recipients || [];
        recipientsArray.forEach((r: any) => { if (r.fields.has_claimed) hasClaimed = true; });
        let status: LiveVault['status'] = 'active';
        if (hasClaimed)                                        status = 'claimed';
        else if (isExpired || Date.now() >= lastCheckinMs + timeoutMs) status = 'expired';
        else if (Date.now() >= lastCheckinMs + timeoutMs * 0.8)        status = 'expiring';
        return { id: fields.id.id, owner: fields.owner, timeoutMs, lastCheckin: lastCheckinMs, status, autoCheckin: fields.auto_checkin, createdAt: Number(fields.created_at_ms), recipientCount: recipientsArray.length } as LiveVault;
      }).filter(Boolean) as LiveVault[];
      parsed.sort((a, b) => b.createdAt - a.createdAt);
      setVaults(parsed);
    } catch (err) { console.error(err); } finally { setIsLoading(false); setIsRefreshing(false); }
  };

  const formatTime = (ms: number) => {
    if (ms <= 0) return '00:00:00:00';
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return [d, h, m, s].map(n => n.toString().padStart(2, '0')).join(':');
  };

  const filtered = filter === 'all' ? vaults : vaults.filter(v => v.status === filter);
  const counts   = { all: vaults.length, active: vaults.filter(v => v.status === 'active').length, expiring: vaults.filter(v => v.status === 'expiring').length, expired: vaults.filter(v => v.status === 'expired').length, claimed: vaults.filter(v => v.status === 'claimed').length };

  return (
    <div className="min-h-screen flex flex-col bg-[#040810] w-full overflow-x-hidden">
      <Navbar />

      {/* ── Header ── */}
      <div className="relative w-full border-b border-[rgba(0,212,255,0.08)] py-14 px-6 lg:px-12 overflow-hidden">
        <div className="absolute inset-0 line-grid opacity-25 pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 60% at 80% 50%, rgba(0,212,255,0.1) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 10% 80%, rgba(124,58,237,0.1) 0%, transparent 60%)' }} />

        <div className="relative z-10 max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
          <div style={{ animation: 'fadeInUp 0.6s ease forwards' }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(0,212,255,0.2)] bg-[rgba(0,212,255,0.06)] mb-6">
              <Globe className="w-3 h-3 text-[#00d4ff]" />
              <span className="text-[#00d4ff] text-[10px] font-bold uppercase tracking-widest">Global Network Feed</span>
            </div>
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-[#e8f0fe] mb-4">
              Live{' '}
              <span style={{ background: 'linear-gradient(135deg,#00d4ff,#7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Vaults
              </span>
            </h1>
            <p className="text-[#6b82a8] font-medium max-w-xl text-sm leading-relaxed">
              Real-time registry of all decentralized inheritance and emergency backup vaults deployed on the Abyss Protocol network.
            </p>
          </div>

          {/* Stats & refresh */}
          <div className="flex flex-col gap-4 items-end" style={{ animation: 'fadeInUp 0.6s 0.1s ease both' }}>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(0,245,160,0.25)] bg-[rgba(0,245,160,0.06)]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00f5a0] opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00f5a0]" />
                </span>
                <span className="text-[#00f5a0] text-xs font-bold">SUI TESTNET</span>
              </div>
              <button
                onClick={() => loadVaults(true)}
                className="w-9 h-9 rounded-xl border border-[rgba(0,212,255,0.2)] bg-[rgba(0,212,255,0.06)] flex items-center justify-center text-[#6b82a8] hover:text-[#00d4ff] hover:border-[rgba(0,212,255,0.4)] transition-all"
              >
                <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
              </button>
            </div>
            <div className="text-3xl font-bold font-mono" style={{ background: 'linear-gradient(135deg,#00d4ff,#7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              {vaults.length}
            </div>
            <div className="text-[10px] text-[#6b82a8] uppercase tracking-widest font-bold">Total Vaults</div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto px-6 lg:px-12 py-10 flex-1">
        {/* ── Filter Tabs ── */}
        <div className="flex flex-wrap gap-2 mb-8">
          {(['all', 'active', 'expiring', 'expired', 'claimed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all duration-200"
              style={filter === f ? {
                background: 'linear-gradient(135deg,#00d4ff,#7c3aed)',
                color: '#040810',
                boxShadow: '0 0 16px rgba(0,212,255,0.25)',
              } : {
                background: 'rgba(8,15,30,0.8)',
                border: '1px solid rgba(0,212,255,0.12)',
                color: '#6b82a8',
              }}
            >
              {f === 'all' ? `All (${counts.all})` : `${f} (${counts[f]})`}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        {isLoading ? (
          <div className="rounded-2xl border border-[rgba(0,212,255,0.1)] p-24 flex flex-col items-center justify-center text-center" style={{ background: 'rgba(8,15,30,0.6)' }}>
            <div className="w-14 h-14 rounded-full border-2 border-[#00d4ff] border-t-transparent animate-spin mb-6" />
            <div className="text-[#6b82a8] font-mono text-sm uppercase tracking-widest">Synchronizing with blockchain…</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-[rgba(0,212,255,0.08)] p-24 flex flex-col items-center text-center" style={{ background: 'linear-gradient(135deg,rgba(8,15,30,0.9),rgba(13,25,41,0.7))' }}>
            <div className="w-16 h-16 rounded-2xl border border-[rgba(0,212,255,0.15)] bg-[rgba(0,212,255,0.05)] flex items-center justify-center mb-6">
              <Activity className="w-8 h-8 text-[#6b82a8]" />
            </div>
            <h3 className="text-2xl font-bold text-[#e8f0fe] mb-3">
              {filter === 'all' ? 'Network Silence' : `No ${filter} vaults`}
            </h3>
            <p className="text-[#6b82a8] font-medium mb-8 max-w-md text-sm">
              {filter === 'all' ? 'No vaults deployed yet. Be the first to secure your digital legacy.' : `No vaults with "${filter}" status found.`}
            </p>
            {filter === 'all' && (
              <Link href="/create" className="btn-primary inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm">
                Deploy First Vault
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((vault, idx) => {
              const meta     = statusMeta[vault.status];
              const progress = vault.status === 'claimed' || vault.status === 'expired'
                ? 100
                : Math.min(100, ((Date.now() - vault.lastCheckin) / vault.timeoutMs) * 100);
              const remaining = Math.max(0, vault.timeoutMs - (Date.now() - vault.lastCheckin));

              return (
                <div
                  key={vault.id}
                  className="vault-card rounded-2xl border border-[rgba(0,212,255,0.08)] overflow-hidden flex flex-col"
                  style={{
                    background: 'linear-gradient(135deg,rgba(8,15,30,0.95),rgba(13,25,41,0.85))',
                    animation: `fadeInUp 0.5s ${Math.min(idx * 0.04, 0.3)}s ease both`,
                  }}
                >
                  {/* Status bar */}
                  <div className="px-4 py-3 border-b border-[rgba(0,212,255,0.08)] flex items-center justify-between" style={{ background: 'rgba(0,212,255,0.02)' }}>
                    <span className={cn('px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5', meta.cls)}>
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: meta.dot, boxShadow: `0 0 6px ${meta.dot}` }} />
                      {meta.label}
                    </span>
                    <a
                      href={`https://suiscan.xyz/testnet/object/${vault.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#6b82a8] hover:text-[#00d4ff] transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>

                  <div className="p-5 flex-1 flex flex-col gap-4">
                    {/* Vault ID */}
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-[#6b82a8] mb-1.5">Vault ID</div>
                      <div className="font-mono text-xs font-bold text-[#e8f0fe] break-all px-3 py-2.5 rounded-lg border border-[rgba(0,212,255,0.1)] bg-[rgba(0,212,255,0.03)]">
                        {vault.id.slice(0, 10)}…{vault.id.slice(-10)}
                      </div>
                    </div>

                    {/* Metadata grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { icon: <Shield className="w-3 h-3" />,  label: 'Owner',      value: `${vault.owner.slice(0,6)}…${vault.owner.slice(-4)}` },
                        { icon: <Clock className="w-3 h-3" />,   label: 'Time Left',  value: vault.status === 'claimed' || vault.status === 'expired' ? 'TRIGGERED' : formatTime(remaining) },
                        { icon: <Users className="w-3 h-3" />,   label: 'Recipients', value: `${vault.recipientCount} wallets` },
                        { icon: <Bot className="w-3 h-3" />,     label: 'Auto-Ping',  value: vault.autoCheckin ? 'ON' : 'OFF', color: vault.autoCheckin ? '#00f5a0' : undefined },
                      ].map((item, i) => (
                        <div key={i} className="rounded-lg border border-[rgba(0,212,255,0.08)] p-2.5 bg-[rgba(0,212,255,0.02)]">
                          <div className="flex items-center gap-1.5 text-[#6b82a8] mb-1">
                            {item.icon}
                            <span className="text-[9px] font-bold uppercase tracking-widest">{item.label}</span>
                          </div>
                          <div className="font-mono text-xs font-bold" style={{ color: item.color || '#e8f0fe' }}>{item.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Progress bar */}
                    <div>
                      <div className="progress-track h-1.5 w-full">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${progress}%`,
                            background: progress > 80
                              ? 'linear-gradient(90deg,#ff4d6d,#ffb627)'
                              : progress > 50
                              ? 'linear-gradient(90deg,#ffb627,#00d4ff)'
                              : 'linear-gradient(90deg,#00d4ff,#7c3aed)',
                          }}
                        />
                      </div>
                    </div>

                    {/* Date */}
                    <div className="text-[10px] font-bold text-[#6b82a8] uppercase tracking-widest flex items-center gap-1.5 border-t border-[rgba(0,212,255,0.06)] pt-3 mt-auto">
                      <Clock className="w-3 h-3" />
                      Created {new Date(vault.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
