/**
 * Hook pour gérer le Smart Profile de l'utilisateur.
 * Charge le profil au démarrage et expose les méthodes pour le mettre à jour.
 */

import { getSmartProfile, saveSmartProfile } from '@/lib/api/smart-profile';
import { SmartProfile, SmartProfileUpdate } from '@/types/smart-profile';
import { useCallback, useEffect, useState } from 'react';

const SESSION_KEY = 'smart_profile_dismissed';

interface UseSmartProfileReturn {
  profile: SmartProfile | null;
  isLoading: boolean;
  needsOnboarding: boolean;
  saveProfile: (data: SmartProfileUpdate) => Promise<void>;
  dismissOnboarding: () => void;
  markAsCompleted: () => void;  // Force local state to show as completed
  refetch: () => Promise<void>;
}

export function useSmartProfile(): UseSmartProfileReturn {
  const [profile, setProfile] = useState<SmartProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [forceCompleted, setForceCompleted] = useState(false);

  // Check if user dismissed onboarding this session
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const wasDismissed = sessionStorage.getItem(SESSION_KEY) === 'true';
      setDismissed(wasDismissed);
    }
  }, []);

  // Load profile on mount
  const loadProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getSmartProfile();
      setProfile(data);
      // If profile is completed, reset forceCompleted flag
      if (data?.completed) {
        setForceCompleted(false);
      }
    } catch (error) {
      console.error('Failed to load smart profile:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Save profile
  const saveProfileHandler = useCallback(async (data: SmartProfileUpdate) => {
    const saved = await saveSmartProfile(data);
    setProfile(saved);
    // Clear dismissed flag since they completed it
    sessionStorage.removeItem(SESSION_KEY);
    setDismissed(false);
  }, []);

  // Dismiss onboarding for this session
  const dismissOnboarding = useCallback(() => {
    sessionStorage.setItem(SESSION_KEY, 'true');
    setDismissed(true);
  }, []);

  // Mark profile as completed locally (used after ProfileOnboarding saves)
  const markAsCompleted = useCallback(() => {
    setForceCompleted(true);
  }, []);

  // Determine if we need to show onboarding
  const needsOnboarding = !isLoading && !profile?.completed && !dismissed && !forceCompleted;

  return {
    profile,
    isLoading,
    needsOnboarding,
    saveProfile: saveProfileHandler,
    dismissOnboarding,
    markAsCompleted,
    refetch: loadProfile,
  };
}
