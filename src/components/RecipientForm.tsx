'use client';

import { useState } from 'react';
import { UserPlus, Trash2, Mail, Wallet, User, AlertCircle, X, CheckCircle2 } from 'lucide-react';

interface Recipient { address: string; name: string; email?: string; }

interface RecipientFormProps {
  recipients: Recipient[];
  onChange: (recipients: Recipient[]) => void;
  maxRecipients?: number;
}

export function RecipientForm({ recipients, onChange, maxRecipients = 10 }: RecipientFormProps) {
  const [newAddress, setNewAddress] = useState('');
  const [newName,    setNewName]    = useState('');
  const [newEmail,   setNewEmail]   = useState('');
  const [error,      setError]      = useState<string | null>(null);

  const isValidSuiAddress = (addr: string) =>
    /^0x[a-fA-F0-9]{64}$/.test(addr) || /^0x[a-fA-F0-9]{40}$/.test(addr);

  const addRecipient = () => {
    if (!newAddress) { setError('Wallet address is required'); return; }
    if (!isValidSuiAddress(newAddress)) { setError('Invalid Sui address format (must be 0x…)'); return; }
    if (!newName) { setError('Name is required'); return; }
    if (recipients.length >= maxRecipients) { setError(`Maximum ${maxRecipients} recipients`); return; }
    if (recipients.some(r => r.address === newAddress)) { setError('Address already added'); return; }
    setError(null);
    onChange([...recipients, { address: newAddress, name: newName, email: newEmail || undefined }]);
    setNewAddress(''); setNewName(''); setNewEmail('');
  };

  const removeRecipient = (index: number) => onChange(recipients.filter((_, i) => i !== index));

  const inputClass = `
    w-full pl-10 pr-4 py-3 rounded-xl border text-[#e8f0fe] text-sm font-mono
    placeholder:text-[#6b82a8] placeholder:text-xs placeholder:tracking-wide
    focus:outline-none transition-all duration-200
    bg-[rgba(8,15,30,0.8)]
  `;
  const inputStyle = { borderColor: 'rgba(0,212,255,0.15)' };
  const inputFocusHandler = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'rgba(0,212,255,0.5)';
    e.target.style.boxShadow   = '0 0 20px rgba(0,212,255,0.08)';
  };
  const inputBlurHandler = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'rgba(0,212,255,0.15)';
    e.target.style.boxShadow   = 'none';
  };

  return (
    <div className="space-y-6">
      {/* Add Recipient Form */}
      <div
        className="rounded-2xl border p-6 space-y-4"
        style={{ borderColor: 'rgba(0,212,255,0.12)', background: 'linear-gradient(135deg,rgba(8,15,30,0.9),rgba(13,25,41,0.7))' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(180deg,#00d4ff,#7c3aed)' }} />
            <h4 className="text-[#e8f0fe] font-bold text-sm uppercase tracking-wider">New Recipient</h4>
          </div>
          <div
            className="px-3 py-1 rounded-lg text-xs font-bold font-mono"
            style={{
              background: recipients.length >= maxRecipients ? 'rgba(255,77,109,0.1)' : 'rgba(0,212,255,0.08)',
              border: `1px solid ${recipients.length >= maxRecipients ? 'rgba(255,77,109,0.3)' : 'rgba(0,212,255,0.2)'}`,
              color: recipients.length >= maxRecipients ? '#ff4d6d' : '#00d4ff',
            }}
          >
            {recipients.length}/{maxRecipients}
          </div>
        </div>

        {/* Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="relative">
            <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b82a8]" />
            <input
              type="text"
              placeholder="0x... Sui wallet address"
              value={newAddress}
              onChange={e => setNewAddress(e.target.value)}
              onFocus={inputFocusHandler}
              onBlur={inputBlurHandler}
              className={inputClass}
              style={inputStyle}
            />
          </div>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b82a8]" />
            <input
              type="text"
              placeholder="Name / identifier"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onFocus={inputFocusHandler}
              onBlur={inputBlurHandler}
              className={inputClass}
              style={{ ...inputStyle, fontFamily: 'Space Grotesk, system-ui' }}
            />
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b82a8]" />
            <input
              type="email"
              placeholder="Email notification (optional)"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              onFocus={inputFocusHandler}
              onBlur={inputBlurHandler}
              className={inputClass}
              style={{ ...inputStyle, fontFamily: 'Space Grotesk, system-ui' }}
            />
          </div>
          <button
            onClick={addRecipient}
            disabled={recipients.length >= maxRecipients}
            className="btn-primary px-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <UserPlus className="w-4 h-4" /> Add Recipient
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-[rgba(255,77,109,0.3)] bg-[rgba(255,77,109,0.06)] px-4 py-3 flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-[#ff4d6d] flex-shrink-0" />
          <span className="text-[#ff4d6d] text-sm font-medium">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-[#ff4d6d] opacity-60 hover:opacity-100 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Recipients List */}
      {recipients.length > 0 && (
        <div className="space-y-2.5">
          <div className="px-1 flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#00f5a0]" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#6b82a8]">
              {recipients.length} recipient(s) authorized
            </span>
          </div>
          {recipients.map((recipient, index) => (
            <div
              key={`${recipient.address}-${index}`}
              className="flex items-center gap-4 rounded-xl border p-4 group transition-all duration-200 hover:border-[rgba(0,212,255,0.3)]"
              style={{ background: 'rgba(8,15,30,0.8)', borderColor: 'rgba(0,212,255,0.1)' }}
            >
              {/* Avatar */}
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,rgba(0,212,255,0.15),rgba(124,58,237,0.15))', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff' }}
              >
                {recipient.name.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-widest text-[#6b82a8] mb-0.5">Name</div>
                  <div className="text-[#e8f0fe] text-xs font-bold truncate">{recipient.name}</div>
                </div>
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-widest text-[#6b82a8] mb-0.5">Address</div>
                  <div className="text-[#00d4ff] font-mono text-xs font-bold">
                    {recipient.address.slice(0, 8)}…{recipient.address.slice(-6)}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-widest text-[#6b82a8] mb-0.5">Email</div>
                  <div className="text-[#6b82a8] text-xs font-medium truncate">{recipient.email || '—'}</div>
                </div>
              </div>

              {/* Remove */}
              <button
                onClick={() => removeRecipient(index)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6b82a8] hover:text-[#ff4d6d] hover:bg-[rgba(255,77,109,0.1)] transition-all flex-shrink-0 opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
