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
} from 'lucide-react';
import { SmartGraphLogo } from '@/components/ui/SmartGraphLogo';
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
            <RegisterVisualization />
          </motion.div>
        </div>
      </div>

      {/* Right side - Register form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md py-8"
        >
          {/* Mobile logo */}
          <Link href="/" className="lg:hidden flex items-center gap-3 mb-8 hover:opacity-80 transition-opacity">
            <SmartGraphLogo size={40} />
            <div>
              <h2 className="text-lg font-bold text-zinc-900">SmartGraph</h2>
              <p className="text-xs text-zinc-500">Workspace</p>
            </div>
          </Link>

          <div className="mb-6">
            <h1 className="text-3xl font-bold text-zinc-900 mb-2">
              Créez votre compte
            </h1>
            <p className="text-zinc-500">
              Commencez à construire vos modèles économiques
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
              <label htmlFor="email" className="text-sm font-medium text-zinc-700">
                Adresse email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all invalid:border-zinc-300 valid:border-zinc-300 focus-visible:outline-none"
                placeholder="vous@exemple.com"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium text-zinc-700">
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
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all invalid:border-zinc-300 valid:border-zinc-300 focus-visible:outline-none"
                placeholder="votre-nom"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="fullName" className="text-sm font-medium text-zinc-700">
                Nom complet <span className="text-zinc-400 text-xs">(optionnel)</span>
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                value={formData.fullName}
                onChange={handleChange}
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all invalid:border-zinc-300 valid:border-zinc-300 focus-visible:outline-none"
                placeholder="Jean Dupont"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-zinc-700">
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
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 pr-10 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all invalid:border-zinc-300 valid:border-zinc-300 focus-visible:outline-none"
                  placeholder="Au moins 8 caractères"
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
              {formData.password && (
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex-1 h-1.5 rounded-full bg-zinc-200 overflow-hidden">
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
                      ? 'text-emerald-600'
                      : passwordStrength === 'medium'
                      ? 'text-amber-600'
                      : 'text-red-600'
                  }`}>
                    {passwordStrength === 'strong' ? 'Fort' : passwordStrength === 'medium' ? 'Moyen' : 'Faible'}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-zinc-700">
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
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 pr-10 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all invalid:border-zinc-300 valid:border-zinc-300 focus-visible:outline-none"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {formData.confirmPassword && formData.password === formData.confirmPassword && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Les mots de passe correspondent</span>
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg shadow-lg shadow-violet-600/20 transition-all disabled:opacity-50 mt-2"
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
            <p className="text-sm text-zinc-500">
              Vous avez déjà un compte ?{' '}
              <Link
                href="/login"
                className="font-medium text-violet-600 hover:text-violet-700 transition-colors"
              >
                Se connecter
              </Link>
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-zinc-200">
            <p className="text-xs text-center text-zinc-500">
              En créant un compte, vous acceptez nos{' '}
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
