import { apiClient } from "./client";

export interface SmgpImportResult {
  project_id: string;
  project_name: string;
  nodes_created: number;
  edges_created: number;
  scenarios_created: number;
  composites_created: number;
}

export async function importSmgpProject(
  file: File,
  projectName?: string,
  signal?: AbortSignal
): Promise<SmgpImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  if (projectName) {
    formData.append("project_name", projectName);
  }
  return apiClient.post<SmgpImportResult>("/projects/import/smgp", formData, { signal });
}
