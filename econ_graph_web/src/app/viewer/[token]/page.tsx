'use client';

import { GraphCanvas } from '@/components/graph/GraphCanvas';
import { GraphEnvironment } from '@/components/graph/GraphEnvironment';
import { apiClient } from '@/lib/api/client';
import type { Edge, Node } from '@/lib/types';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

// Inline API call since we have trouble writing to lib
interface ViewerProjectData {
  project: {
    id: string;
    name: string;
    updated_at: string;
  };
  nodes: Node[];
  edges: Edge[];
}

const getViewerProject = async (token: string): Promise<ViewerProjectData> => {
  return apiClient.get<ViewerProjectData>(`/viewer/${token}`);
};

export default function ViewerPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [data, setData] = useState<ViewerProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    
    getViewerProject(token)
      .then(setData)
      .catch((err) => {
        console.error(err);
        setError("Impossible de charger le projet. Le lien est peut-être invalide ou expiré.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p>{error || "Projet introuvable"}</p>
      </div>
    );
  }

  // Mock context values for read-only view
  const graphData = {
    nodes: data.nodes,
    edges: data.edges,
    isLoading: false,
    refresh: () => {},
    persistNodePositions: async () => {},
  };

  const graphActions = {
    mode: 'project' as const,
    getNodeById: (id: string) => data.nodes.find((n) => n.id === id),
    createNode: async () => { throw new Error('Read-only'); },
    updateNode: async () => { throw new Error('Read-only'); },
    deleteNode: async () => { throw new Error('Read-only'); },
    refreshNodes: () => {},
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-900">
      <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            {data.project.name}
          </span>
          <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800">
            Read-only
          </span>
        </div>
        <div className="text-xs text-zinc-400">
          Powered by Econ Graph
        </div>
      </header>
      
      <main className="flex-1 relative">
        <GraphEnvironment data={graphData} actions={graphActions}>
           {/* We need to pass readOnly prop to GraphCanvas, but first we need to add it to GraphCanvas */}
           <GraphCanvas readOnly={true} />
        </GraphEnvironment>
        
        {/* Overlay to prevent interactions if GraphCanvas doesn't support readOnly yet fully */}
        {/* But we will implement readOnly in GraphCanvas next */}
      </main>
    </div>
  );
}
