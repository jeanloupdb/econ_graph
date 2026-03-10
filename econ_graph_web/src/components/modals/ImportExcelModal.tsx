"use client";

import { AiCreationOverlay } from "@/components/agent/AiCreationOverlay";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/projectState";
import { FileSpreadsheet, FileText, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

interface ImportExcelModalProps {
  open: boolean;
  onClose: () => void;
}

interface ImportResponse {
  project_id: string;
  project_name: string;
  nodes_created: number;
  edges_created: number;
  summary: {
    total_cells: number;
    parameters: number;
    calculations: number;
    results: number;
  };
}

function formatImportError(error: unknown): string {
  let message = error instanceof Error ? error.message : "Échec de l'import";
  const prefixes = [
    "Failed to parse Excel file: ",
    "Failed to analyze Excel file: ",
  ];
  for (const prefix of prefixes) {
    if (message.startsWith(prefix)) {
      message = message.slice(prefix.length).trim();
      break;
    }
  }
  return message || "Échec de l'import";
}

async function extractErrorMessage(response: Response): Promise<string> {
  const raw = await response.text();
  if (!raw) {
    return `Échec de l'import (HTTP ${response.status})`;
  }

  try {
    const data = JSON.parse(raw);
    const detail = data?.detail ?? data?.message ?? data?.error;
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
    if (Array.isArray(detail)) {
      return detail
        .map((err) => {
          const loc = Array.isArray(err?.loc) ? err.loc.join(".") : "input";
          const msg = err?.msg || "invalide";
          return `${loc}: ${msg}`;
        })
        .join("; ");
    }
    if (detail && typeof detail === "object") {
      return JSON.stringify(detail);
    }
  } catch {
    // raw is not JSON, fall through to return it as-is
  }

  return raw.trim() || `Échec de l'import (HTTP ${response.status})`;
}

export function ImportExcelModal({ open, onClose }: ImportExcelModalProps) {
  const router = useRouter();
  const { load, setCurrentProject } = useProjectStore();

  const [file, setFile] = useState<File | null>(null);
  const [projectName, setProjectName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleFileChange = useCallback((selectedFile: File | null) => {
    if (selectedFile) {
      setFile(selectedFile);
      // Auto-generate project name from filename
      if (!projectName) {
        const name = selectedFile.name.replace(/\.(xlsx|xls)$/i, "");
        setProjectName(name);
      }
    }
  }, [projectName]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.match(/\.(xlsx|xls)$/i)) {
      handleFileChange(droppedFile);
    } else {
      toast.error("Veuillez déposer un fichier Excel (.xlsx)");
    }
  }, [handleFileChange]);

  const handleImport = async () => {
    if (!file) {
      toast.error("Veuillez sélectionner un fichier");
      return;
    }

    setIsUploading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (projectName) {
        formData.append("project_name", projectName);
      }
      formData.append("max_cells", "100");

      // Get auth token
      const token = localStorage.getItem("auth_token");

      // Get API base URL
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || `${window.location.protocol}//${window.location.hostname}:8000`;

      const response = await fetch(`${apiBase}/projects/import/excel`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        const message = await extractErrorMessage(response);
        throw new Error(message);
      }

      const result: ImportResponse = await response.json();

      toast.success(
        `Projet créé avec ${result.nodes_created} variables et ${result.edges_created} dépendances`,
        { duration: 5000 }
      );

      // Reload projects and navigate
      await load();
      setCurrentProject(result.project_id);
      onClose();
      router.push("/graph");

    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error(
        formatImportError(error)
      );
    } finally {
      setIsUploading(false);
      abortRef.current = null;
    }
  };

  const handleCancelImport = useCallback(() => {
    abortRef.current?.abort();
    setIsUploading(false);
    toast.info("Import annulé");
  }, []);

  const handleClose = () => {
    setFile(null);
    setProjectName("");
    onClose();
  };

  return (
    <>
      <AiCreationOverlay
        isVisible={isUploading}
        logs={[
            { timestamp: new Date().toISOString(), message: `Analyse du fichier ${file?.name || 'Excel'}...`, step: 'analyste', type: 'log' },
            { timestamp: new Date().toISOString(), message: `💡 Traduction de la structure vers SmartGraph`, step: 'analyste', type: 'log' }
        ]}
        status="executing"
        currentStep="executeur"
        onCancel={handleCancelImport}
      />

      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !isUploading && handleClose()}>
        <DialogContent className={cn(
          "sm:max-w-[440px] w-full bg-white border border-zinc-200 p-0 gap-0 overflow-hidden shadow-2xl rounded-2xl",
          isUploading && "hidden"
        )}>
          {/* Header */}
            <div className="flex items-center justify-between p-4 px-5 border-b border-zinc-100 bg-white">
              <DialogTitle className="text-[14px] font-medium text-zinc-900">
                Importer un Excel
              </DialogTitle>
              <button
                onClick={handleClose}
                className="text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 p-1 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-6">
              {/* Drop zone */}
              <div
                className={cn(
                  "relative group border-2 border-dashed rounded-lg transition-all duration-200 ease-out w-full max-w-full overflow-hidden",
                  dragOver
                    ? "border-blue-400 bg-blue-50"
                    : file
                      ? "border-emerald-300 bg-emerald-50/50 p-0"
                      : "border-zinc-300 hover:border-blue-400 bg-zinc-50 hover:bg-blue-50 py-10 px-6"
                )}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                {file ? (
                  <div className="flex items-center gap-3 p-3 w-full">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white border border-zinc-200 shadow-sm">
                      <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <p className="text-[13px] font-medium text-zinc-900 truncate max-w-[240px]" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-[11px] text-zinc-500 font-medium">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                      className="shrink-0 p-1.5 rounded-md hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center justify-center gap-3">
                    <div className="p-2.5 rounded-lg bg-white border border-zinc-200 shadow-sm group-hover:scale-105 transition-transform duration-200">
                      <Upload className="h-5 w-5 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
                    </div>
                    <div className="space-y-1 text-center">
                      <p className="text-[13px] font-medium text-zinc-700">
                        Glissez votre fichier Excel
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        Cliquez pour parcourir
                      </p>
                    </div>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                    />
                  </label>
                )}
              </div>

              {/* Project name */}
              <div className="space-y-2 w-full">
                <Label htmlFor="project-name" className="text-[12px] font-medium text-zinc-500">
                  Nom du projet
                </Label>
                <div className="relative w-full">
                  <Input
                    id="project-name"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Ex: Analyse Rentabilité"
                    className="bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400 h-9 text-[13px] focus-visible:ring-1 focus-visible:ring-zinc-400 focus-visible:border-zinc-400 rounded-md shadow-sm w-full transition-all"
                  />
                </div>
              </div>

              {/* Info Badge */}
              <div className="flex items-start gap-3 p-3 rounded-md bg-zinc-50 border border-zinc-200">
                <div className="shrink-0 mt-0.5 text-zinc-400">
                   <FileText className="h-4 w-4" />
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Notre IA analyse automatiquement la structure de votre fichier pour détecter paramètres et résultats.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-4 bg-zinc-50 border-t border-zinc-100">
              <Button
                variant="ghost"
                onClick={handleClose}
                className="h-8 px-3 text-[13px] font-medium text-zinc-600 hover:text-zinc-800 hover:bg-zinc-100 rounded-md transition-colors border border-zinc-200"
                disabled={isUploading}
              >
                Annuler
              </Button>
              <Button
                onClick={handleImport}
                disabled={!file || isUploading}
                className={cn(
                   "h-8 px-4 text-[13px] font-medium rounded-md transition-all duration-200 shadow-sm",
                   !file || isUploading
                     ? "bg-zinc-200 border border-zinc-300 text-zinc-400 cursor-not-allowed"
                     : "bg-zinc-900 hover:bg-zinc-800 text-white border-transparent"
                )}
              >
                Importer
              </Button>
            </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
