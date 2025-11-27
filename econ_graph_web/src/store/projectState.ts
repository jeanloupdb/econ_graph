import { create } from 'zustand';
import { apiClient } from '@/lib/api/client';

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectState {
  projects: Project[];
  currentProjectId: string | null;
  load: () => void;
  createProject: (name: string) => Project;
  deleteProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
  setCurrentProject: (id: string) => void;
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
      if (!Array.isArray(raw) || raw.length === 0) {
        const def = { id: 'default', name: 'Default Graph' };
        try { await apiClient.post('/projects', def); } catch {}
        raw = await apiClient.get<any[]>('/projects');
      }
      const projs: Project[] = (raw || []).map((p) => ({
        id: p.id,
        name: p.name,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
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

  createProject: (name: string) => {
    const now = new Date().toISOString();
    const idBase = name.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const id = `${idBase || 'project'}-${Date.now().toString(36)}`.slice(0, 48);
    const p: Project = { id, name: name.trim() || 'Untitled Project', createdAt: now, updatedAt: now };
    // Persist via API
    apiClient.post<Project, { id: string; name: string }>('/projects', { id: p.id, name: p.name }).catch(() => {});
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
}));
