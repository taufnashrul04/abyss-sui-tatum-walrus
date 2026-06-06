'use client';

import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Plus, LayoutDashboard, Menu, X, Globe, Shield, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Navbar() {
  const account = useCurrentAccount();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '/create', label: 'Create Vault', icon: Plus },
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/live', label: 'Live Vaults', icon: Globe },
    { href: '/ai-tools', label: 'AI Tools', icon: Brain },
  ];

  return (
    <>
      <nav
        className={cn(
          'sticky top-0 z-50 w-full transition-all duration-500',
          scrolled
            ? 'bg-[rgba(4,8,16,0.85)] backdrop-blur-xl border-b border-[rgba(0,212,255,0.12)] shadow-[0_4px_32px_rgba(0,0,0,0.5)]'
            : 'bg-transparent border-b border-transparent'
        )}
      >
        <div className="w-full flex items-center justify-between px-5 md:px-10 py-4">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3 group">
              {/* Animated logo mark */}
              <div className="relative w-9 h-9 flex items-center justify-center">
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[#00d4ff] to-[#7c3aed] opacity-20 group-hover:opacity-40 transition-opacity duration-300" />
                <div className="absolute inset-0 rounded-lg border border-[rgba(0,212,255,0.4)] group-hover:border-[rgba(0,212,255,0.8)] transition-colors duration-300" />
                <Shield className="w-4 h-4 text-[#00d4ff] group-hover:scale-110 transition-transform duration-300" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[#e8f0fe] font-bold text-base tracking-tight hidden sm:block">
                  Abyss<span className="text-[#00d4ff]">Protocol</span>
                </span>
                <span className="text-[10px] text-[#6b82a8] font-mono uppercase tracking-widest hidden sm:block">
                  v1.0 · Mainnet
                </span>
              </div>
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-[#6b82a8] hover:text-[#e8f0fe] hover:bg-[rgba(0,212,255,0.06)] transition-all duration-200 group"
                >
                  <link.icon className="w-3.5 h-3.5 text-[#00d4ff] opacity-60 group-hover:opacity-100 transition-opacity" />
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {/* Live status badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgba(0,245,160,0.08)] border border-[rgba(0,245,160,0.2)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00f5a0] opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00f5a0]" />
              </span>
              <span className="text-[#00f5a0] text-xs font-bold uppercase tracking-wider">Live</span>
            </div>

            {/* Wallet Address chip */}
            {account && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(0,212,255,0.06)] border border-[rgba(0,212,255,0.15)]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00d4ff]" />
                <span className="text-[#e8f0fe] text-xs font-mono font-bold">
                  {account.address.slice(0, 6)}…{account.address.slice(-4)}
                </span>
              </div>
            )}

            {/* Connect Button */}
            <div className="connect-btn">
              <ConnectButton />
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg border border-[rgba(0,212,255,0.2)] bg-[rgba(0,212,255,0.05)] text-[#e8f0fe] hover:bg-[rgba(0,212,255,0.1)] transition-all"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={cn(
            'md:hidden overflow-hidden transition-all duration-300 ease-in-out',
            mobileOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <div className="border-t border-[rgba(0,212,255,0.1)] bg-[rgba(4,8,16,0.95)] backdrop-blur-xl p-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#6b82a8] hover:text-[#e8f0fe] hover:bg-[rgba(0,212,255,0.06)] transition-all font-semibold text-sm"
              >
                <link.icon className="w-4 h-4 text-[#00d4ff]" />
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </>
  );
}
