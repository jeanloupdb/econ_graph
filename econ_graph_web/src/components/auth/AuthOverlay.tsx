"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { useProjectStore } from "@/store/projectState";
import { useUIStore } from "@/store/uiState";
import { LogIn } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export function AuthOverlay() {
  const { isAuthenticated, isLoading } = useAuth();
  const developerMode = useUIStore((s) => s.developerMode);
  const canEdit = useProjectStore((s) => s.canEdit)();
  const currentRole = useProjectStore((s) => s.getCurrentRole)();
  const setDeveloperMode = useUIStore((s) => s.setDeveloperMode);

  // If user is not authenticated and tries to use edit mode, force them to view mode
  useEffect(() => {
    if (!isLoading && !isAuthenticated && developerMode) {
      setDeveloperMode(false);
    }
  }, [isLoading, isAuthenticated, developerMode, setDeveloperMode]);

  // Don't show overlay if:
  // - Still loading auth
  // - User is authenticated
  // - User is in view mode (not trying to edit)
  // - User is public (they can't edit anyway)
  if (isLoading || isAuthenticated || !developerMode || currentRole === 'public') {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl p-8 max-w-md mx-4 border border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-900/20 flex items-center justify-center">
            <LogIn className="h-8 w-8 text-violet-600 dark:text-violet-400" />
          </div>
          
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              Connexion requise
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Vous devez être connecté pour modifier ce projet.
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full">
            <Link
              href="/login"
              className="w-full px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-medium transition-colors text-center"
            >
              Se connecter
            </Link>
            <Link
              href="/register"
              className="w-full px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg font-medium transition-colors text-center"
            >
              Créer un compte
            </Link>
            <button
              onClick={() => setDeveloperMode(false)}
              className="w-full px-4 py-2.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg font-medium transition-colors"
            >
              Continuer en lecture seule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

