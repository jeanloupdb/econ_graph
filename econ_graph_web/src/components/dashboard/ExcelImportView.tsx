"use client";

import { AiCreationOverlay } from "@/components/agent/AiCreationOverlay";
import { apiClient } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/projectState";
import { Check, FileSpreadsheet, LucideIcon, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

interface ExcelImportViewProps {
  onCancel: () => void;
}

interface ImportResponse {
  project_id: string;
  project_name: string;
  nodes_created: number;
  edges_created: number;
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

export function ExcelImportView({ onCancel }: ExcelImportViewProps) {
  const router = useRouter();
  const { load, setCurrentProject } = useProjectStore();
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  }, []);

  const processFile = useCallback(async (file: File) => {
    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    // Check extension as fallback
    const isExcel = validTypes.includes(file.type) || 
                   file.name.endsWith('.xlsx') || 
                   file.name.endsWith('.xls');

    if (!isExcel) {
      toast.error("Format non supporté. Veuillez utiliser un fichier .xlsx ou .xls");
      return;
    }

    setErrorMessage(null);
    setUploadFile(file);
    setIsUploading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const formData = new FormData();
    formData.append("file", file);
    // Use filename without extension as project name
    const projectName = file.name.replace(/\.[^/.]+$/, "");
    formData.append("project_name", projectName);
    formData.append("max_cells", "5000");

    try {
      const result = await apiClient.post<ImportResponse>(
        "/projects/import/excel",
        formData,
        { signal: controller.signal }
      );

      toast.success(
        `Projet "${result.project_name}" créé avec succès`,
        { description: `${result.nodes_created} variables et ${result.edges_created} dépendances détectées.` }
      );

      // Reload projects and navigate
      await load();
      setCurrentProject(result.project_id);
      router.push("/graph");

    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error(
        formatImportError(error),
        { description: "Vérifiez que votre fichier Excel est valide." }
      );
      setErrorMessage(formatImportError(error));
      setIsUploading(false);
      setUploadFile(null);
    } finally {
      abortRef.current = null;
    }
  }, [load, router, setCurrentProject]);

  const handleCancelImport = useCallback(() => {
    abortRef.current?.abort();
    setIsUploading(false);
    setUploadFile(null);
    toast.info("Import annulé");
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setErrorMessage(null);
      processFile(e.dataTransfer.files[0]);
    }
  }, [processFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setErrorMessage(null);
      processFile(e.target.files[0]);
    }
  }, [processFile]);

  return (
    <>
      <AiCreationOverlay
        isVisible={isUploading}
        logs={[
            { timestamp: new Date().toISOString(), message: `Analyse du fichier ${uploadFile?.name || 'Excel'}...`, step: 'init', type: 'log' },
            { timestamp: new Date().toISOString(), message: `Extraction des formules et dépendances`, step: 'analyste', type: 'log' },
            { timestamp: new Date().toISOString(), message: `Construction du graphe causal`, step: 'executeur', type: 'log' }
        ]}
        status="executing"
        currentStep="executeur"
        onCancel={handleCancelImport}
      />

      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
        <div className="max-w-xl w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-1 ring-emerald-500/20 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]">
              <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
            </div>
            <h2 className="text-xl font-semibold text-zinc-100 mb-2">Importer un modèle Excel</h2>
            <p className="text-sm text-zinc-400 max-w-sm mx-auto leading-relaxed">
              Transformez instantanément vos feuilles de calcul en graphes causaux interactifs. 
            </p>
          </div>

          {/* Dropzone */}
          <label
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={cn(
              "relative group cursor-pointer block rounded-2xl border-2 border-dashed transition-all duration-300 p-6 sm:p-10 text-center overflow-hidden",
              isDragActive 
                ? "border-emerald-500 bg-emerald-500/5 scale-[1.02] shadow-xl shadow-emerald-500/10" 
                : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-800/80 hover:shadow-lg hover:shadow-black/20"
            )}
          >
            <input 
              type="file" 
              className="hidden" 
              accept=".xlsx,.xls"
              onChange={handleInputChange}
            />
            
            <div className="flex flex-col items-center gap-4 relative z-10">
              <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 border border-white/[0.05]",
                isDragActive ? "bg-emerald-500/20 scale-110" : "bg-zinc-800 group-hover:bg-zinc-700 group-hover:scale-105"
              )}>
                <Upload className={cn(
                  "w-7 h-7 transition-colors duration-300",
                  isDragActive ? "text-emerald-400" : "text-zinc-500 group-hover:text-zinc-300"
                )} />
              </div>
              
              <div className="space-y-1">
                <p className={cn(
                  "text-sm font-medium transition-colors",
                  isDragActive ? "text-emerald-400" : "text-zinc-300 group-hover:text-zinc-100"
                )}>
                  {isDragActive ? "Déposez le fichier ici" : "Cliquez ou glissez un fichier ici"}
                </p>
                <p className="text-xs text-zinc-500">
                  Supporte .xlsx et .xls (max 10MB)
                </p>
              </div>
            </div>

            {/* Background pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
          </label>

          {/* Features / Constraints */}
          <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FeatureItem icon={Check} label="Détection automatique des formules" />
            <FeatureItem icon={Check} label="Extraction des variables d'entrée" />
            <FeatureItem icon={Check} label="Visualisation des dépendances" />
            <FeatureItem icon={Check} label="Conversion en scénarios" />
          </div>

          {errorMessage && (
            <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-200">
              {errorMessage}
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 flex justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCancel();
              }}
              className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors py-2 px-4 hover:bg-zinc-800/50 rounded-lg"
            >
              Retour à l'assistant
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function FeatureItem({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700/50 transition-colors">
      <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20">
        <Icon className="w-3 h-3 text-emerald-400" />
      </div>
      <span className="text-[12px] text-zinc-400 font-medium leading-tight">{label}</span>
    </div>
  );
}
