'use client';

import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { DocumentUpload } from '@/components/DocumentUpload';
import { RecipientForm } from '@/components/RecipientForm';
import { useCurrentAccount, useSignAndExecuteTransaction, ConnectButton, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { cn } from '@/lib/utils';
import { VaultEncryption } from '@/lib/encryption';
import { getWalrusClient } from '@/lib/walrus';
import { Upload, Users, Settings, ArrowRight, ArrowLeft, Check, Lock, Loader2, ShieldAlert, Copy, CheckCircle2 } from 'lucide-react';

const TIMEOUT_OPTIONS = [
  { value: 600000,     label: '10 MIN',  description: 'Live Demo' },
  { value: 2592000000, label: '30 Days', description: 'Short-term' },
  { value: 7776000000, label: '90 Days', description: 'Quarterly' },
  { value: 15552000000,label: '180 Days',description: 'Standard', recommended: true },
  { value: 31536000000,label: '1 Year',  description: 'Long-term' },
];

interface Recipient { address: string; name: string; email?: string; }

function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { num: 1, label: 'Upload Data',  icon: <Upload className="w-4 h-4" /> },
    { num: 2, label: 'Recipients',   icon: <Users className="w-4 h-4" /> },
    { num: 3, label: 'Configure',    icon: <Settings className="w-4 h-4" /> },
  ];
  return (
    <div className="flex items-stretch border-b border-[rgba(0,212,255,0.1)] bg-[rgba(4,8,16,0.6)]">
      {steps.map((step, i) => {
        const isActive    = step.num === currentStep;
        const isCompleted = step.num < currentStep;
        return (
          <div
            key={i}
            className="flex-1 relative px-6 py-4 flex items-center gap-3 transition-all duration-300"
            style={{
              background: isActive
                ? 'linear-gradient(180deg, rgba(0,212,255,0.06) 0%, transparent 100%)'
                : isCompleted
                ? 'rgba(0,245,160,0.03)'
                : 'transparent',
              borderRight: i < 2 ? '1px solid rgba(0,212,255,0.08)' : 'none',
              borderBottom: isActive ? '2px solid #00d4ff' : '2px solid transparent',
            }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{
                background: isActive
                  ? 'linear-gradient(135deg,#00d4ff,#7c3aed)'
                  : isCompleted
                  ? 'rgba(0,245,160,0.15)'
                  : 'rgba(0,212,255,0.06)',
                color: isActive ? '#040810' : isCompleted ? '#00f5a0' : '#6b82a8',
                border: isCompleted ? '1px solid rgba(0,245,160,0.3)' : '1px solid rgba(0,212,255,0.15)',
              }}
            >
              {isCompleted ? <Check className="w-4 h-4" /> : step.icon}
            </div>
            <div className="hidden sm:block">
              <div className="text-[10px] font-mono text-[#6b82a8] uppercase tracking-widest">Step 0{step.num}</div>
              <div className={cn('text-sm font-bold', isActive ? 'text-[#e8f0fe]' : isCompleted ? 'text-[#00f5a0]' : 'text-[#6b82a8]')}>
                {step.label}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CreateVault() {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const [step, setStep]                   = useState(1);
  const [documents, setDocuments]         = useState<File[]>([]);
  const [recipients, setRecipients]       = useState<Recipient[]>([]);
  const [timeoutMs, setTimeoutMs]         = useState(15552000000);
  const [autoCheckin, setAutoCheckin]     = useState(true);
  const [isCreating, setIsCreating]       = useState(false);
  const [creationPhase, setCreationPhase] = useState('');
  const [createdVaultId, setCreatedVaultId] = useState<string | null>(null);
  const [copied, setCopied]               = useState(false);

  const handleCreateVault = async () => {
    if (!account) return;
    setIsCreating(true);
    try {
      setCreationPhase('DEPLOYING_SMART_CONTRACT');
      const tx = new Transaction();
      const recipientAddresses = recipients.map(r => r.address.startsWith('0x') ? r.address : `0x${r.address}`);
      const recipientNames     = recipients.map(r => Array.from(new TextEncoder().encode(r.name)));
      tx.moveCall({
        target: `${process.env.NEXT_PUBLIC_PACKAGE_ID}::vault::create_vault`,
        arguments: [
          tx.object(process.env.NEXT_PUBLIC_REGISTRY_ID!),
          tx.pure.vector('address', recipientAddresses),
          tx.pure.vector('vector<u8>', recipientNames),
          tx.pure.u64(timeoutMs),
          tx.pure.bool(autoCheckin),
          tx.pure.u8(1),
          tx.object('0x6'),
        ],
      });
      signAndExecute({ transaction: tx as any }, {
        onSuccess: async (result) => {
          setCreationPhase('VAULT_CREATED — QUERYING ON-CHAIN DATA...');
          try {
            const txDetails = await suiClient.waitForTransaction({ digest: result.digest, options: { showEvents: true, showObjectChanges: true } });
            const createdEvent = txDetails.events?.find(e => e.type.includes('::vault::VaultCreated'));
            const vaultId = (createdEvent?.parsedJson as any)?.vault_id;
            let capId = null;
            if (txDetails.objectChanges) {
              const capChange = txDetails.objectChanges.find(c => c.type === 'created' && c.objectType.includes('::vault::VaultCap'));
              if (capChange && capChange.type === 'created') capId = capChange.objectId;
            }
            if (vaultId) {
              const emailList = recipients.map(r => r.email).filter(Boolean);
              if (emailList.length > 0) {
                fetch('/api/vaults/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vaultId, emails: emailList }) }).catch(console.error);
              }
              if (documents.length > 0 && capId) {
                setCreationPhase('ENCRYPTING & UPLOADING TO WALRUS...');
                const walrus = getWalrusClient();
                const uploadedDocs = [];
                for (let i = 0; i < documents.length; i++) {
                  setCreationPhase(`ENCRYPTING & UPLOADING (${i + 1}/${documents.length})...`);
                  const file = documents[i];
                  const arrayBuffer = await file.arrayBuffer();
                  const docKey = VaultEncryption.generateKey();
                  const encrypted = VaultEncryption.encrypt(arrayBuffer, docKey);
                  const uploadRes = await walrus.uploadBlob(encrypted.encrypted, 1);
                  const encMeta = JSON.stringify({ key: docKey, iv: encrypted.iv, salt: encrypted.salt });
                  uploadedDocs.push({ name: file.name, type: file.type || 'application/octet-stream', blobId: uploadRes.blobId, encryptedKey: encMeta, size: file.size });
                }
                setCreationPhase('SIGN 2ND TX — REGISTERING DOCUMENTS ON-CHAIN...');
                const tx2 = new Transaction();
                for (const doc of uploadedDocs) {
                  tx2.moveCall({
                    target: `${process.env.NEXT_PUBLIC_PACKAGE_ID}::vault::upload_document`,
                    arguments: [
                      tx2.object(vaultId), tx2.object(capId),
                      tx2.pure.vector('u8', Array.from(new TextEncoder().encode(doc.name))),
                      tx2.pure.vector('u8', Array.from(new TextEncoder().encode(doc.type))),
                      tx2.pure.vector('u8', Array.from(new TextEncoder().encode(doc.blobId))),
                      tx2.pure.vector('u8', Array.from(new TextEncoder().encode(doc.encryptedKey))),
                      tx2.pure.u64(doc.size), tx2.object('0x6'),
                    ],
                  });
                }
                signAndExecute({ transaction: tx2 as any }, {
                  onSuccess: () => setCreatedVaultId(vaultId),
                  onError: (err) => { console.error('Doc reg err:', err); alert('Vault created, doc reg failed. ID: ' + vaultId); setCreatedVaultId(vaultId); },
                });
              } else {
                setCreatedVaultId(vaultId);
              }
            } else {
              setTimeout(() => setIsCreating(false), 2000);
            }
          } catch (err) { console.error(err); setTimeout(() => setIsCreating(false), 2000); }
        },
        onError: (err) => { console.error(err); setIsCreating(false); },
      });
    } catch (err) { console.error(err); setIsCreating(false); }
  };

  const handleCopy = () => {
    if (!createdVaultId) return;
    navigator.clipboard.writeText(createdVaultId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  /* ── Not connected ── */
  if (!account) {
    return (
      <div className="min-h-screen flex flex-col bg-[#040810] w-full">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="rounded-2xl border border-[rgba(0,212,255,0.15)] w-full max-w-md overflow-hidden" style={{ background: 'linear-gradient(135deg,rgba(8,15,30,0.95),rgba(13,25,41,0.9))', boxShadow: '0 24px 64px rgba(0,0,0,0.6),0 0 60px rgba(0,212,255,0.06)' }}>
            <div className="px-6 py-5 border-b border-[rgba(0,212,255,0.1)] flex items-center gap-3" style={{ background: 'rgba(0,212,255,0.04)' }}>
              <ShieldAlert className="w-5 h-5 text-[#00d4ff]" />
              <h2 className="font-bold text-[#e8f0fe]">Authentication Required</h2>
            </div>
            <div className="p-8">
              <p className="text-[#6b82a8] font-medium mb-8 leading-relaxed">Connect your wallet to initialize the vault creation protocol.</p>
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

      <div className="flex-1 w-full flex flex-col lg:flex-row">
        {/* ── Sidebar ── */}
        <div className="w-full lg:w-[360px] border-b lg:border-b-0 lg:border-r border-[rgba(0,212,255,0.08)] flex flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none" />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 80% 60% at 0% 100%, rgba(124,58,237,0.12) 0%, transparent 65%)' }}
          />
          <div className="relative z-10 p-8 flex flex-col h-full justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(0,212,255,0.2)] bg-[rgba(0,212,255,0.06)] mb-8">
                <span className="text-[#00d4ff] text-[10px] font-bold uppercase tracking-widest">Initialization</span>
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight leading-tight mb-5 text-[#e8f0fe]">
                Create<br />New<br />
                <span style={{ background: 'linear-gradient(135deg,#00d4ff,#7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  Vault
                </span>
              </h1>
              <p className="text-[#6b82a8] font-medium leading-relaxed text-sm">
                Configure your secure decentralized dead man's switch. Parameters are immutable after deployment.
              </p>
            </div>
            <div className="hidden lg:block mt-8">
              <div className="rounded-xl border border-[rgba(0,212,255,0.12)] p-4 bg-[rgba(0,212,255,0.03)]">
                <div className="text-[10px] font-bold text-[#6b82a8] uppercase tracking-widest mb-2">Active Wallet</div>
                <div className="font-mono text-xs text-[#00d4ff] break-all">{account.address}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Content ── */}
        <div className="flex-1 flex flex-col">
          <StepIndicator currentStep={step} />

          <div className="flex-1 p-6 lg:p-12 w-full max-w-4xl" style={{ animation: 'fadeInUp 0.5s ease forwards' }}>

            {/* Step 1: Upload */}
            {step === 1 && (
              <div>
                <h2 className="text-2xl font-bold text-[#e8f0fe] mb-1">Upload Payload</h2>
                <p className="text-[#6b82a8] font-medium mb-8 text-sm">Select files for AES-256 client-side encryption.</p>
                <DocumentUpload onUpload={setDocuments} maxFiles={10} />
                {documents.length > 0 && (
                  <div className="mt-6 rounded-xl border border-[rgba(0,245,160,0.25)] bg-[rgba(0,245,160,0.05)] px-5 py-3.5 flex items-center gap-3">
                    <Check className="w-4 h-4 text-[#00f5a0]" />
                    <span className="text-[#00f5a0] text-sm font-bold">{documents.length} file(s) staged for encryption</span>
                  </div>
                )}
                <div className="mt-10 flex justify-end pt-8 border-t border-[rgba(0,212,255,0.08)]">
                  <button onClick={() => setStep(2)} className="btn-primary inline-flex items-center gap-3 px-7 py-3.5 rounded-xl text-sm font-bold">
                    Continue to Recipients <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Recipients */}
            {step === 2 && (
              <div>
                <h2 className="text-2xl font-bold text-[#e8f0fe] mb-1">Designate Recipients</h2>
                <p className="text-[#6b82a8] font-medium mb-8 text-sm">Addresses authorized to decrypt upon protocol trigger.</p>
                <RecipientForm recipients={recipients} onChange={setRecipients} />
                <div className="mt-10 flex justify-between pt-8 border-t border-[rgba(0,212,255,0.08)]">
                  <button onClick={() => setStep(1)} className="btn-secondary inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button onClick={() => setStep(3)} disabled={recipients.length === 0} className="btn-primary inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed">
                    Configure Protocol <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Configure */}
            {step === 3 && (
              <div>
                <h2 className="text-2xl font-bold text-[#e8f0fe] mb-1">Configure Protocol</h2>
                <p className="text-[#6b82a8] font-medium mb-8 text-sm">Define trigger conditions and smart contract parameters.</p>

                <div className="space-y-10">
                  {/* Timeout */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#6b82a8] mb-4">Timeout Threshold</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      {TIMEOUT_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setTimeoutMs(opt.value)}
                          className="relative p-4 rounded-xl border text-left transition-all duration-200 group"
                          style={{
                            background: timeoutMs === opt.value ? 'linear-gradient(135deg,rgba(0,212,255,0.1),rgba(124,58,237,0.08))' : 'rgba(8,15,30,0.8)',
                            borderColor: timeoutMs === opt.value ? 'rgba(0,212,255,0.5)' : 'rgba(0,212,255,0.1)',
                            boxShadow: timeoutMs === opt.value ? '0 0 20px rgba(0,212,255,0.15)' : 'none',
                          }}
                        >
                          {opt.recommended && (
                            <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: 'linear-gradient(135deg,#00d4ff,#7c3aed)', color: '#040810' }}>STD</div>
                          )}
                          <div className="text-lg font-bold mb-0.5" style={{ color: timeoutMs === opt.value ? '#00d4ff' : '#e8f0fe' }}>{opt.label}</div>
                          <div className="text-[10px] font-bold uppercase tracking-wide text-[#6b82a8]">{opt.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Auto Check-in toggle */}
                  <div className="rounded-xl border border-[rgba(0,212,255,0.1)] p-6 flex items-center justify-between bg-[rgba(0,212,255,0.02)]">
                    <div>
                      <h4 className="font-bold text-[#e8f0fe] mb-1">Autonomous Tatum Check-in</h4>
                      <p className="text-sm text-[#6b82a8] font-medium">Reset timer automatically when on-chain wallet activity is detected.</p>
                    </div>
                    <button
                      onClick={() => setAutoCheckin(!autoCheckin)}
                      className="relative w-14 h-7 rounded-full transition-all duration-300 flex-shrink-0"
                      style={{
                        background: autoCheckin ? 'linear-gradient(135deg,#00d4ff,#7c3aed)' : 'rgba(0,212,255,0.1)',
                        border: autoCheckin ? 'none' : '1px solid rgba(0,212,255,0.2)',
                        boxShadow: autoCheckin ? '0 0 16px rgba(0,212,255,0.35)' : 'none',
                      }}
                    >
                      <span
                        className="absolute top-1 w-5 h-5 rounded-full bg-white transition-all duration-300"
                        style={{ left: autoCheckin ? 'calc(100% - 24px)' : '4px' }}
                      />
                    </button>
                  </div>

                  {/* Summary */}
                  <div className="rounded-xl border border-[rgba(0,212,255,0.15)] p-6 bg-[rgba(0,212,255,0.03)]">
                    <h4 className="font-bold text-[#e8f0fe] mb-4 uppercase tracking-widest text-xs">Deployment Summary</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm font-mono">
                      {[
                        ['PAYLOAD',        `${documents.length} FILES`],
                        ['AUTHORIZATIONS', `${recipients.length} WALLETS`],
                        ['THRESHOLD',      TIMEOUT_OPTIONS.find(o => o.value === timeoutMs)?.label || 'CUSTOM'],
                        ['AUTO_PING',      autoCheckin ? 'ENABLED' : 'DISABLED'],
                      ].map(([k, v]) => (
                        <div key={k} className="flex flex-col gap-0.5">
                          <span className="text-[10px] text-[#6b82a8] uppercase tracking-widest">{k}</span>
                          <span className="text-[#00d4ff] font-bold">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-10 flex justify-between pt-8 border-t border-[rgba(0,212,255,0.08)]">
                  <button onClick={() => setStep(2)} className="btn-secondary inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    onClick={handleCreateVault}
                    disabled={isCreating}
                    className="btn-primary inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? <><Loader2 className="w-4 h-4 animate-spin" /> Initializing…</> : <>Deploy Vault <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Overlay ── */}
      {(isCreating || createdVaultId) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(4,8,16,0.92)', backdropFilter: 'blur(16px)' }}>
          <div
            className="w-full max-w-lg rounded-2xl border border-[rgba(0,212,255,0.2)] overflow-hidden"
            style={{ background: 'linear-gradient(135deg,rgba(8,15,30,0.98),rgba(13,25,41,0.95))', boxShadow: '0 0 80px rgba(0,212,255,0.12), 0 32px 64px rgba(0,0,0,0.8)', animation: 'scaleIn 0.3s ease forwards' }}
          >
            {/* Top accent */}
            <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#00d4ff,#7c3aed,#00d4ff)', backgroundSize: '200% 100%', animation: 'gradient-shift 3s linear infinite' }} />

            <div className="p-8">
              {createdVaultId ? (
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-2xl mb-6 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,rgba(0,245,160,0.15),rgba(0,212,255,0.1))', border: '1px solid rgba(0,245,160,0.3)', boxShadow: '0 0 32px rgba(0,245,160,0.2)' }}>
                    <Check className="w-8 h-8 text-[#00f5a0]" />
                  </div>
                  <h3 className="text-2xl font-bold text-[#e8f0fe] mb-2">Vault Deployed!</h3>
                  <p className="text-[#6b82a8] font-medium mb-8 text-sm">Your encrypted payload is now secured on the Walrus decentralized network.</p>
                  <div className="w-full rounded-xl border border-[rgba(0,212,255,0.15)] p-5 mb-6 bg-[rgba(0,212,255,0.04)]">
                    <div className="text-[10px] font-bold text-[#6b82a8] uppercase tracking-widest mb-3">Vault Object ID — Share with Recipients</div>
                    <div className="font-mono text-sm text-[#00d4ff] break-all mb-4 leading-relaxed">{createdVaultId}</div>
                    <button onClick={handleCopy} className="w-full py-2.5 rounded-lg border border-[rgba(0,212,255,0.2)] text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[rgba(0,212,255,0.08)] transition-all" style={{ color: copied ? '#00f5a0' : '#6b82a8' }}>
                      {copied ? <><CheckCircle2 className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy ID</>}
                    </button>
                  </div>
                  <button onClick={() => { setCreatedVaultId(null); setIsCreating(false); window.location.href = '/dashboard'; }} className="btn-primary w-full py-3.5 rounded-xl font-bold text-sm">
                    Return to Dashboard
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-4 mb-8 pb-8 border-b border-[rgba(0,212,255,0.1)]">
                    <div className="w-12 h-12 rounded-xl border border-[rgba(0,212,255,0.25)] flex items-center justify-center" style={{ background: 'rgba(0,212,255,0.08)' }}>
                      <Loader2 className="w-6 h-6 text-[#00d4ff] animate-spin" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-[#e8f0fe]">Deploying Protocol</h3>
                      <p className="text-[#6b82a8] font-mono text-xs mt-1">AWAITING NETWORK CONFIRMATION</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-[rgba(0,212,255,0.1)] p-4 bg-[rgba(0,212,255,0.03)]">
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="text-[#6b82a8] break-all">{creationPhase}</span>
                      <span className="text-[#00d4ff] flex-shrink-0 ml-3 animate-pulse">●</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
