"use client";

import { ProfileOnboarding } from '@/components/dashboard/ProfileOnboarding';
import { Button } from '@/components/ui/button';
import { useAIUsage } from '@/lib/api/hooks';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  INTEREST_OPTIONS,
  LEVEL_OPTIONS,
  PROFESSION_OPTIONS,
  SmartProfile,
  TOOLS_OPTIONS,
} from '@/types/smart-profile';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  BarChart3,
  Check,
  ChevronRight,
  Loader2,
  LogOut,
  Pencil,
  Sparkles,
  User,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();
  const { data: usageStats, isLoading: usageLoading } = useAIUsage();
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
  const [showProfileEditor, setShowProfileEditor] = useState(false);

  const smartProfile = user?.smart_profile as SmartProfile | null;

  if (!user) {
    return null;
  }

  const getProfessionLabel = (value: string) =>
    PROFESSION_OPTIONS.find(p => p.value === value)?.label || value;
  const getInterestLabel = (value: string) =>
    INTEREST_OPTIONS.find(i => i.value === value)?.label || value;
  const getLevelLabel = (value: string) =>
    LEVEL_OPTIONS.find(l => l.value === value)?.label || value;
  const getToolLabel = (value: string) =>
    TOOLS_OPTIONS.find(t => t.value === value)?.label || value;

  const handleProfileComplete = () => {
    setShowProfileEditor(false);
    refreshUser();
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const chartData = viewMode === 'daily'
    ? (usageStats?.daily_usage || []).slice(0, 14).reverse()
    : (usageStats?.monthly_usage || []).slice(0, 6).reverse();

  const maxTokens = Math.max(...chartData.map(d => (d.prompt_tokens || 0) + (d.completion_tokens || 0)), 1);

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar — matches landing nav style */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-zinc-100">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="group inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <span className="text-sm font-medium text-zinc-900">Profil</span>
          <button
            onClick={handleLogout}
            className="text-sm text-zinc-400 hover:text-red-500 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-12">
        {/* ── Identity ──────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-5"
        >
          <div className="relative shrink-0">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center shadow-lg shadow-violet-500/15">
              <span className="text-2xl font-bold text-white">
                {user.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-white flex items-center justify-center">
              <div className="h-3 w-3 rounded-full bg-emerald-500" />
            </div>
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-zinc-900 truncate">
              {user.full_name || user.username}
            </h1>
            <p className="text-sm text-zinc-400">
              @{user.username} &middot; {user.email}
            </p>
          </div>
        </motion.section>

        {/* ── Quick info row ────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-3 gap-px bg-zinc-100 rounded-xl overflow-hidden border border-zinc-100"
        >
          <div className="bg-white p-4 text-center">
            <p className="text-xs text-zinc-400 mb-1">Membre depuis</p>
            <p className="text-sm font-semibold text-zinc-900">
              {new Date(user.created_at).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div className="bg-white p-4 text-center">
            <p className="text-xs text-zinc-400 mb-1">Forfait</p>
            <p className="text-sm font-semibold text-zinc-900">Standard</p>
          </div>
          <div className="bg-white p-4 text-center">
            <p className="text-xs text-zinc-400 mb-1">Statut</p>
            <p className="text-sm font-semibold text-emerald-600 flex items-center justify-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Actif
            </p>
          </div>
        </motion.section>

        {/* ── Profil IA ─────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 text-violet-500" />
              <h2 className="text-sm font-semibold text-zinc-900">Profil IA</h2>
            </div>
            <button
              onClick={() => setShowProfileEditor(true)}
              className="text-xs font-medium text-violet-600 hover:text-violet-700 transition-colors flex items-center gap-1"
            >
              {smartProfile?.completed ? (
                <>
                  <Pencil className="h-3 w-3" />
                  Modifier
                </>
              ) : (
                <>
                  Configurer
                  <ChevronRight className="h-3 w-3" />
                </>
              )}
            </button>
          </div>

          {smartProfile?.completed ? (
            <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-5 space-y-4">
              {smartProfile.profession?.length > 0 && (
                <div>
                  <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-2">Contexte</p>
                  <div className="flex flex-wrap gap-1.5">
                    {smartProfile.profession.map((p) => (
                      <span key={p} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-violet-50 text-violet-700 border border-violet-100">
                        <User className="h-3 w-3 opacity-60" />
                        {getProfessionLabel(p)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {smartProfile.interests?.length > 0 && (
                <div>
                  <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-2">Centres d&apos;intérêt</p>
                  <div className="flex flex-wrap gap-1.5">
                    {smartProfile.interests.map((i) => (
                      <span key={i} className="px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        {getInterestLabel(i)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-6">
                {smartProfile.level && (
                  <div>
                    <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-2">Niveau</p>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                      <Zap className="h-3 w-3 opacity-60" />
                      {getLevelLabel(smartProfile.level)}
                    </span>
                  </div>
                )}
                {smartProfile.tools?.length > 0 && (
                  <div>
                    <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-2">Outils</p>
                    <div className="flex flex-wrap gap-1.5">
                      {smartProfile.tools.map((t) => (
                        <span key={t} className="px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
                          {getToolLabel(t)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center">
              <Sparkles className="h-6 w-6 text-violet-400 mx-auto mb-3" />
              <h3 className="text-sm font-medium text-zinc-900 mb-1.5">
                Personnalisez vos suggestions
              </h3>
              <p className="text-xs text-zinc-500 mb-5 max-w-xs mx-auto">
                Configurez votre profil pour recevoir des modèles adaptés
              </p>
              <Button
                onClick={() => setShowProfileEditor(true)}
                className="bg-violet-600 hover:bg-violet-700 text-white text-xs h-9 shadow-sm shadow-violet-600/15"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                Configurer
              </Button>
            </div>
          )}
        </motion.section>

        {/* ── Utilisation IA ────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              <h2 className="text-sm font-semibold text-zinc-900">Utilisation IA</h2>
            </div>
            <div className="flex p-0.5 bg-zinc-100 rounded-lg">
              <button
                onClick={() => setViewMode('daily')}
                className={`px-3 py-1 text-[11px] font-medium rounded-md transition-all ${
                  viewMode === 'daily'
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-600'
                }`}
              >
                Jour
              </button>
              <button
                onClick={() => setViewMode('monthly')}
                className={`px-3 py-1 text-[11px] font-medium rounded-md transition-all ${
                  viewMode === 'monthly'
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-600'
                }`}
              >
                Mois
              </button>
            </div>
          </div>

          {usageLoading ? (
            <div className="h-40 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-300" />
            </div>
          ) : usageStats ? (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-zinc-100 rounded-xl overflow-hidden border border-zinc-100">
                <div className="bg-white p-4">
                  <p className="text-lg font-bold text-zinc-900 tabular-nums">{formatNumber(usageStats.total_requests)}</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Requêtes</p>
                </div>
                <div className="bg-white p-4">
                  <p className="text-lg font-bold text-zinc-900 tabular-nums">{formatNumber(usageStats.total_prompt_tokens)}</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Tokens in</p>
                </div>
                <div className="bg-white p-4">
                  <p className="text-lg font-bold text-zinc-900 tabular-nums">{formatNumber(usageStats.total_completion_tokens)}</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Tokens out</p>
                </div>
                <div className="bg-white p-4">
                  <p className="text-lg font-bold text-emerald-600 tabular-nums">{usageStats.estimated_cost_eur.toFixed(2)}€</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Coût</p>
                </div>
              </div>

              {/* Chart — log scale to avoid outlier-flattened bars */}
              {chartData.length > 0 ? (() => {
                const logMax = Math.log10(maxTokens + 1);
                return (
                  <div className="h-36 flex items-end gap-1.5">
                    {chartData.map((item: { date?: string; month?: string; prompt_tokens?: number; completion_tokens?: number; requests?: number }, index) => {
                      const totalTokens = (item.prompt_tokens || 0) + (item.completion_tokens || 0);
                      const logHeight = totalTokens > 0
                        ? (Math.log10(totalTokens + 1) / logMax) * 100
                        : 0;
                      const label = viewMode === 'daily'
                        ? new Date(item.date || '').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
                        : item.month;

                      return (
                        <div key={index} className="flex-1 flex flex-col items-center gap-1.5 group cursor-default">
                          <div
                            className="w-full rounded-md bg-gradient-to-t from-blue-200 to-blue-100 group-hover:from-blue-300 group-hover:to-blue-200 transition-colors relative"
                            style={{ height: `${Math.max(logHeight, 6)}%`, minHeight: '4px' }}
                          >
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                              <div className="bg-zinc-900 rounded-lg px-2.5 py-1.5 text-[10px] whitespace-nowrap shadow-lg">
                                <p className="text-white font-medium tabular-nums">{formatNumber(totalTokens)} tokens</p>
                                <p className="text-zinc-400">{item.requests} req.</p>
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] text-zinc-400 tabular-nums leading-none">
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })() : (
                <div className="h-36 flex items-center justify-center rounded-xl border border-dashed border-zinc-200">
                  <p className="text-xs text-zinc-400">Aucune activité</p>
                </div>
              )}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center">
              <p className="text-xs text-zinc-400">Données indisponibles</p>
            </div>
          )}
        </motion.section>

        {/* ── Abonnement ────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-sm font-semibold text-zinc-900 mb-4">Abonnement</h2>
          <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-base font-bold text-zinc-900">Standard</p>
                <p className="text-xs text-zinc-400 mt-0.5">Toutes les fonctionnalités incluses</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                Actif
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm mb-5">
              <span className="flex items-center gap-2 text-zinc-600">
                <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                Modèles illimités
              </span>
              <span className="flex items-center gap-2 text-zinc-600">
                <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                Agent IA avancé
              </span>
              <span className="flex items-center gap-2 text-zinc-600">
                <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                Export PDF / Excel
              </span>
              <span className="flex items-center gap-2 text-zinc-600">
                <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                Scénarios multiples
              </span>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
                <span>Utilisation mensuelle</span>
                <span className="tabular-nums">35%</span>
              </div>
              <div className="h-1.5 bg-zinc-200/60 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-violet-500 to-blue-500 rounded-full" style={{ width: '35%' }} />
              </div>
            </div>
          </div>
        </motion.section>

        {/* ── Actions ───────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="pb-4"
        >
          <h2 className="text-sm font-semibold text-zinc-900 mb-4">Actions rapides</h2>
          <div className="space-y-2">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-50 border border-zinc-100 transition-all group"
            >
              <Zap className="h-4 w-4 text-violet-500" />
              <span className="text-sm text-zinc-600 group-hover:text-zinc-900 flex-1">Nouveau modèle</span>
              <ChevronRight className="h-4 w-4 text-zinc-300 group-hover:text-zinc-500" />
            </Link>
            <button
              onClick={() => setShowProfileEditor(true)}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-50 border border-zinc-100 transition-all group"
            >
              <Pencil className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-zinc-600 group-hover:text-zinc-900 flex-1 text-left">Modifier le profil IA</span>
              <ChevronRight className="h-4 w-4 text-zinc-300 group-hover:text-zinc-500" />
            </button>
          </div>
        </motion.section>
      </main>

      {/* Profile Editor Modal */}
      <AnimatePresence>
        {showProfileEditor && (
          <ProfileOnboarding
            editMode
            initialValues={smartProfile ? {
              profession: smartProfile.profession || [],
              interests: smartProfile.interests || [],
              level: smartProfile.level,
              tools: smartProfile.tools || [],
            } : undefined}
            onComplete={handleProfileComplete}
            onSkip={() => setShowProfileEditor(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
