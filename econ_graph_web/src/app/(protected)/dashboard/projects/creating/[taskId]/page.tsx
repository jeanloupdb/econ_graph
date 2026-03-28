/**
 * Page de création de projet avec streaming SSE.
 * Affiche les logs en temps réel pendant la génération du modèle par l'IA.
 */

'use client';

import { AiCreationOverlay } from '@/components/agent/AiCreationOverlay';
import { useAgentStream } from '@/hooks/useAgentStream';
import { useWizard } from '@/hooks/useWizard';
import { apiClient } from '@/lib/api/client';
import { useAgentStore } from '@/store/agentState';
import { useProjectStore } from '@/store/projectState';
import { useRouter } from 'next/navigation';
import { use } from 'react';

interface PageProps {
  params: Promise<{
    taskId: string;
  }>;
}

export default function ProjectCreatingPage({ params }: PageProps) {
  // Unwrap params Promise with React.use() (Next.js 16+)
  const { taskId } = use(params);

  const router = useRouter();
  const { currentTask } = useAgentStore();
  const completeTask = useAgentStore((s) => s.completeTask);
  const { addProject, setCurrentProject } = useProjectStore();
  const { resetConversation } = useWizard();

  // Connect to SSE stream
  const { disconnect } = useAgentStream(taskId, {
    onComplete: async (projectId, error) => {
      if (projectId) {
        try {
          // Reset le wizard pour la prochaine discussion
          await resetConversation();

          // Fetch the new project using apiClient to handle auth and base URL
          const projects = await apiClient.get<any[]>('/projects');
          const newProject = projects.find((p: any) => p.id === projectId);

          if (newProject) {
            addProject({
              id: newProject.id,
              name: newProject.name,
              createdAt: newProject.created_at,
              updatedAt: newProject.updated_at,
              public_view_token: newProject.public_view_token,
            });

            // Set as current and redirect
            setCurrentProject(projectId);
            setTimeout(() => {
              router.push('/graph');
            }, 1000);
          }
        } catch (e) {
          console.error('[Creating] Error fetching project:', e);
          router.push('/dashboard');
        }
      } else {
        console.error('[Creating] Project creation failed:', error);
        setTimeout(() => {
          // Extraire un message d'erreur lisible
          const message = error && typeof error === 'object' && 'message' in error
            ? (error as any).message
            : typeof error === 'string'
              ? error
              : 'Une erreur inconnue est survenue';

          router.push(`/dashboard?error=${encodeURIComponent(message)}&type=creation_failed`);
        }, 2000);
      }
    },
  });

  const handleCancel = () => {
    disconnect();
    completeTask(undefined, "Création annulée par l'utilisateur.");
    const message = encodeURIComponent("Création annulée par l'utilisateur.");
    router.push(`/dashboard?error=${message}&type=creation_failed`);
  };

  return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center">
      <AiCreationOverlay
        isVisible={true}
        logs={currentTask?.logs || []}
        status={currentTask?.status || 'initializing'}
        currentStep={currentTask?.currentStep}
        onCancel={handleCancel}
      />
    </div>
  );
}
