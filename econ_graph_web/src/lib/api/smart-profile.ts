/**
 * API client pour le Smart Profile.
 */

import { SmartProfile, SmartProfileUpdate } from '@/types/smart-profile';
import { API_BASE_URL } from './client';

/**
 * Récupère le token d'authentification depuis localStorage.
 */
function getAuthHeader(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('auth_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

/**
 * Récupère le profil de l'utilisateur.
 */
export async function getSmartProfile(): Promise<SmartProfile | null> {
  const response = await fetch(`${API_BASE_URL}/auth/me/smart_profile`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch smart profile');
  }

  const data = await response.json();
  return data.smart_profile || null;
}

/**
 * Sauvegarde le profil de l'utilisateur.
 */
export async function saveSmartProfile(profile: SmartProfileUpdate): Promise<SmartProfile> {
  const response = await fetch(`${API_BASE_URL}/auth/me/smart_profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(profile),
  });

  if (!response.ok) {
    throw new Error('Failed to save smart profile');
  }

  const user = await response.json();
  return user.smart_profile;
}
