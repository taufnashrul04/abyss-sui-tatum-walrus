'use client';

import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Upload, FileText, Image, File, X, FileSpreadsheet, FileJson, CloudUpload } from 'lucide-react';

interface DocumentUploadProps {
  onUpload: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
}

const getFileIcon = (type: string) => {
  if (type.includes('image'))       return Image;
  if (type.includes('json'))        return FileJson;
  if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv')) return FileSpreadsheet;
  if (type.includes('pdf') || type.includes('document') || type.includes('text'))     return FileText;
  return File;
};

const getFileColor = (type: string) => {
  if (type.includes('image'))  return { color: '#7c3aed', bg: 'rgba(124,58,237,0.1)', border: 'rgba(124,58,237,0.25)' };
  if (type.includes('json'))   return { color: '#ffb627', bg: 'rgba(255,182,39,0.1)', border: 'rgba(255,182,39,0.25)' };
  if (type.includes('pdf'))    return { color: '#ff4d6d', bg: 'rgba(255,77,109,0.1)', border: 'rgba(255,77,109,0.25)' };
  return                              { color: '#00d4ff', bg: 'rgba(0,212,255,0.1)',   border: 'rgba(0,212,255,0.25)' };
};

export function DocumentUpload({ onUpload, maxFiles = 50, maxSizeMB = 10 }: DocumentUploadProps) {
  const [files, setFiles]       = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const inputRef                = useRef<HTMLInputElement>(null);

  const handleFiles = (newFiles: FileList | File[]) => {
    const fileArray  = Array.from(newFiles);
    const totalFiles = files.length + fileArray.length;
    if (totalFiles > maxFiles) { setError(`Maximum ${maxFiles} files allowed`); return; }
    const oversized = fileArray.find(f => f.size > maxSizeMB * 1024 * 1024);
    if (oversized)  { setError(`"${oversized.name}" exceeds ${maxSizeMB}MB limit`); return; }
    setError(null);
    const updated = [...files, ...fileArray];
    setFiles(updated);
    onUpload(updated);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
  };

  const removeFile = (index: number) => {
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
    onUpload(updated);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024)           return bytes + ' B';
    if (bytes < 1024 * 1024)   return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="space-y-5">
      {/* Drop Zone */}
      <div
        className="relative rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-all duration-300 overflow-hidden group"
        style={{
          borderColor: dragActive ? '#00d4ff' : 'rgba(0,212,255,0.2)',
          background: dragActive
            ? 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(0,212,255,0.08) 0%, rgba(8,15,30,0.9) 100%)'
            : 'linear-gradient(135deg, rgba(8,15,30,0.9), rgba(13,25,41,0.7))',
          boxShadow: dragActive ? '0 0 40px rgba(0,212,255,0.15), inset 0 0 40px rgba(0,212,255,0.05)' : 'none',
        }}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        {/* Animated corner accents */}
        <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 transition-colors duration-300" style={{ borderColor: dragActive ? '#00d4ff' : 'rgba(0,212,255,0.3)' }} />
        <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 transition-colors duration-300" style={{ borderColor: dragActive ? '#00d4ff' : 'rgba(0,212,255,0.3)' }} />
        <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 transition-colors duration-300" style={{ borderColor: dragActive ? '#00d4ff' : 'rgba(0,212,255,0.3)' }} />
        <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 transition-colors duration-300" style={{ borderColor: dragActive ? '#00d4ff' : 'rgba(0,212,255,0.3)' }} />

        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleChange}
          accept=".pdf,.doc,.docx,.txt,.json,.csv,.xlsx,.png,.jpg,.jpeg,.gif"
        />

        <div className="flex flex-col items-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-all duration-300"
            style={{
              background: dragActive ? 'linear-gradient(135deg,#00d4ff,#7c3aed)' : 'rgba(0,212,255,0.08)',
              border: `1px solid ${dragActive ? 'transparent' : 'rgba(0,212,255,0.2)'}`,
              boxShadow: dragActive ? '0 0 24px rgba(0,212,255,0.4)' : 'none',
            }}
          >
            <CloudUpload className="w-8 h-8 transition-colors duration-300" style={{ color: dragActive ? '#040810' : '#00d4ff' }} />
          </div>
          <p className="text-[#e8f0fe] font-bold text-lg mb-2 group-hover:text-white transition-colors">
            {dragActive ? 'Drop files here' : 'Click to upload or drag & drop'}
          </p>
          <p className="text-[#6b82a8] font-mono text-xs uppercase tracking-wider">
            PDF · DOC · TXT · JSON · Images · Max {maxSizeMB}MB · Up to {maxFiles} files
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-[rgba(255,77,109,0.3)] bg-[rgba(255,77,109,0.08)] px-4 py-3 flex items-center gap-3">
          <div className="w-6 h-6 rounded-lg bg-[rgba(255,77,109,0.2)] flex items-center justify-center flex-shrink-0">
            <X className="w-3.5 h-3.5 text-[#ff4d6d]" />
          </div>
          <span className="text-[#ff4d6d] text-sm font-bold">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-[#ff4d6d] opacity-60 hover:opacity-100 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-widest text-[#6b82a8]">{files.length} file(s) ready</span>
            <span className="text-xs font-mono font-bold text-[#00d4ff]">{formatSize(totalSize)} total</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {files.map((file, index) => {
              const FileIcon = getFileIcon(file.type);
              const col      = getFileColor(file.type);
              return (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between rounded-xl border p-3 group transition-all duration-200 hover:border-[rgba(0,212,255,0.3)]"
                  style={{ background: 'rgba(8,15,30,0.8)', borderColor: 'rgba(0,212,255,0.1)' }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: col.bg, border: `1px solid ${col.border}` }}
                    >
                      <FileIcon className="w-4 h-4" style={{ color: col.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[#e8f0fe] text-xs font-bold truncate max-w-[160px] sm:max-w-[200px]">{file.name}</p>
                      <p className="text-[#6b82a8] font-mono text-[10px] mt-0.5">{formatSize(file.size)}</p>
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); removeFile(index); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[#6b82a8] hover:text-[#ff4d6d] hover:bg-[rgba(255,77,109,0.1)] transition-all flex-shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
