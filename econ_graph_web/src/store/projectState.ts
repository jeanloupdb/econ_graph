import { apiClient } from '@/lib/api/client';
import { create } from 'zustand';

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  public_view_token?: string | null;
  user_id?: string | null;
  user_role?: 'owner' | 'editor' | 'viewer' | 'public' | null;
  generation_prompt?: string | null;
  description?: string | null;
}

interface ProjectState {
  projects: Project[];
  currentProjectId: string | null;
  load: () => void;
  createProject: (name: string) => Promise<Project>;
  deleteProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
  setCurrentProject: (id: string) => void;
  shareProject: (id: string) => Promise<{ public_view_token: string }>;
  revokeShare: (id: string) => Promise<void>;
  addProject: (project: Project) => void;
  // Permission helpers
  canEdit: (projectId?: string | null) => boolean;
  canShare: (projectId?: string | null) => boolean;
  isOwner: (projectId?: string | null) => boolean;
  getCurrentRole: () => 'owner' | 'editor' | 'viewer' | 'public' | null;
}

const LS_KEY = 'eg_projects_v1';
const LS_CUR = 'eg_current_project';

function save(projects: Project[], currentProjectId: string | null) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(projects));
    if (currentProjectId) localStorage.setItem(LS_CUR, currentProjectId);
  } catch {}
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProjectId: null,

  load: async () => {
    let fallbackProjects: Project[] = [];
    let fallbackCurrent: string | null = null;
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(LS_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as Project[];
          if (Array.isArray(parsed)) {
            fallbackProjects = parsed;
          }
        }
        fallbackCurrent = localStorage.getItem(LS_CUR);
        if (fallbackProjects.length > 0) {
          set({
            projects: fallbackProjects,
            currentProjectId: fallbackCurrent || fallbackProjects[0]?.id || null,
          });
        }
      } catch {
        // ignore JSON errors
      }
    }
    try {
      let raw: any[] = await apiClient.get<any[]>('/projects');
      const projs: Project[] = (raw || []).map((p) => ({
        id: p.id,
        name: p.name,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        public_view_token: p.public_view_token,
        user_id: p.user_id,
        user_role: p.user_role,
        generation_prompt: p.generation_prompt,
        description: p.description,
      }));
      const cur = typeof window !== 'undefined' ? localStorage.getItem(LS_CUR) : null;
      const nextCurrent = cur || (projs[0]?.id || null);
      set({ projects: projs, currentProjectId: nextCurrent });
      save(projs, nextCurrent);
    } catch (err) {
      console.error('Failed to load projects', err);
      if (fallbackProjects.length === 0) {
        set({ projects: [], currentProjectId: null });
      }
    }
  },

  createProject: async (name: string) => {
    const now = new Date().toISOString();
    const idBase = name.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const id = `${idBase || 'project'}-${Date.now().toString(36)}`.slice(0, 48);
    const p: Project = { id, name: name.trim() || 'Untitled Project', createdAt: now, updatedAt: now };
    
    // Persist via API and wait for it
    try {
      await apiClient.post<Project, { id: string; name: string }>('/projects', { id: p.id, name: p.name });
    } catch (e) {
      console.error("Failed to create project on backend", e);
      // We still continue with local state, but this might be risky if backend is down
    }

    const projs = [...get().projects, p];
    set({ projects: projs, currentProjectId: id });
    save(projs, id);
    return p;
  },

  deleteProject: (id: string) => {
    apiClient.delete(`/projects/${id}`).catch(() => {});
    const projs = get().projects.filter((p) => p.id !== id);
    let cur = get().currentProjectId;
    if (cur === id) cur = projs[0]?.id || null;
    set({ projects: projs, currentProjectId: cur });
    save(projs, cur);
  },

  renameProject: (id: string, name: string) => {
    apiClient.patch(`/projects/${id}`, { name }).catch(() => {});
    const projs = get().projects.map((p) => (p.id === id ? { ...p, name, updatedAt: new Date().toISOString() } : p));
    set({ projects: projs });
    save(projs, get().currentProjectId);
  },

  setCurrentProject: (id: string) => {
    set({ currentProjectId: id });
    save(get().projects, id);
  },

  shareProject: async (id: string) => {
    const res = await apiClient.post<{ public_view_token: string }>(`/projects/${id}/share`, {});
    const projs = get().projects.map((p) => (p.id === id ? { ...p, public_view_token: res.public_view_token } : p));
    set({ projects: projs });
    save(projs, get().currentProjectId);
    return res;
  },

  revokeShare: async (id: string) => {
    await apiClient.delete(`/projects/${id}/share`);
    const projs = get().projects.map((p) => (p.id === id ? { ...p, public_view_token: null } : p));
    set({ projects: projs });
    save(projs, get().currentProjectId);
    set({ projects: projs });
    save(projs, get().currentProjectId);
  },

  addProject: (project: Project) => {
    const projs = [project, ...get().projects];
    // Ensure uniqueness just in case
    const uniqueProjs = Array.from(new Map(projs.map(p => [p.id, p])).values());
    set({ projects: uniqueProjs });
    save(uniqueProjs, get().currentProjectId);
  },

  // Permission helpers
  canEdit: (projectId?: string | null) => {
    const id = projectId || get().currentProjectId;
    if (!id) return false;
    const project = get().projects.find(p => p.id === id);
    if (!project) return false;
    return project.user_role === 'owner' || project.user_role === 'editor';
  },

  canShare: (projectId?: string | null) => {
    const id = projectId || get().currentProjectId;
    if (!id) return false;
    const project = get().projects.find(p => p.id === id);
    if (!project) return false;
    return project.user_role === 'owner';
  },

  isOwner: (projectId?: string | null) => {
    const id = projectId || get().currentProjectId;
    if (!id) return false;
    const project = get().projects.find(p => p.id === id);
    if (!project) return false;
    return project.user_role === 'owner';
  },

  getCurrentRole: () => {
    const id = get().currentProjectId;
    if (!id) return null;
    const project = get().projects.find(p => p.id === id);
    return project?.user_role || null;
  },
}));
