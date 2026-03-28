/**
 * API client for SmartGraph backend
 * Handles all HTTP requests with typed responses and error handling
 */

import type { APIError } from '../types';

const RAW_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const PROJECT_PARAM_EXCLUSIONS = ['/composites', '/projects'];
const INTERNAL_DNS_ALIASES = new Set(['api', 'backend', 'web']);

const normalizeUrl = (value: string) => value.replace(/\/+$/, '');

function computeBaseUrl(windowHost?: string): string {
  if (RAW_BASE_URL) {
    try {
      const url = new URL(RAW_BASE_URL);
      if (windowHost && INTERNAL_DNS_ALIASES.has(url.hostname)) {
        url.hostname = windowHost;
      }
      return normalizeUrl(url.toString());
    } catch {
      // ignore malformed env value and fall through
    }
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    const apiPort = protocol === 'https:' ? 8443 : 8000;
    return `${protocol}//${windowHost || hostname}:${apiPort}`;
  }

  return 'http://localhost:8000';
}

let serverBaseUrl: string | null = null;
let clientBaseUrl: string | null = null;

function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    if (!clientBaseUrl) {
      clientBaseUrl = computeBaseUrl(window.location.hostname);
    }
    return clientBaseUrl;
  }
  if (!serverBaseUrl) {
    serverBaseUrl = computeBaseUrl();
  }
  return serverBaseUrl;
}

export class APIClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public detail?: string | Array<{ loc: string[]; msg: string; type: string }>
  ) {
    super(message);
    this.name = 'APIClientError';
  }
}

function getCurrentProjectId(): string | null {
  try {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('eg_current_project');
  } catch {
    return null;
  }
}

function withProject(path: string): string {
  if (PROJECT_PARAM_EXCLUSIONS.some((prefix) => path.startsWith(prefix))) {
    return path;
  }
  const pid = getCurrentProjectId();
  if (!pid) return path;
  // append ?project=<pid> or &project=
  const hasQuery = path.includes('?');
  const sep = hasQuery ? '&' : '?';
  // if already has project param, keep
  if (path.includes('project=')) return path;
  return `${path}${sep}project=${encodeURIComponent(pid)}`;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    let detail: APIError['detail'] | undefined;

    try {
      const errorData = await response.json();
      detail = errorData.detail;

      if (typeof detail === 'string') {
        errorMessage = detail;
      } else if (Array.isArray(detail)) {
        // FastAPI validation errors
        const messages = detail.map(err => `${err.loc.join('.')}: ${err.msg}`);
        errorMessage = messages.join('; ');
      }
    } catch {
      // If response is not JSON, use status text
    }

    throw new APIClientError(errorMessage, response.status, detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}


function getAuthHeader(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('auth_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export const apiClient = {
  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${getApiBaseUrl()}${withProject(path)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    return handleResponse<T>(response);
  },

  async post<T, D = unknown>(path: string, data?: D, options?: { signal?: AbortSignal }): Promise<T> {
    const isFormData = data instanceof FormData;
    const headers: HeadersInit = {
      ...getAuthHeader(),
    };

    if (!isFormData) {
      (headers as any)['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${getApiBaseUrl()}${withProject(path)}`, {
      method: 'POST',
      headers,
      body: data ? (isFormData ? (data as any) : JSON.stringify(data)) : undefined,
      signal: options?.signal,
    });
    return handleResponse<T>(response);
  },

  async patch<T, D = unknown>(path: string, data: D): Promise<T> {
    const response = await fetch(`${getApiBaseUrl()}${withProject(path)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    return handleResponse<T>(response);
  },

  async put<T, D = unknown>(path: string, data: D): Promise<T> {
    const response = await fetch(`${getApiBaseUrl()}${withProject(path)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    });
    return handleResponse<T>(response);
  },

  async delete<T>(path: string): Promise<T> {
    const response = await fetch(`${getApiBaseUrl()}${withProject(path)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    return handleResponse<T>(response);
  },
};

export const API_BASE_URL = getApiBaseUrl();

/**
 * Download a file from the API (for binary responses like Excel)
 */
export async function downloadFile(path: string, filename: string): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: 'GET',
    headers: {
      ...getAuthHeader(),
    },
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (typeof errorData.detail === 'string') {
        errorMessage = errorData.detail;
      }
    } catch {
      // Response might not be JSON
    }
    throw new APIClientError(errorMessage, response.status);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
