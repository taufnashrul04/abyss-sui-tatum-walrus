'use client';

import { useState, useRef, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChat } from '@ai-sdk/react';
import {
  Shield,
  BarChart3,
  Activity,
  Send,
  Loader2,
  Sparkles,
  Brain,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  FileText,
} from 'lucide-react';

/* ───────────────────── helpers ───────────────────── */

function truncateAddress(addr: string) {
  if (!addr) return '';
  return addr.length > 10 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;
}

function formatSui(mist: string | number) {
  const val = Number(mist) / 1e9;
  return val.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

function relativeTime(ts: string | number) {
  const now = Date.now();
  const then = typeof ts === 'string' ? new Date(ts).getTime() : Number(ts);
  const diff = now - then;
  if (Number.isNaN(diff)) return 'N/A';
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* ──────────── risk badge colour ──────────── */

function riskColor(level: string) {
  const l = (level || '').toLowerCase();
  if (l === 'low') return { bg: 'rgba(0,245,160,0.12)', border: 'rgba(0,245,160,0.35)', text: '#00f5a0' };
  if (l === 'medium') return { bg: 'rgba(255,182,39,0.12)', border: 'rgba(255,182,39,0.35)', text: '#ffb627' };
  return { bg: 'rgba(255,77,109,0.12)', border: 'rgba(255,77,109,0.35)', text: '#ff4d6d' };
}

function healthColor(status: string) {
  const s = (status || '').toLowerCase();
  if (s === 'healthy') return { bg: 'rgba(0,245,160,0.12)', border: 'rgba(0,245,160,0.35)', text: '#00f5a0' };
  if (s === 'warning') return { bg: 'rgba(255,182,39,0.12)', border: 'rgba(255,182,39,0.35)', text: '#ffb627' };
  return { bg: 'rgba(255,77,109,0.12)', border: 'rgba(255,77,109,0.35)', text: '#ff4d6d' };
}

/* ──────────── animation variants ──────────── */

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

/* ──────────── types ──────────── */

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/* ═══════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════ */

export default function AIToolsPage() {
  /* ── Security Scanner state ── */
  const [secAddr, setSecAddr] = useState('');
  const [secLoading, setSecLoading] = useState(false);
  const [secResult, setSecResult] = useState<any>(null);
  const [secError, setSecError] = useState('');

  /* ── Portfolio Analyzer state ── */
  const [portAddr, setPortAddr] = useState('');
  const [portLoading, setPortLoading] = useState(false);
  const [portResult, setPortResult] = useState<any>(null);
  const [portError, setPortError] = useState('');

  /* ── Vault Health state ── */
  const [vaultId, setVaultId] = useState('');
  const [vaultLoading, setVaultLoading] = useState(false);
  const [vaultResult, setVaultResult] = useState<any>(null);
  const [vaultError, setVaultError] = useState('');

  /* ── State variables for the 3 tools ── */
  async function scanAddress() {
    if (!secAddr.trim()) return;
    setSecLoading(true);
    setSecError('');
    setSecResult(null);
    try {
      const res = await fetch('/api/ai/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: secAddr.trim() }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const resData = await res.json();
      if (!resData.success) throw new Error(resData.error || 'API error');
      setSecResult(resData.data);
    } catch (e: any) {
      setSecError(e.message || 'Something went wrong');
    } finally {
      setSecLoading(false);
    }
  }

  async function analyzePortfolio() {
    if (!portAddr.trim()) return;
    setPortLoading(true);
    setPortError('');
    setPortResult(null);
    try {
      const res = await fetch(`/api/ai/portfolio?address=${encodeURIComponent(portAddr.trim())}`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const resData = await res.json();
      if (!resData.success) throw new Error(resData.error || 'API error');
      setPortResult(resData.data);
    } catch (e: any) {
      setPortError(e.message || 'Something went wrong');
    } finally {
      setPortLoading(false);
    }
  }

  async function checkVaultHealth() {
    if (!vaultId.trim()) return;
    setVaultLoading(true);
    setVaultError('');
    setVaultResult(null);
    try {
      const res = await fetch(`/api/ai/vault-health?vaultId=${encodeURIComponent(vaultId.trim())}`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const resData = await res.json();
      if (!resData.success) throw new Error(resData.error || 'API error');
      setVaultResult(resData.data);
    } catch (e: any) {
      setVaultError(e.message || 'Something went wrong');
    } finally {
      setVaultLoading(false);
    }
  }

  /* ════════════════════ RENDER ════════════════════ */

  return (
    <div className="min-h-screen bg-[#040810] relative w-full flex flex-col overflow-x-hidden">
      <Navbar />

      {/* Background effects */}
      <div className="absolute inset-0 line-grid opacity-40 pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 70% 50% at 50% 0%, rgba(0,212,255,0.14) 0%, transparent 65%),
            radial-gradient(ellipse 50% 40% at 90% 30%, rgba(124,58,237,0.14) 0%, transparent 60%),
            radial-gradient(ellipse 40% 35% at 10% 70%, rgba(0,245,160,0.06) 0%, transparent 60%)
          `,
        }}
      />

      {/* Floating orbs */}
      <div
        className="absolute top-40 right-1/4 w-72 h-72 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)',
          animation: 'float 8s ease-in-out infinite',
          filter: 'blur(50px)',
        }}
      />
      <div
        className="absolute bottom-1/3 left-1/4 w-56 h-56 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 70%)',
          animation: 'float 10s ease-in-out infinite reverse',
          filter: 'blur(50px)',
        }}
      />

      {/* ═══ HEADER ═══ */}
      <section className="relative z-10 w-full pt-24 pb-8 px-6 md:px-12 lg:px-20">
        <div className="max-w-7xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-[rgba(0,212,255,0.25)] bg-[rgba(0,212,255,0.06)] mb-8"
          >
            <Sparkles
              className="w-3.5 h-3.5 text-[#00d4ff]"
              style={{ animation: 'pulse-glow 2s ease-in-out infinite' }}
            />
            <span className="text-[#00d4ff] text-xs font-bold uppercase tracking-widest">MCP Enabled</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tight text-[#e8f0fe] mb-4"
          >
            AI{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Tools
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-[#6b82a8] font-medium max-w-xl mx-auto"
          >
            Powered by{' '}
            <span className="text-[#00d4ff] font-bold">Tatum MCP</span> &{' '}
            <span className="text-[#7c3aed] font-bold">Abyss AI</span>
          </motion.p>
        </div>
      </section>

      {/* ═══ TOOL CARDS GRID ═══ */}
      <section className="relative z-10 w-full px-6 md:px-12 lg:px-20 py-10">
        <motion.div
          className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {/* ─── SECURITY SCANNER ─── */}
          <motion.div variants={cardVariants} className="group">
            <div
              className="vault-card rounded-2xl border border-[rgba(0,212,255,0.15)] overflow-hidden h-full flex flex-col"
              style={{
                background: 'rgba(8,15,30,0.6)',
                backdropFilter: 'blur(20px)',
              }}
            >
              {/* Top glow line */}
              <div
                className="h-px w-full"
                style={{ background: 'linear-gradient(90deg, transparent, #00d4ff, transparent)' }}
              />

              <div className="p-6 flex-1 flex flex-col">
                {/* Icon + Title */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center border border-[rgba(0,212,255,0.25)] transition-all duration-300 group-hover:scale-110"
                    style={{
                      background: 'rgba(0,212,255,0.1)',
                      boxShadow: '0 0 20px rgba(0,212,255,0.15)',
                    }}
                  >
                    <Shield className="w-5 h-5 text-[#00d4ff]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#e8f0fe]">Security Scanner</h3>
                    <p className="text-xs text-[#6b82a8] font-medium">Address risk assessment</p>
                  </div>
                </div>

                <p className="text-sm text-[#6b82a8] mb-5 leading-relaxed font-medium">
                  Analyze any Sui address for suspicious activity and risk assessment
                </p>

                {/* Input */}
                <div className="flex gap-2 mb-4">
                  <input
                    id="security-scanner-input"
                    type="text"
                    placeholder="Enter Sui address..."
                    value={secAddr}
                    onChange={(e) => setSecAddr(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && scanAddress()}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-mono text-[#e8f0fe] placeholder-[#6b82a8] outline-none transition-all duration-300 focus:border-[#00d4ff]"
                    style={{
                      background: 'rgba(8,15,30,0.8)',
                      border: '1px solid rgba(0,212,255,0.15)',
                    }}
                  />
                  <button
                    id="security-scanner-btn"
                    onClick={scanAddress}
                    disabled={secLoading || !secAddr.trim()}
                    className="btn-primary px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                  >
                    {secLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Scan Address'}
                  </button>
                </div>

                {/* Error */}
                {secError && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(255,77,109,0.08)] border border-[rgba(255,77,109,0.2)] mb-3">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#ff4d6d] flex-shrink-0" />
                    <span className="text-xs text-[#ff4d6d] font-medium">{secError}</span>
                  </div>
                )}

                {/* Result */}
                {secResult && (
                  <div className="mt-auto space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#6b82a8] uppercase tracking-widest font-bold">Risk Level</span>
                      <span
                        className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full"
                        style={{
                          background: riskColor(secResult.riskLevel).bg,
                          border: `1px solid ${riskColor(secResult.riskLevel).border}`,
                          color: riskColor(secResult.riskLevel).text,
                        }}
                      >
                        {secResult.riskLevel}
                      </span>
                    </div>

                    {/* Risk Score Progress */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-[#6b82a8] font-medium">Risk Score</span>
                        <span className="text-xs text-[#e8f0fe] font-mono font-bold">{secResult.riskScore}/100</span>
                      </div>
                      <div className="progress-track h-2">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${secResult.riskScore}%`,
                            background:
                              secResult.riskScore < 30
                                ? 'linear-gradient(90deg, #00f5a0, #00d4ff)'
                                : secResult.riskScore < 70
                                ? 'linear-gradient(90deg, #ffb627, #ff8c00)'
                                : 'linear-gradient(90deg, #ff4d6d, #ff2040)',
                          }}
                        />
                      </div>
                    </div>

                    {/* Details */}
                    {secResult.details && secResult.details.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-[#6b82a8] uppercase tracking-widest font-bold">Details</span>
                        {secResult.details.map((d: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-[#e8f0fe] font-medium">
                            <CheckCircle2 className="w-3 h-3 text-[#00d4ff] mt-0.5 flex-shrink-0" />
                            {d}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[rgba(0,212,255,0.08)]">
                      <div>
                        <span className="text-[10px] text-[#6b82a8] uppercase tracking-widest">Recent TX</span>
                        <div className="text-sm text-[#e8f0fe] font-mono font-bold">{secResult.recentTxCount ?? '—'}</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#6b82a8] uppercase tracking-widest">Last Activity</span>
                        <div className="text-sm text-[#e8f0fe] font-mono font-bold">
                          {secResult.lastActivity ? relativeTime(secResult.lastActivity) : '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* ─── PORTFOLIO ANALYZER ─── */}
          <motion.div variants={cardVariants} className="group">
            <div
              className="vault-card rounded-2xl border border-[rgba(124,58,237,0.15)] overflow-hidden h-full flex flex-col"
              style={{
                background: 'rgba(8,15,30,0.6)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <div
                className="h-px w-full"
                style={{ background: 'linear-gradient(90deg, transparent, #7c3aed, transparent)' }}
              />

              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center border border-[rgba(124,58,237,0.25)] transition-all duration-300 group-hover:scale-110"
                    style={{
                      background: 'rgba(124,58,237,0.1)',
                      boxShadow: '0 0 20px rgba(124,58,237,0.15)',
                    }}
                  >
                    <BarChart3 className="w-5 h-5 text-[#7c3aed]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#e8f0fe]">Portfolio Analyzer</h3>
                    <p className="text-xs text-[#6b82a8] font-medium">Wallet balance overview</p>
                  </div>
                </div>

                <p className="text-sm text-[#6b82a8] mb-5 leading-relaxed font-medium">
                  View complete wallet portfolio including balances and assets
                </p>

                <div className="flex gap-2 mb-4">
                  <input
                    id="portfolio-analyzer-input"
                    type="text"
                    placeholder="Enter Sui address..."
                    value={portAddr}
                    onChange={(e) => setPortAddr(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && analyzePortfolio()}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-mono text-[#e8f0fe] placeholder-[#6b82a8] outline-none transition-all duration-300 focus:border-[#7c3aed]"
                    style={{
                      background: 'rgba(8,15,30,0.8)',
                      border: '1px solid rgba(124,58,237,0.15)',
                    }}
                  />
                  <button
                    id="portfolio-analyzer-btn"
                    onClick={analyzePortfolio}
                    disabled={portLoading || !portAddr.trim()}
                    className="btn-primary px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                  >
                    {portLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Analyze'}
                  </button>
                </div>

                {portError && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(255,77,109,0.08)] border border-[rgba(255,77,109,0.2)] mb-3">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#ff4d6d] flex-shrink-0" />
                    <span className="text-xs text-[#ff4d6d] font-medium">{portError}</span>
                  </div>
                )}

                {portResult && (
                  <div className="mt-auto space-y-3">
                    {/* SUI Balance */}
                    <div className="rounded-xl p-4 border border-[rgba(124,58,237,0.15)] bg-[rgba(124,58,237,0.05)]">
                      <span className="text-[10px] text-[#6b82a8] uppercase tracking-widest font-bold">SUI Balance</span>
                      <div
                        className="text-2xl font-bold font-mono mt-1"
                        style={{
                          background: 'linear-gradient(135deg, #7c3aed, #00d4ff)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}
                      >
                        {formatSui(portResult.suiBalance ?? 0)} SUI
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg p-3 border border-[rgba(0,212,255,0.1)] bg-[rgba(0,212,255,0.03)]">
                        <span className="text-[10px] text-[#6b82a8] uppercase tracking-widest">Token Types</span>
                        <div className="text-lg text-[#e8f0fe] font-mono font-bold">{portResult.totalTokenTypes ?? 0}</div>
                      </div>
                      <div className="rounded-lg p-3 border border-[rgba(0,212,255,0.1)] bg-[rgba(0,212,255,0.03)]">
                        <span className="text-[10px] text-[#6b82a8] uppercase tracking-widest">Owned Objects</span>
                        <div className="text-lg text-[#e8f0fe] font-mono font-bold">{portResult.ownedObjectsCount ?? 0}</div>
                      </div>
                    </div>

                    {/* Token List */}
                    {portResult.balances && portResult.balances.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] text-[#6b82a8] uppercase tracking-widest font-bold">Tokens</span>
                        <div className="rounded-lg border border-[rgba(0,212,255,0.08)] overflow-hidden">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-[rgba(0,212,255,0.08)] bg-[rgba(0,212,255,0.03)]">
                                <th className="text-left text-[#6b82a8] font-bold uppercase tracking-widest px-3 py-2 text-[10px]">
                                  Token
                                </th>
                                <th className="text-right text-[#6b82a8] font-bold uppercase tracking-widest px-3 py-2 text-[10px]">
                                  Balance
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {portResult.balances.map((t: any, i: number) => (
                                <tr key={i} className="border-b border-[rgba(0,212,255,0.05)] last:border-0">
                                  <td className="px-3 py-2 text-[#e8f0fe] font-mono font-medium">
                                    {t.symbol || truncateAddress(t.coinType || '')}
                                  </td>
                                  <td className="px-3 py-2 text-right text-[#e8f0fe] font-mono font-bold">
                                    {t.totalBalance != null ? formatSui(t.totalBalance) : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* ─── VAULT HEALTH MONITOR ─── */}
          <motion.div variants={cardVariants} className="group">
            <div
              className="vault-card rounded-2xl border border-[rgba(0,245,160,0.15)] overflow-hidden h-full flex flex-col"
              style={{
                background: 'rgba(8,15,30,0.6)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <div
                className="h-px w-full"
                style={{ background: 'linear-gradient(90deg, transparent, #00f5a0, transparent)' }}
              />

              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center border border-[rgba(0,245,160,0.25)] transition-all duration-300 group-hover:scale-110"
                    style={{
                      background: 'rgba(0,245,160,0.1)',
                      boxShadow: '0 0 20px rgba(0,245,160,0.15)',
                    }}
                  >
                    <Activity className="w-5 h-5 text-[#00f5a0]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#e8f0fe]">Vault Health Monitor</h3>
                    <p className="text-xs text-[#6b82a8] font-medium">Countdown & status check</p>
                  </div>
                </div>

                <p className="text-sm text-[#6b82a8] mb-5 leading-relaxed font-medium">
                  Check vault countdown status and health assessment
                </p>

                <div className="flex gap-2 mb-4">
                  <input
                    id="vault-health-input"
                    type="text"
                    placeholder="Enter Vault ID..."
                    value={vaultId}
                    onChange={(e) => setVaultId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && checkVaultHealth()}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-mono text-[#e8f0fe] placeholder-[#6b82a8] outline-none transition-all duration-300 focus:border-[#00f5a0]"
                    style={{
                      background: 'rgba(8,15,30,0.8)',
                      border: '1px solid rgba(0,245,160,0.15)',
                    }}
                  />
                  <button
                    id="vault-health-btn"
                    onClick={checkVaultHealth}
                    disabled={vaultLoading || !vaultId.trim()}
                    className="btn-primary px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                  >
                    {vaultLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Check Health'}
                  </button>
                </div>

                {vaultError && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(255,77,109,0.08)] border border-[rgba(255,77,109,0.2)] mb-3">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#ff4d6d] flex-shrink-0" />
                    <span className="text-xs text-[#ff4d6d] font-medium">{vaultError}</span>
                  </div>
                )}

                {vaultResult && (
                  <div className="mt-auto space-y-3">
                    {/* Health Status */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#6b82a8] uppercase tracking-widest font-bold">Health Status</span>
                      <span
                        className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full"
                        style={{
                          background: healthColor(vaultResult.healthStatus).bg,
                          border: `1px solid ${healthColor(vaultResult.healthStatus).border}`,
                          color: healthColor(vaultResult.healthStatus).text,
                        }}
                      >
                        {vaultResult.healthStatus}
                      </span>
                    </div>

                    {/* Progress */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-[#6b82a8] font-medium">Time Progress</span>
                        <span className="text-xs text-[#e8f0fe] font-mono font-bold">
                          {vaultResult.percentage != null ? `${vaultResult.percentage}%` : '—'}
                        </span>
                      </div>
                      <div className="progress-track h-2">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${vaultResult.percentage ?? 0}%`,
                            background:
                              (vaultResult.healthStatus || '').toLowerCase() === 'healthy'
                                ? 'linear-gradient(90deg, #00f5a0, #00d4ff)'
                                : (vaultResult.healthStatus || '').toLowerCase() === 'warning'
                                ? 'linear-gradient(90deg, #ffb627, #ff8c00)'
                                : 'linear-gradient(90deg, #ff4d6d, #ff2040)',
                          }}
                        />
                      </div>
                    </div>

                    {/* Time remaining */}
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-[#00d4ff]" />
                      <span className="text-xs text-[#6b82a8] font-medium">Time Remaining:</span>
                      <span className="text-xs text-[#e8f0fe] font-mono font-bold">
                        {vaultResult.timeRemaining ?? '—'}
                      </span>
                    </div>

                    {/* Meta grid */}
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[rgba(0,245,160,0.08)]">
                      <div className="flex items-center gap-2">
                        <Users className="w-3 h-3 text-[#6b82a8]" />
                        <div>
                          <span className="text-[10px] text-[#6b82a8] uppercase tracking-widest block">Owner</span>
                          <span className="text-xs text-[#e8f0fe] font-mono font-bold">
                            {vaultResult.owner ? truncateAddress(vaultResult.owner) : '—'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-3 h-3 text-[#6b82a8]" />
                        <div>
                          <span className="text-[10px] text-[#6b82a8] uppercase tracking-widest block">Documents</span>
                          <span className="text-xs text-[#e8f0fe] font-mono font-bold">
                            {vaultResult.documentCount ?? '—'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-3 h-3 text-[#6b82a8]" />
                        <div>
                          <span className="text-[10px] text-[#6b82a8] uppercase tracking-widest block">Recipients</span>
                          <span className="text-xs text-[#e8f0fe] font-mono font-bold">
                            {vaultResult.recipientCount ?? '—'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2
                          className="w-3 h-3"
                          style={{
                            color: vaultResult.autoCheckIn ? '#00f5a0' : '#6b82a8',
                          }}
                        />
                        <div>
                          <span className="text-[10px] text-[#6b82a8] uppercase tracking-widest block">Auto Check-in</span>
                          <span
                            className="text-xs font-mono font-bold"
                            style={{ color: vaultResult.autoCheckIn ? '#00f5a0' : '#ff4d6d' }}
                          >
                            {vaultResult.autoCheckIn ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 w-full py-10 px-6 md:px-12 lg:px-20 border-t border-[rgba(0,212,255,0.08)]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-[rgba(0,212,255,0.25)]"
              style={{ background: 'rgba(0,212,255,0.08)' }}
            >
              <Shield className="w-4 h-4 text-[#00d4ff]" />
            </div>
            <div>
              <div className="text-[#e8f0fe] font-bold text-sm">AbyssProtocol</div>
              <div className="text-[#6b82a8] text-[10px] font-mono uppercase tracking-widest">© 2026 · WalrusVault</div>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs font-semibold text-[#6b82a8]">
            {['Documentation', 'GitHub', 'Terms', 'Privacy'].map((label) => (
              <a
                key={label}
                href="#"
                className="hover:text-[#00d4ff] transition-colors duration-200 tracking-wide"
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
