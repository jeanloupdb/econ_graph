/**
 * API client for demo project creation (no auth required).
 */

import { API_BASE_URL } from './client';

/**
 * Create a demo project without authentication.
 * Rate-limited to 1 per IP per 24h.
 */
export async function createDemoProject(prompt: string): Promise<{
  task_id: string;
  message: string;
}> {
  const formData = new FormData();
  formData.append('prompt', prompt);

  const response = await fetch(`${API_BASE_URL}/ai/demo-create`, {
    method: 'POST',
    body: formData,
  });

  if (response.status === 429) {
    const data = await response.json();
    throw new Error(data.detail || 'Limite atteinte — créez un compte pour continuer.');
  }

  if (!response.ok) {
    throw new Error('Erreur lors de la création du modèle démo.');
  }

  return response.json();
}

/**
 * Claim a demo project after registration/login.
 */
export async function claimDemoProject(demoToken: string): Promise<{
  project_id: string;
  message: string;
}> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  const response = await fetch(`${API_BASE_URL}/ai/demo-claim`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ demo_token: demoToken }),
  });

  if (!response.ok) {
    throw new Error('Impossible de rattacher le projet.');
  }

  return response.json();
}
