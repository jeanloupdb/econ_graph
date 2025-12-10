"use client";

import { LoginVisualization } from '@/components/auth/LoginVisualization';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/AuthContext';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, Network } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const { login, user } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(username, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Connexion échouée');
    } finally {
      setIsLoading(false);
    }
  };

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  if (user) return null;

  return (
    <div className="min-h-screen flex">
      {/* Left side - Stylized content */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-zinc-50 via-zinc-50 to-blue-50/30 dark:from-zinc-950 dark:via-zinc-950 dark:to-blue-950/20 relative overflow-hidden">
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

        {/* Animated gradient mesh background */}
        <div className="absolute inset-0 opacity-40 dark:opacity-30">
          <motion.div
            className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-blue-300/30 to-transparent dark:from-blue-900/20 rounded-full blur-[100px]"
            animate={{
              x: [0, 50, 0],
              y: [0, 30, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-indigo-200/30 to-transparent dark:from-indigo-900/20 rounded-full blur-[100px]"
            animate={{
              x: [0, -30, 0],
              y: [0, -50, 0],
              scale: [1, 1.15, 1],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full h-full px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full border-2 border-blue-200 dark:border-blue-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md shadow-lg">
              <div className="rounded-lg bg-blue-100 p-1.5 dark:bg-blue-950">
                <Network className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                EconGraph
              </span>
            </div>
          </motion.div>

          {/* Visualization */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="w-full max-w-4xl h-[600px]"
          >
            <LoginVisualization />
          </motion.div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white dark:bg-zinc-950">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="rounded-xl bg-blue-100 dark:bg-blue-950 p-3 ring-1 ring-blue-200 dark:ring-blue-900">
              <Network className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">EconGraph</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Workspace</p>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">
              Bon retour
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              Connectez-vous pour accéder à vos projets
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 px-4 py-3"
              >
                <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
              </motion.div>
            )}

            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Nom d'utilisateur
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                placeholder="votre-nom"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2.5 pr-10 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connexion...
                </span>
              ) : (
                'Se connecter'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Pas encore de compte ?{' '}
              <Link
                href="/register"
                className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              >
                Créer un compte
              </Link>
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800">
            <p className="text-xs text-center text-zinc-500 dark:text-zinc-400">
              En vous connectant, vous acceptez nos{' '}
              <Link href="/terms" className="underline hover:text-zinc-700 dark:hover:text-zinc-300">
                conditions d'utilisation
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
