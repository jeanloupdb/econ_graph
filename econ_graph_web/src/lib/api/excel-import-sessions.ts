import { apiClient } from "./client";
import type { CommitResult, ImportSession, SelectedScope } from "@/types/excel-import-session";

export async function createImportSession(
  file: File,
  signal?: AbortSignal
): Promise<ImportSession> {
  const formData = new FormData();
  formData.append("file", file);
  return apiClient.post<ImportSession>("/excel-import/sessions", formData, { signal });
}

export async function getImportSession(sessionId: string): Promise<ImportSession> {
  return apiClient.get<ImportSession>(`/excel-import/sessions/${sessionId}`);
}

export async function selectImportScope(
  sessionId: string,
  scope: SelectedScope,
  signal?: AbortSignal
): Promise<ImportSession> {
  return apiClient.post<ImportSession>(
    `/excel-import/sessions/${sessionId}/selection`,
    scope,
    { signal }
  );
}

export async function commitImportSession(
  sessionId: string,
  projectName: string,
  signal?: AbortSignal
): Promise<CommitResult> {
  return apiClient.post<CommitResult>(
    `/excel-import/sessions/${sessionId}/commit`,
    { project_name: projectName },
    { signal }
  );
}

export async function cancelImportSession(sessionId: string): Promise<void> {
  await apiClient.delete(`/excel-import/sessions/${sessionId}`);
}
