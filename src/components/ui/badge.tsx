import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Clock, Loader2, AlertCircle, UploadCloud, CheckCircle2, XCircle } from 'lucide-react';

export type BadgeStatus =
  | 'needs_response'
  | 'agent_working'
  | 'awaiting_approval'
  | 'under_review'
  | 'won'
  | 'lost';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: BadgeStatus;
  label?: string;
}

export function Badge({ status = 'needs_response', label, className, ...props }: BadgeProps) {
  const configs: Record<BadgeStatus, { text: string; bg: string; icon: React.ReactNode }> = {
    needs_response: {
      text: label || 'NEEDS RESPONSE',
      bg: 'bg-review-muted text-amber-400 border-amber-500/30',
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    agent_working: {
      text: label || 'AGENT WORKING',
      bg: 'bg-neutral-muted text-zinc-300 border-white/10',
      icon: <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse mr-0.5" />,
    },
    awaiting_approval: {
      text: label || 'AWAITING APPROVAL',
      bg: 'bg-amber-500/15 text-amber-300 border-amber-400/50 shadow-glow-sm',
      icon: <AlertCircle className="w-3.5 h-3.5 text-amber-400" />,
    },
    under_review: {
      text: label || 'UNDER REVIEW',
      bg: 'bg-neutral-muted text-zinc-300 border-white/10',
      icon: <UploadCloud className="w-3.5 h-3.5 text-zinc-400" />,
    },
    won: {
      text: label || 'RESOLVED (WON)',
      bg: 'bg-win-muted text-emerald-400 border-emerald-500/30',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
    },
    lost: {
      text: label || 'ACCEPTED / REFUNDED',
      bg: 'bg-loss-muted text-rose-400 border-rose-500/30',
      icon: <XCircle className="w-3.5 h-3.5 text-rose-400" />,
    },
  };

  const item = configs[status];

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono tracking-wider font-medium border uppercase transition-colors',
          item.bg,
          className
        )
      )}
      {...props}
    >
      {item.icon}
      {item.text}
    </span>
  );
}
