"use client";

import { RegisterVisualization } from '@/components/auth/RegisterVisualization';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/AuthContext';
import { motion } from 'framer-motion';
import {
    CheckCircle2,
    Eye,
    EyeOff,
    Loader2,
    Network,
    Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function RegisterPage() {
  const router = useRouter();
  const { register, user } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setIsLoading(true);

    try {
      await register(
        formData.email,
        formData.username,
        formData.password,
        formData.fullName || undefined
      );
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Inscription échouée');
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = formData.password.length >= 8 ? 'strong' : formData.password.length >= 6 ? 'medium' : 'weak';

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
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-zinc-50 via-zinc-50 to-emerald-50/30 dark:from-zinc-950 dark:via-zinc-950 dark:to-emerald-950/20 relative overflow-hidden">
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

        {/* Animated gradient mesh background */}
        <div className="absolute inset-0 opacity-40 dark:opacity-30">
          <motion.div
            className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-emerald-300/30 to-transparent dark:from-emerald-900/20 rounded-full blur-[100px]"
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
            className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-teal-200/30 to-transparent dark:from-teal-900/20 rounded-full blur-[100px]"
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
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full border-2 border-emerald-200 dark:border-emerald-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md shadow-lg">
              <div className="rounded-lg bg-emerald-100 p-1.5 dark:bg-emerald-950">
                <Network className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                EconGraph
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                IA Inside
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
            <RegisterVisualization />
          </motion.div>
        </div>
      </div>

      {/* Right side - Register form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white dark:bg-zinc-950 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md py-8"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="rounded-xl bg-emerald-100 dark:bg-emerald-950 p-3 ring-1 ring-emerald-200 dark:ring-emerald-900">
              <Network className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">EconGraph</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Workspace</p>
            </div>
          </div>

          <div className="mb-6">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">
              Créez votre compte
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              Commencez à construire vos modèles économiques
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
              <label htmlFor="email" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Adresse email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                placeholder="vous@exemple.com"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Nom d'utilisateur
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                required
                minLength={3}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                placeholder="votre-nom"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="fullName" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Nom complet <span className="text-zinc-400 text-xs">(optionnel)</span>
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                value={formData.fullName}
                onChange={handleChange}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                placeholder="Jean Dupont"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={8}
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2.5 pr-10 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  placeholder="Au moins 8 caractères"
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
              {formData.password && (
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex-1 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        passwordStrength === 'strong'
                          ? 'w-full bg-emerald-500'
                          : passwordStrength === 'medium'
                          ? 'w-2/3 bg-amber-500'
                          : 'w-1/3 bg-red-500'
                      }`}
                    />
                  </div>
                  <span className={`font-medium ${
                    passwordStrength === 'strong'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : passwordStrength === 'medium'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {passwordStrength === 'strong' ? 'Fort' : passwordStrength === 'medium' ? 'Moyen' : 'Faible'}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2.5 pr-10 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {formData.confirmPassword && formData.password === formData.confirmPassword && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Les mots de passe correspondent</span>
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Création...
                </span>
              ) : (
                'Créer mon compte'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Vous avez déjà un compte ?{' '}
              <Link
                href="/login"
                className="font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
              >
                Se connecter
              </Link>
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800">
            <p className="text-xs text-center text-zinc-500 dark:text-zinc-400">
              En créant un compte, vous acceptez nos{' '}
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
