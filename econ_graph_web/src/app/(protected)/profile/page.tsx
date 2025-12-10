"use client";

import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { LogOut, User, Mail, Calendar, Shield, Network } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProtectedTopbar } from '@/components/chrome/ProtectedTopbar';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

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
                <Network className="h-4 w-4 mr-2" />
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
