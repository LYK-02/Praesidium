import { AppShell } from '@/components/layout/app-shell';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ShieldAlert,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import { payPalClient } from '@/server/paypal/client';
import { env } from '@/server/config/env';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  let disputeCount = 0;
  let paypalHealthy = false;

  try {
    const listRes = await payPalClient.listDisputes(10);
    disputeCount = listRes.items ? listRes.items.length : 0;
    paypalHealthy = true;
  } catch (err) {
    console.warn('Could not list PayPal disputes on load:', err);
    paypalHealthy = false;
  }

  const statCards = [
    {
      title: 'Active Disputes',
      value: `${disputeCount}`,
      subtext: 'In PayPal Sandbox queue',
      icon: ShieldAlert,
      color: 'text-amber-400',
    },
    {
      title: 'Recovered Revenue',
      value: '$2,480.00',
      subtext: 'Total preserved by agent',
      icon: TrendingUp,
      color: 'text-emerald-400',
    },
    {
      title: 'Estimated Win Rate',
      value: '84.6%',
      subtext: 'Blended AI & evidence model',
      icon: CheckCircle2,
      color: 'text-amber-400',
    },
    {
      title: 'Merchant Hours Saved',
      value: '18.5h',
      subtext: 'Autonomous representation',
      icon: Clock,
      color: 'text-indigo-400',
    },
  ];

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-display font-bold text-foreground tracking-tight">
              Dispute Command Center
            </h2>
            <p className="text-sm font-sans text-muted-foreground mt-1">
              Autonomous defense & representment loop with human-in-the-loop gates.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-mono text-zinc-300">
              <span className={`w-2 h-2 rounded-full ${paypalHealthy ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
              PayPal API: {paypalHealthy ? 'Connected' : 'Standby'}
            </span>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} variant="glass" hoverable className="p-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    {stat.title}
                  </span>
                  <div className={`p-2 rounded-lg bg-white/5 border border-white/5 ${stat.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-3xl font-display font-bold text-foreground tracking-tight">
                    {stat.value}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1 font-mono">
                    <span>{stat.subtext}</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Urgency Strip */}
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-glow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-amber-300">
                Deadline Protection Active
              </div>
              <div className="text-xs text-zinc-400 mt-0.5">
                All cases due within 48 hours are automatically escalated for priority evidence compilation.
              </div>
            </div>
          </div>
          <span className="text-xs font-mono text-amber-400/80 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 whitespace-nowrap">
            Auto-escalate &lt; 48h
          </span>
        </div>

        {/* Foundation Queue Status */}
        <Card variant="glass" className="p-6">
          <div className="flex items-center justify-between pb-6 border-b border-border/80">
            <div>
              <h3 className="text-base font-display font-semibold text-foreground">
                Live Sandbox Dispute Feed
              </h3>
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                Real-time sync target: {env.PAYPAL_ENV.toUpperCase()}
              </p>
            </div>
            <Badge status={disputeCount > 0 ? 'needs_response' : 'agent_working'} label={disputeCount > 0 ? `${disputeCount} PENDING ACTION` : 'STANDBY (READY)'} />
          </div>

          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-amber-400 mb-4 border border-border">
              <Zap className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-foreground">
              {disputeCount > 0 ? 'Disputes Detected in Sandbox' : 'Disputes Queue Primed'}
            </h4>
            <p className="text-xs text-muted-foreground max-w-md mt-1 mb-5">
              {disputeCount > 0
                ? `Found ${disputeCount} dispute(s) in your PayPal Sandbox account. Phase 2 integration will ingest and run the state machine.`
                : 'Seed sandbox disputes via PayPal sandbox buyer account, or trigger simulated dispute events in Phase 2.'}
            </p>
            <div className="flex gap-3">
              <Link href="https://developer.paypal.com" target="_blank">
                <Button variant="secondary" size="sm" className="gap-1.5 text-xs">
                  <span>PayPal Developer Hub</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
