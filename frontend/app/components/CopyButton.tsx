'use client';

import { useState } from 'react';

type CopyButtonProps = {
  value: string;
  label?: string;
  className?: string;
};

export default function CopyButton({ value, label = 'Copy', className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`rounded-lg border border-emerald-600/40 bg-white px-3 py-1.5 text-sm font-medium text-emerald-800 shadow-sm hover:bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-200 ${className}`}
    >
      {copied ? 'Copied!' : label}
    </button>
  );
}
