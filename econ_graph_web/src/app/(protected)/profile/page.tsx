"use client";

import { UserMenu } from '@/components/chrome/UserMenu';
import { SmartGraphLogo } from '@/components/ui/SmartGraphLogo';
import { Button } from '@/components/ui/button';
import { useAIUsage } from '@/lib/api/hooks';
import { useAuth } from '@/lib/auth/AuthContext';
import { ArrowLeft, Calendar, Loader2, LogOut, Mail, Sparkles, TrendingUp, Zap } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { data: usageStats, isLoading: usageLoading } = useAIUsage();
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');

  if (!user) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Format numbers for display
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Get chart data based on view mode
  const chartData = viewMode === 'daily' 
    ? (usageStats?.daily_usage || []).slice(0, 14).reverse()
    : (usageStats?.monthly_usage || []).slice(0, 6).reverse();
  
  const maxTokens = Math.max(...chartData.map(d => (d.prompt_tokens || 0) + (d.completion_tokens || 0)), 1);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-400 selection:bg-violet-500/30">
        {/* Navigation Bar */}
        <header className="sticky top-0 z-40 border-b border-white/[0.05] bg-[#09090b]/80 backdrop-blur-xl">
            <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-6">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-200 transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="text-xs font-medium">Dashboard</span>
                    </Link>
                    <span className="h-4 w-px bg-white/[0.1]" />
                    <div className="flex items-center gap-2">
                        <SmartGraphLogo size={20} />
                        <span className="text-sm font-semibold text-white tracking-tight">Compte</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <UserMenu forceDark />
                </div>
            </div>
        </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            {/* Sidebar info */}
            <div className="lg:col-span-4 space-y-8">
                <div className="flex flex-col items-start gap-4">
                    <div className="h-20 w-20 flex items-center justify-center rounded-3xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/[0.1] shadow-xl">
                        <span className="text-3xl font-bold text-white">
                            {user.username.charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">
                            {user.full_name || user.username}
                        </h1>
                        <p className="text-sm text-zinc-500">@{user.username}</p>
                    </div>
                </div>

                <div className="space-y-6 pt-4">
                    <div>
                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 mb-3">Email</h3>
                        <div className="flex items-center gap-2 text-sm text-zinc-300">
                            <Mail className="h-4 w-4 text-zinc-500" />
                            <span>{user.email}</span>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 mb-3">Membre depuis</h3>
                        <div className="flex items-center gap-2 text-sm text-zinc-300">
                            <Calendar className="h-4 w-4 text-zinc-500" />
                            <span>
                                {new Date(user.created_at).toLocaleDateString('fr-FR', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </span>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 mb-3">Rôle</h3>
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border border-white/[0.1] bg-white/[0.03] text-zinc-400">
                                {user.is_superuser ? 'Administrateur' : 'Utilisateur'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="pt-8 border-t border-white/[0.05]">
                    <div className="flex flex-col gap-2">
                        <Button 
                            variant="ghost" 
                            className="justify-start h-9 text-sm text-red-500/80 hover:text-red-400 hover:bg-red-500/10"
                            onClick={handleLogout}
                        >
                            <LogOut className="h-4 w-4 mr-2" />
                            Se déconnecter
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main stats area */}
            <div className="lg:col-span-8 space-y-12">
                
                {/* Usage Section */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                             <div className="h-6 w-6 flex items-center justify-center rounded bg-violet-500/10 border border-violet-500/20">
                                <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                             </div>
                             <h2 className="text-lg font-bold text-white tracking-tight">Utilisation de l&apos;IA</h2>
                        </div>
                        <div className="flex p-0.5 rounded-lg border border-white/[0.05] bg-white/[0.02]">
                            <button
                                onClick={() => setViewMode('daily')}
                                className={`px-3 py-1 text-[11px] font-bold uppercase rounded-md transition-all ${
                                    viewMode === 'daily'
                                        ? 'bg-white/[0.1] text-white shadow-sm'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                            >
                                Jour
                            </button>
                            <button
                                onClick={() => setViewMode('monthly')}
                                className={`px-3 py-1 text-[11px] font-bold uppercase rounded-md transition-all ${
                                    viewMode === 'monthly'
                                        ? 'bg-white/[0.1] text-white shadow-sm'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                            >
                                Mois
                            </button>
                        </div>
                    </div>

                    {usageLoading ? (
                        <div className="h-[300px] flex items-center justify-center border border-white/[0.05] rounded-2xl bg-white/[0.01]">
                            <Loader2 className="h-6 w-6 animate-spin text-zinc-700" />
                        </div>
                    ) : usageStats ? (
                        <div className="space-y-8 p-8 border border-white/[0.05] rounded-3xl bg-white/[0.01] relative overflow-hidden">
                            {/* Subtle light effect */}
                            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-600/5 blur-[120px] rounded-full pointer-events-none" />

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 relative z-10">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Requêtes</p>
                                    <p className="text-2xl font-bold text-white tracking-tight">{formatNumber(usageStats.total_requests)}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Prompt</p>
                                    <p className="text-2xl font-bold text-white tracking-tight">{formatNumber(usageStats.total_prompt_tokens)}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Completion</p>
                                    <p className="text-2xl font-bold text-white tracking-tight">{formatNumber(usageStats.total_completion_tokens)}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Coût approx.</p>
                                    <p className="text-2xl font-bold text-white tracking-tight">{usageStats.estimated_cost_eur.toFixed(3)}€</p>
                                </div>
                            </div>

                            {/* Chart */}
                            <div className="relative z-10 pt-4">
                                {chartData.length > 0 ? (
                                    <div className="h-40 flex items-end gap-1.5 pt-8">
                                        {chartData.map((item: any, index) => {
                                            const totalTokens = (item.prompt_tokens || 0) + (item.completion_tokens || 0);
                                            const height = (totalTokens / maxTokens) * 100;
                                            const label = viewMode === 'daily' 
                                                ? new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit' })
                                                : item.month;
                                            
                                            return (
                                                <div key={index} className="flex-1 flex flex-col items-center gap-2 group relative">
                                                    <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-all transform group-hover:-translate-y-1 pointer-events-none z-20">
                                                        <div className="bg-zinc-800 border border-white/[0.1] text-white text-[10px] rounded-md px-2 py-1 whitespace-nowrap shadow-2xl">
                                                            <div className="font-bold">{formatNumber(totalTokens)} tokens</div>
                                                            <div className="text-zinc-500">{item.requests} requêtes</div>
                                                        </div>
                                                    </div>

                                                    <div className="w-full flex flex-col justify-end bg-white/[0.03] rounded-t-sm overflow-hidden" style={{ height: '120px' }}>
                                                        <div
                                                            className="w-full bg-violet-500/40 group-hover:bg-violet-500/60 transition-colors"
                                                            style={{ height: `${height}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[9px] font-bold text-zinc-600 transition-colors group-hover:text-zinc-400">
                                                        {label}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="h-40 flex items-center justify-center text-sm text-zinc-600 italic">
                                        Aucune donnée d&apos;activité
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 border border-white/[0.05] rounded-2xl bg-white/[0.01] text-center text-zinc-600">
                            Données indisponibles
                        </div>
                    )}
                </section>

                {/* Quota / Status Section */}
                <section className="p-8 border border-white/[0.05] rounded-3xl bg-gradient-to-br from-zinc-900/50 to-transparent">
                    <div className="flex items-start justify-between">
                        <div className="space-y-4">
                            <h2 className="text-lg font-bold text-white tracking-tight">Plan actuel</h2>
                            <p className="text-sm text-zinc-400 max-w-sm">
                                Vous bénéficiez actuellement de l&apos;offre <span className="text-violet-400 font-bold">Standard</span> avec accès prioritaire à l&apos;agent de modélisation.
                            </p>
                            <div className="flex items-center gap-2 pt-2">
                                <Zap className="h-4 w-4 text-amber-400" />
                                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wide">Usage illimité</span>
                            </div>
                        </div>
                        <div className="hidden sm:block">
                            <div className="h-16 w-16 flex items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/5 shadow-[0_0_20px_rgba(139,92,246,0.1)]">
                                <TrendingUp className="h-8 w-8 text-violet-500/50" />
                            </div>
                        </div>
                    </div>
                </section>

            </div>
        </div>
      </main>
    </div>
  );
}
