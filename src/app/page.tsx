import { Navbar } from '@/components/Navbar';
import Link from 'next/link';
import { ArrowRight, Shield, Clock, FileText, CheckCircle2, Lock, Zap, Globe, ChevronRight } from 'lucide-react';

export default function Home() {
  const features = [
    {
      icon: <Shield className="w-5 h-5" />,
      label: 'Encryption',
      title: 'AES-256 Client-Side',
      description: "Military-grade encryption runs entirely in your browser. Your raw data never leaves your device unencrypted.",
      color: '#00d4ff',
      glow: 'rgba(0,212,255,0.2)',
    },
    {
      icon: <FileText className="w-5 h-5" />,
      label: 'Storage',
      title: 'Walrus Network',
      description: 'Immutable, decentralized blob storage distributed across the Walrus network. Censorship-resistant by design.',
      color: '#7c3aed',
      glow: 'rgba(124,58,237,0.2)',
    },
    {
      icon: <Clock className="w-5 h-5" />,
      label: 'Execution',
      title: 'Sui Smart Contracts',
      description: "Autonomous dead man's switch logic deployed natively on the high-performance Sui blockchain.",
      color: '#00f5a0',
      glow: 'rgba(0,245,160,0.2)',
    },
  ];

  const stats = [
    { value: 'AES-256', label: 'Encryption' },
    { value: '∞', label: 'Uptime' },
    { value: '0', label: 'Middlemen' },
    { value: 'Sui', label: 'Blockchain' },
  ];

  return (
    <div className="min-h-screen bg-[#040810] relative w-full flex flex-col overflow-x-hidden">
      <Navbar />

      {/* ===== HERO SECTION ===== */}
      <section className="relative w-full min-h-[92vh] flex items-center">
        {/* Background layers */}
        <div className="absolute inset-0 line-grid opacity-60" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 70% 55% at 50% -5%, rgba(0,212,255,0.18) 0%, transparent 65%),
              radial-gradient(ellipse 50% 40% at 90% 40%, rgba(124,58,237,0.18) 0%, transparent 60%),
              radial-gradient(ellipse 40% 35% at 10% 70%, rgba(0,212,255,0.08) 0%, transparent 60%)
            `,
          }}
        />

        {/* Floating orbs */}
        <div
          className="absolute top-1/4 right-1/4 w-80 h-80 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)',
            animation: 'float 8s ease-in-out infinite',
            filter: 'blur(40px)',
          }}
        />
        <div
          className="absolute bottom-1/4 left-1/3 w-64 h-64 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(0,212,255,0.1) 0%, transparent 70%)',
            animation: 'float 10s ease-in-out infinite reverse',
            filter: 'blur(40px)',
          }}
        />

        <div className="relative z-10 w-full grid grid-cols-1 lg:grid-cols-2 gap-16 px-6 md:px-12 lg:px-20 py-20">
          {/* Left: Hero Copy */}
          <div
            className="flex flex-col justify-center"
            style={{ animation: 'fadeInUp 0.8s ease forwards' }}
          >
            {/* Status badge */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-[rgba(0,212,255,0.2)] bg-[rgba(0,212,255,0.06)] w-fit mb-10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00d4ff] opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00d4ff]" />
              </span>
              <span className="text-[#00d4ff] text-xs font-bold uppercase tracking-widest">Protocol Active</span>
            </div>

            <h1 className="text-6xl md:text-7xl lg:text-[80px] leading-[1] font-bold tracking-tight text-[#e8f0fe] mb-6">
              Digital<br />
              Legacy<br />
              <span
                style={{
                  background: 'linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Secured.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-[#6b82a8] max-w-lg mb-12 leading-relaxed font-medium">
              Decentralized dead man's switch — protect your most important digital assets with cryptographic certainty and zero trust requirements.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/create"
                className="btn-primary inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl text-base font-bold"
              >
                Create Vault
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/dashboard"
                className="btn-secondary inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl text-base font-semibold"
              >
                Access Dashboard
              </Link>
            </div>

            {/* Mini stats row */}
            <div className="grid grid-cols-4 gap-4 mt-16 pt-10 border-t border-[rgba(0,212,255,0.08)]">
              {stats.map((s, i) => (
                <div key={i}>
                  <div
                    className="text-xl font-bold font-mono"
                    style={{
                      background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {s.value}
                  </div>
                  <div className="text-xs text-[#6b82a8] uppercase tracking-widest font-medium mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Vault Diagnostic Card */}
          <div
            className="flex flex-col justify-center"
            style={{ animation: 'fadeInUp 0.8s 0.2s ease both' }}
          >
            <div
              className="rounded-2xl border border-[rgba(0,212,255,0.15)] overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(8,15,30,0.9) 0%, rgba(13,25,41,0.8) 100%)',
                backdropFilter: 'blur(24px)',
                boxShadow: '0 0 0 1px rgba(0,212,255,0.06), 0 24px 64px rgba(0,0,0,0.6), 0 0 80px rgba(0,212,255,0.06)',
              }}
            >
              {/* Title bar */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[rgba(0,212,255,0.1)] bg-[rgba(0,212,255,0.03)]">
                <div className="flex items-center gap-2.5">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#ff4d6d] opacity-80" />
                    <span className="w-3 h-3 rounded-full bg-[#ffb627] opacity-80" />
                    <span className="w-3 h-3 rounded-full bg-[#00f5a0] opacity-80" />
                  </div>
                  <span className="font-mono text-xs text-[#6b82a8] font-bold ml-2">VAULT_DIAGNOSTIC.SYS</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00f5a0] opacity-60" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00f5a0]" />
                  </span>
                  <span className="text-[10px] font-mono text-[#00f5a0] font-bold">RUNNING</span>
                </div>
              </div>

              {/* Diagnostic rows */}
              <div className="p-6 font-mono text-sm space-y-0">
                {[
                  { label: 'STATUS', value: 'ONLINE', color: '#00f5a0', glow: true },
                  { label: 'ENCRYPTION', value: 'AES-256-GCM', color: '#00d4ff', glow: false },
                  { label: 'STORAGE', value: 'WALRUS_NODE', color: '#e8f0fe', glow: false },
                  { label: 'CONTRACT', value: 'SUI_MAINNET', color: '#e8f0fe', glow: false },
                  { label: 'DEAD_SWITCH', value: 'ARMED', color: '#ffb627', glow: true },
                  { label: 'RECIPIENTS', value: 'ENCRYPTED', color: '#7c3aed', glow: false },
                ].map((row, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center py-3 border-b border-[rgba(0,212,255,0.06)] last:border-0 group"
                  >
                    <span className="text-[#6b82a8] text-xs tracking-widest">{row.label}</span>
                    <span
                      className="text-xs font-bold tracking-wider"
                      style={{
                        color: row.color,
                        textShadow: row.glow ? `0 0 12px ${row.color}` : 'none',
                      }}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Bottom CTA */}
              <div className="px-6 pb-6">
                <div className="rounded-xl p-4 border border-[rgba(0,212,255,0.12)] bg-[rgba(0,212,255,0.04)]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-[#6b82a8] uppercase tracking-widest font-bold">Next Check-in</span>
                    <span className="text-xs text-[#00d4ff] font-mono font-bold">AUTO</span>
                  </div>
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: 'rgba(0,212,255,0.08)' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: '38%',
                        background: 'linear-gradient(90deg, #00d4ff, #7c3aed)',
                        boxShadow: '0 0 12px rgba(0,212,255,0.5)',
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-[10px] text-[#6b82a8] font-mono">T-MINUS</span>
                    <span className="text-[10px] text-[#00d4ff] font-mono font-bold">109:14:32:07</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="relative w-full py-32 px-6 md:px-12 lg:px-20">
        <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />
        <div className="relative z-10 max-w-7xl mx-auto">
          {/* Section header */}
          <div className="mb-20" style={{ animation: 'fadeInUp 0.6s ease forwards' }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(0,212,255,0.2)] bg-[rgba(0,212,255,0.05)] mb-6">
              <Zap className="w-3 h-3 text-[#00d4ff]" />
              <span className="text-[#00d4ff] text-[10px] font-bold uppercase tracking-widest">Architecture</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-[#e8f0fe] mb-4">
              Three Protocols.
              <br />
              <span
                style={{
                  background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Zero Compromise.
              </span>
            </h2>
            <p className="text-[#6b82a8] text-lg max-w-xl font-medium">
              A rigid three-layer security architecture ensuring your digital legacy is protected at every step.
            </p>
          </div>

          {/* Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                num: '01',
                title: 'Encrypt & Store',
                desc: 'Files are encrypted client-side in your browser using AES-256. Raw data never touches any server. Ciphertext is distributed across the Walrus decentralized network.',
                checks: ['SHA-256 Hashing', 'Client-side AES Keys', 'Walrus distribution'],
                color: '#00d4ff',
                delay: '0s',
              },
              {
                num: '02',
                title: 'Smart Contract Logic',
                desc: "A dead man's switch is deployed to Sui. It waits for periodic check-ins. Missed check-ins trigger the protocol autonomously — no human intervention needed.",
                checks: ['Verifiable on-chain', 'Immutable conditions', 'Zero custody'],
                color: '#7c3aed',
                delay: '0.1s',
              },
              {
                num: '03',
                title: 'Automated Release',
                desc: 'Upon timeout, the contract releases decryption keys to your designated recipients via Tatum-powered secure delivery channels.',
                checks: ['Tatum API', 'Zero middlemen', 'Cryptographic proof'],
                color: '#00f5a0',
                delay: '0.2s',
              },
            ].map((step, i) => (
              <div
                key={i}
                className="vault-card relative rounded-2xl p-8 border border-[rgba(0,212,255,0.1)] overflow-hidden group"
                style={{
                  background: 'linear-gradient(135deg, rgba(8,15,30,0.9), rgba(13,25,41,0.7))',
                  animation: `fadeInUp 0.7s ${step.delay} ease both`,
                }}
              >
                {/* Top glow accent */}
                <div
                  className="absolute top-0 left-0 right-0 h-px"
                  style={{ background: `linear-gradient(90deg, transparent, ${step.color}, transparent)` }}
                />

                {/* Number */}
                <div
                  className="text-6xl font-bold font-mono mb-6 transition-all duration-300"
                  style={{
                    color: step.color,
                    opacity: 0.15,
                    lineHeight: 1,
                  }}
                >
                  {step.num}
                </div>

                <h3 className="text-xl font-bold text-[#e8f0fe] mb-3 group-hover:text-white transition-colors">{step.title}</h3>
                <p className="text-[#6b82a8] text-sm leading-relaxed mb-6 font-medium">{step.desc}</p>

                <ul className="space-y-2.5">
                  {step.checks.map((c, j) => (
                    <li key={j} className="flex items-center gap-2.5 text-xs font-mono text-[#6b82a8]">
                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: step.color }} />
                      {c}
                    </li>
                  ))}
                </ul>

                {/* Bottom border glow on hover */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: `linear-gradient(90deg, transparent, ${step.color}, transparent)` }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section className="relative w-full py-28 px-6 md:px-12 lg:px-20 overflow-hidden">
        {/* Background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 50% at 50% 100%, rgba(124,58,237,0.08) 0%, transparent 70%)',
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-center mb-20">
            <div className="lg:col-span-1">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(124,58,237,0.3)] bg-[rgba(124,58,237,0.07)] mb-6">
                <Lock className="w-3 h-3 text-[#7c3aed]" />
                <span className="text-[#7c3aed] text-[10px] font-bold uppercase tracking-widest">Security</span>
              </div>
              <h2 className="text-4xl font-bold tracking-tight text-[#e8f0fe] mb-4">
                System<br />
                <span
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed, #00d4ff)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Features
                </span>
              </h2>
              <p className="text-[#6b82a8] font-medium leading-relaxed">
                Built on uncompromising cryptographic primitives and decentralized infrastructure.
              </p>
            </div>

            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-5">
              {features.map((f, i) => (
                <div
                  key={i}
                  className="vault-card relative rounded-xl p-6 border border-[rgba(0,212,255,0.08)] group cursor-default"
                  style={{
                    background: 'linear-gradient(135deg, rgba(8,15,30,0.95), rgba(13,25,41,0.8))',
                    animation: `fadeInUp 0.6s ${i * 0.12}s ease both`,
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-5 border transition-all duration-300 group-hover:scale-110"
                    style={{
                      background: `rgba(${f.color === '#00d4ff' ? '0,212,255' : f.color === '#7c3aed' ? '124,58,237' : '0,245,160'},0.1)`,
                      borderColor: `rgba(${f.color === '#00d4ff' ? '0,212,255' : f.color === '#7c3aed' ? '124,58,237' : '0,245,160'},0.25)`,
                      color: f.color,
                    }}
                  >
                    {f.icon}
                  </div>

                  <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: f.color }}>
                    {f.label}
                  </div>
                  <h4 className="text-base font-bold text-[#e8f0fe] mb-2 group-hover:text-white transition-colors">
                    {f.title}
                  </h4>
                  <p className="text-[#6b82a8] text-xs leading-relaxed font-medium">{f.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Banner */}
          <div
            className="relative rounded-2xl p-10 md:p-14 overflow-hidden border border-[rgba(0,212,255,0.15)]"
            style={{
              background: 'linear-gradient(135deg, rgba(0,212,255,0.06) 0%, rgba(124,58,237,0.08) 100%)',
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse 60% 80% at 0% 50%, rgba(0,212,255,0.12) 0%, transparent 60%)',
              }}
            />
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div>
                <h3 className="text-3xl md:text-4xl font-bold text-[#e8f0fe] mb-3">
                  Secure your legacy<br />
                  <span
                    style={{
                      background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    today.
                  </span>
                </h3>
                <p className="text-[#6b82a8] font-medium max-w-md">
                  Deploy your vault in minutes. Your loved ones will always have access to what matters most.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 flex-shrink-0">
                <Link
                  href="/create"
                  className="btn-primary inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-bold text-sm whitespace-nowrap"
                >
                  Create Your Vault
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/live"
                  className="btn-secondary inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-semibold text-sm whitespace-nowrap"
                >
                  <Globe className="w-4 h-4" />
                  Browse Live Vaults
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="relative w-full py-10 px-6 md:px-12 lg:px-20 border-t border-[rgba(0,212,255,0.08)]">
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
