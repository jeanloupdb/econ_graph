"use client";

import { LoginVisualization } from '@/components/auth/LoginVisualization';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/AuthContext';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { SmartGraphLogo } from '@/components/ui/SmartGraphLogo';
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
      <div className="hidden lg:flex lg:w-1/2 bg-zinc-50 relative overflow-hidden">
        {/* Animated gradient mesh background */}
        <div className="absolute inset-0 opacity-40">
          <motion.div
            className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-violet-200/40 to-transparent rounded-full blur-[100px]"
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
            className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-blue-200/40 to-transparent rounded-full blur-[100px]"
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
            <Link href="/" className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full border border-zinc-200 bg-white/80 backdrop-blur-md shadow-sm hover:border-violet-300 transition-colors cursor-pointer">
              <SmartGraphLogo size={24} />
              <span className="text-sm font-bold text-zinc-900">
                SmartGraph
              </span>
            </Link>
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
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <Link href="/" className="lg:hidden flex items-center gap-3 mb-8 hover:opacity-80 transition-opacity">
            <SmartGraphLogo size={40} />
            <div>
              <h2 className="text-lg font-bold text-zinc-900">SmartGraph</h2>
              <p className="text-xs text-zinc-500">Workspace</p>
            </div>
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-zinc-900 mb-2">
              Bon retour
            </h1>
            <p className="text-zinc-500">
              Connectez-vous pour accéder à vos projets
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3"
              >
                <p className="text-sm font-medium text-red-600">{error}</p>
              </motion.div>
            )}

            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium text-zinc-700">
                Nom d'utilisateur
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all invalid:border-zinc-300 valid:border-zinc-300 focus-visible:outline-none"
                placeholder="votre-nom"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-zinc-700">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 pr-10 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all invalid:border-zinc-300 valid:border-zinc-300 focus-visible:outline-none"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
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
              className="w-full h-11 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg shadow-lg shadow-violet-600/20 transition-all disabled:opacity-50"
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
            <p className="text-sm text-zinc-500">
              Pas encore de compte ?{' '}
              <Link
                href="/register"
                className="font-medium text-violet-600 hover:text-violet-700 transition-colors"
              >
                Créer un compte
              </Link>
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-zinc-200">
            <p className="text-xs text-center text-zinc-500">
              En vous connectant, vous acceptez nos{' '}
              <Link href="/terms" className="underline hover:text-zinc-700">
                conditions d'utilisation
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
