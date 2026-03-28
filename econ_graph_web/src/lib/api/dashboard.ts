import { apiClient } from './client';
import type { DashboardConfig } from '@/types/dashboard';

export async function generateDashboard(projectId: string): Promise<DashboardConfig> {
  return apiClient.post<DashboardConfig>(`/ai/dashboard/${projectId}/generate`, {});
}
