"use client";

import { AiCreationOverlay } from "@/components/agent/AiCreationOverlay";
import { BlockSelectionView } from "@/components/dashboard/BlockSelectionView";
import { SmartGraphLogo } from "@/components/ui/SmartGraphLogo";
import { useExcelImportSession } from "@/hooks/useExcelImportSession";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  FileSpreadsheet,
  FileUp,
  RefreshCw,
  Upload,
} from "lucide-react";
import { type ReactNode, useCallback, useRef, useState } from "react";
import { toast } from "sonner";

interface ExcelImportSessionViewProps {
  onCancel: () => void;
}

type ImportIntent = "smgp" | "excel";

export function ExcelImportSessionView({ onCancel }: ExcelImportSessionViewProps) {
  const {
    status,
    session,
    error,
    isCreating,
    isImporting,
    isLoading,
    createSession,
    selectScope,
    commit,
    importSmgp,
    cancel,
    reset,
    isSmgpFile,
    isSupportedImportFile,
  } = useExcelImportSession();

  const [isDragActive, setIsDragActive] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [importIntent, setImportIntent] = useState<ImportIntent | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const detectIntent = useCallback(
    (file: File): ImportIntent => (isSmgpFile(file) ? "smgp" : "excel"),
    [isSmgpFile]
  );

  const activeIntent = currentFile ? detectIntent(currentFile) : importIntent;
  const fileInputAccept =
    activeIntent === "smgp"
      ? ".smgp"
      : activeIntent === "excel"
        ? ".xlsx,.xls"
        : ".smgp,.xlsx,.xls";

  const processFile = useCallback(async (file: File) => {
    if (!isSupportedImportFile(file)) {
      toast.error("Format non supporté. Utilisez un fichier .smgp, .xlsx ou .xls");
      return;
    }

    const detectedIntent = detectIntent(file);
    setImportIntent(detectedIntent);
    setCurrentFile(file);

    const controller = new AbortController();
    abortRef.current = controller;

    if (detectedIntent === "smgp") {
      const projectName = file.name.replace(/\.[^.]+$/, "");
      await importSmgp(file, projectName, { signal: controller.signal });
      abortRef.current = null;
      return;
    }

    await createSession(file, { signal: controller.signal });
    abortRef.current = null;
  }, [createSession, detectIntent, importSmgp, isSupportedImportFile]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(e.type === "dragenter" || e.type === "dragover");
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
  }, [processFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) processFile(e.target.files[0]);
    e.target.value = "";
  }, [processFile]);

  const openPicker = useCallback((intent?: ImportIntent) => {
    if (intent) setImportIntent(intent);
    inputRef.current?.click();
  }, []);

  const handleReset = useCallback(() => {
    abortRef.current?.abort();
    setCurrentFile(null);
    setImportIntent(null);
    reset();
  }, [reset]);

  const handleCancel = useCallback(async () => {
    abortRef.current?.abort();
    await cancel();
    setCurrentFile(null);
    setImportIntent(null);
  }, [cancel]);

  const handleCommit = useCallback(async () => {
    const name = currentFile?.name.replace(/\.[^.]+$/, "");
    await commit(name);
  }, [commit, currentFile]);

  const showUpload = status === "idle" || status === "error";
  const showSelection = status === "awaiting_selection" && session;
  const showRefused = status === "refused" && session;
  const overlayVisible = isCreating || isImporting;
  const overlayStep = isCreating ? "analyste" : "executeur";
  const fileName = currentFile?.name ?? session?.file_name ?? "";
  const formulaBlocksCount = session?.candidate_blocks.filter((block) => block.formula_count > 0).length ?? 0;

  return (
    <>
      <AiCreationOverlay
        isVisible={overlayVisible}
        variant="import"
        logs={[
          {
            timestamp: new Date().toISOString(),
            message: isCreating
              ? `Qualification du fichier ${currentFile?.name ?? "Excel"}…`
              : activeIntent === "smgp"
                ? `Import du modèle ${currentFile?.name ?? "SmartGraph"}…`
                : "Construction du graphe causal…",
            step: overlayStep,
            type: "log",
          },
        ]}
        status="executing"
        currentStep={overlayStep}
        onCancel={handleCancel}
      />

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          <div className="text-center mb-7">
            <div
              className="font-mono font-black text-violet-400 leading-none select-none mb-4"
              style={{ fontSize: "36px" }}
            >
              ›
            </div>
            <h2 className="text-[19px] font-bold text-zinc-900 tracking-tight leading-snug">
              Importer un modèle
            </h2>
            <p className="mt-2 text-[13px] text-zinc-500">
              SmartGraph direct ou Excel guidé.
            </p>
          </div>

          {showUpload && (
            <div className="space-y-4">
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept={fileInputAccept}
                onChange={handleInputChange}
              />

              <div className="grid grid-cols-2 gap-2">
                <ImportModeButton
                  icon={<SmartGraphLogo size={18} forceHover />}
                  label="SmartGraph"
                  caption=".smgp"
                  active={activeIntent === "smgp"}
                  onClick={() => openPicker("smgp")}
                />
                <ImportModeButton
                  icon={<FileSpreadsheet className="h-4 w-4 text-emerald-600" />}
                  label="Excel"
                  caption=".xlsx /.xls"
                  active={activeIntent === "excel"}
                  onClick={() => openPicker("excel")}
                />
              </div>

              <div
                role="button"
                tabIndex={0}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => openPicker()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openPicker();
                  }
                }}
                className={cn(
                  "rounded-xl border bg-white transition-all duration-150",
                  isDragActive
                    ? "border-violet-300 bg-violet-50/30"
                    : "border-zinc-300 hover:border-violet-300"
                )}
              >
                <div className="flex flex-col items-center px-5 py-8 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50">
                    {activeIntent === "smgp" ? (
                      <FileUp className="h-4 w-4 text-violet-500" />
                    ) : activeIntent === "excel" ? (
                      <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Upload className="h-4 w-4 text-zinc-500" />
                    )}
                  </div>

                  <p className="mt-4 text-[14px] font-medium text-zinc-900">
                    {isDragActive ? "Déposez le fichier ici" : "Cliquez ou glissez un fichier"}
                  </p>
                  <p className="mt-1 text-[12px] text-zinc-400">
                    {activeIntent === "smgp"
                      ? ".smgp"
                      : activeIntent === "excel"
                        ? ".xlsx ou .xls"
                        : ".smgp, .xlsx ou .xls"}
                  </p>
                </div>
              </div>

              {currentFile && (
                <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
                  <p className="text-[13px] font-medium text-zinc-900 truncate">{currentFile.name}</p>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    {activeIntent === "smgp" ? "Import direct" : "Qualification avant import"}
                  </p>
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}

          {showSelection && session && (
            <div className="space-y-4">
              <div className="text-center">
                <div
                  className="font-mono font-black text-violet-400 leading-none select-none mb-3"
                  style={{ fontSize: "32px" }}
                >
                  ›
                </div>
                <h3 className="text-[17px] font-bold text-zinc-900 tracking-tight">
                  Choisissez une feuille
                </h3>
                <p className="mt-1 text-[12px] text-zinc-500">
                  {formulaBlocksCount} option{formulaBlocksCount > 1 ? "s" : ""} utile{formulaBlocksCount > 1 ? "s" : ""} dans {fileName}
                </p>
              </div>

              <BlockSelectionView
                session={session}
                onConfirm={async (scope) => {
                  await selectScope(scope);
                  await handleCommit();
                }}
                onBack={handleReset}
                isLoading={isLoading}
              />
            </div>
          )}

          {showRefused && session && (
            <div className="space-y-4">
              <div className="text-center">
                <div
                  className="font-mono font-black text-violet-400 leading-none select-none mb-3"
                  style={{ fontSize: "32px" }}
                >
                  ›
                </div>
                <h3 className="text-[17px] font-bold text-zinc-900 tracking-tight">
                  Fichier non compatible
                </h3>
              </div>

              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4">
                <p className="text-[13px] text-red-800">
                  {session.verdict_message ?? "Ce fichier ne peut pas être converti proprement."}
                </p>
                {session.errors.length > 0 && (
                  <p className="mt-2 text-[11px] text-red-600">{session.errors[0]}</p>
                )}
              </div>

              <button
                onClick={handleReset}
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[13px] font-medium text-zinc-700 transition-colors hover:border-violet-300"
              >
                Choisir un autre fichier
              </button>
            </div>
          )}

          <div className="mt-5 flex justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCancel();
              }}
              className="h-7 w-7 flex items-center justify-center rounded-lg text-zinc-300 hover:text-zinc-500 hover:bg-zinc-100 transition-colors"
              title="Retour"
              aria-label="Retour"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function ImportModeButton({
  icon,
  label,
  caption,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  caption: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-white px-3.5 py-3 text-left transition-all duration-150",
        active
          ? "border-violet-300 bg-violet-50/30"
          : "border-zinc-200 hover:border-violet-300 hover:bg-violet-50/20"
      )}
      aria-pressed={active}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-zinc-900">{label}</p>
        <p className="text-[11px] text-zinc-400">{caption}</p>
      </div>
    </button>
  );
}
