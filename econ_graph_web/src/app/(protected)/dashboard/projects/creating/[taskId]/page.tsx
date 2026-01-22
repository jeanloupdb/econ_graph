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
  const { addProject, setCurrentProject } = useProjectStore();
  const { resetConversation } = useWizard();

  // Connect to SSE stream
  useAgentStream(taskId, {
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

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgb(255 255 255) 1px, transparent 1px),
              linear-gradient(to bottom, rgb(255 255 255) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }}
        />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-violet-500/[0.03] rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/[0.02] rounded-full blur-[120px]" />
      </div>

      {/* AI Creation Overlay */}
      <AiCreationOverlay
        isVisible={true}
        logs={currentTask?.logs || []}
        status={currentTask?.status || 'initializing'}
        currentStep={currentTask?.currentStep}
      />
    </div>
  );
}
