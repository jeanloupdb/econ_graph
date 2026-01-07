"use client";

import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { LogOut, User, Mail, Calendar, Shield, Sparkles, Zap, TrendingUp, Loader2 } from 'lucide-react';
import { SmartGraphLogo } from '@/components/ui/SmartGraphLogo';
import { Button } from '@/components/ui/button';
import { ProtectedTopbar } from '@/components/chrome/ProtectedTopbar';
import { useAIUsage } from '@/lib/api/hooks';
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
  
  const maxTokens = Math.max(...chartData.map(d => d.prompt_tokens + d.completion_tokens), 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-zinc-50 to-blue-50/30 dark:from-zinc-950 dark:via-zinc-950 dark:to-blue-950/20">
      <ProtectedTopbar backHref="/dashboard" backLabel="Dashboard" />

      {/* Main Content */}
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="space-y-6">
          {/* Profile Header Card */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-br from-blue-50 via-blue-50/50 to-zinc-50 dark:from-blue-950/30 dark:via-blue-950/10 dark:to-zinc-900 px-8 py-12 relative">
              {/* Subtle pattern overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />

              <div className="relative flex items-start justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white dark:bg-zinc-900 border-2 border-blue-200 dark:border-blue-800 shadow-lg">
                    <span className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold text-zinc-900 dark:text-white mb-2">
                      {user.full_name || user.username}
                    </h1>
                    <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                      @{user.username}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-6">
                Informations du compte
              </h2>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Username */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    <User className="h-3.5 w-3.5" />
                    <span>Username</span>
                  </div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">
                    {user.username}
                  </p>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    <Mail className="h-3.5 w-3.5" />
                    <span>Email</span>
                  </div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">
                    {user.email}
                  </p>
                </div>

                {/* Full Name */}
                {user.full_name && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      <User className="h-3.5 w-3.5" />
                      <span>Full name</span>
                    </div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">
                      {user.full_name}
                    </p>
                  </div>
                )}

                {/* Member Since */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Member since</span>
                  </div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">
                    {new Date(user.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    <Shield className="h-3.5 w-3.5" />
                    <span>Status</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                      user.is_active
                        ? 'bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                        : 'bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {user.is_superuser && (
                      <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800">
                        Admin
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Usage Card */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-br from-violet-50 via-purple-50/50 to-zinc-50 dark:from-violet-950/30 dark:via-purple-950/10 dark:to-zinc-900 px-8 py-6 relative border-b border-zinc-200 dark:border-zinc-800">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />
              <div className="relative flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                    Consommation IA
                  </h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Suivi de votre utilisation de l&apos;IA
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8">
              {usageLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
                </div>
              ) : usageStats ? (
                <div className="space-y-6">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-200/50 dark:border-violet-800/50 p-4">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-violet-600 dark:text-violet-400 mb-1">
                        <Zap className="h-3.5 w-3.5" />
                        <span>Requêtes</span>
                      </div>
                      <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                        {formatNumber(usageStats.total_requests)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-200/50 dark:border-blue-800/50 p-4">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-1">
                        <TrendingUp className="h-3.5 w-3.5" />
                        <span>Tokens entrée</span>
                      </div>
                      <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                        {formatNumber(usageStats.total_prompt_tokens)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-200/50 dark:border-emerald-800/50 p-4">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-1">
                        <TrendingUp className="h-3.5 w-3.5" />
                        <span>Tokens sortie</span>
                      </div>
                      <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                        {formatNumber(usageStats.total_completion_tokens)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-200/50 dark:border-amber-800/50 p-4">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-1">
                        <span className="text-sm">€</span>
                        <span>Coût estimé</span>
                      </div>
                      <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                        {usageStats.estimated_cost_eur.toFixed(4)}€
                      </p>
                    </div>
                  </div>

                  {/* Chart Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                        Historique d&apos;utilisation
                      </h3>
                      <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                        <button
                          onClick={() => setViewMode('daily')}
                          className={`px-3 py-1 text-xs font-medium transition-colors ${
                            viewMode === 'daily'
                              ? 'bg-violet-500 text-white'
                              : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700'
                          }`}
                        >
                          Jour
                        </button>
                        <button
                          onClick={() => setViewMode('monthly')}
                          className={`px-3 py-1 text-xs font-medium transition-colors ${
                            viewMode === 'monthly'
                              ? 'bg-violet-500 text-white'
                              : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700'
                          }`}
                        >
                          Mois
                        </button>
                      </div>
                    </div>

                    {/* Simple Bar Chart */}
                    {chartData.length > 0 ? (
                      <div className="h-32 flex items-end gap-1">
                        {chartData.map((item, index) => {
                          const totalTokens = item.prompt_tokens + item.completion_tokens;
                          const height = (totalTokens / maxTokens) * 100;
                          const label = viewMode === 'daily' 
                            ? new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
                            : item.month;
                          
                          return (
                            <div key={index} className="flex-1 flex flex-col items-center gap-1 group">
                              <div className="relative w-full flex flex-col justify-end" style={{ height: '100px' }}>
                                {/* Prompt tokens (bottom) */}
                                <div
                                  className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-sm transition-all group-hover:from-blue-600 group-hover:to-blue-500"
                                  style={{ height: `${(item.prompt_tokens / maxTokens) * 100}%` }}
                                />
                                {/* Completion tokens (top) */}
                                <div
                                  className="w-full bg-gradient-to-t from-violet-500 to-violet-400 transition-all group-hover:from-violet-600 group-hover:to-violet-500"
                                  style={{ height: `${(item.completion_tokens / maxTokens) * 100}%` }}
                                />
                                
                                {/* Tooltip */}
                                <div className="absolute -top-16 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                  <div className="bg-zinc-900 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap shadow-lg">
                                    <div className="font-medium">{formatNumber(totalTokens)} tokens</div>
                                    <div className="text-zinc-400">{item.requests} req.</div>
                                  </div>
                                </div>
                              </div>
                              <span className="text-[10px] text-zinc-400 truncate w-full text-center">
                                {label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="h-32 flex items-center justify-center text-sm text-zinc-500">
                        Aucune donnée disponible
                      </div>
                    )}

                    {/* Legend */}
                    <div className="flex items-center justify-center gap-4 text-xs text-zinc-500">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm bg-gradient-to-t from-blue-500 to-blue-400" />
                        <span>Tokens entrée</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm bg-gradient-to-t from-violet-500 to-violet-400" />
                        <span>Tokens sortie</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-500">
                  Impossible de charger les statistiques d&apos;utilisation
                </div>
              )}
            </div>
          </div>

          {/* Actions Card */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
              Actions
            </h2>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard')}
                className="border-2 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-semibold"
              >
                <SmartGraphLogo size={16} className="mr-2" />
                Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/settings')}
                className="border-2 border-zinc-300 dark:border-zinc-700 font-semibold"
              >
                Paramètres
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="border-2 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 font-semibold"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Se déconnecter
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
