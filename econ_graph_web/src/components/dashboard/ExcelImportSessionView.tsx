"use client";

import { AiCreationOverlay } from "@/components/agent/AiCreationOverlay";
import { BlockSelectionView } from "@/components/dashboard/BlockSelectionView";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useExcelImportSession } from "@/hooks/useExcelImportSession";
import { cn } from "@/lib/utils";
import { AlertCircle, FileSpreadsheet, RefreshCw, Upload } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

interface ExcelImportSessionViewProps {
  onCancel: () => void;
}

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
    cancel,
    reset,
    isExcelFile,
  } = useExcelImportSession();

  const [isDragActive, setIsDragActive] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const processFile = useCallback(async (file: File) => {
    if (!isExcelFile(file)) {
      toast.error("Format non supporté. Utilisez un fichier .xlsx ou .xls");
      return;
    }
    setCurrentFile(file);
    const controller = new AbortController();
    abortRef.current = controller;
    await createSession(file, { signal: controller.signal });
    abortRef.current = null;
  }, [createSession, isExcelFile]);

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

  const handleReset = useCallback(() => {
    abortRef.current?.abort();
    setCurrentFile(null);
    reset();
  }, [reset]);

  const handleCancel = useCallback(async () => {
    abortRef.current?.abort();
    await cancel();
    setCurrentFile(null);
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

  return (
    <>
      <AiCreationOverlay
        isVisible={overlayVisible}
        variant="import"
        logs={[{
          timestamp: new Date().toISOString(),
          message: isCreating
            ? `Qualification du fichier ${currentFile?.name ?? "Excel"}…`
            : "Construction du graphe causal…",
          step: overlayStep,
          type: "log",
        }]}
        status="executing"
        currentStep={overlayStep}
        onCancel={handleCancel}
      />

      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
        <div className="max-w-2xl w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-1 ring-emerald-500/20">
              <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Importer un modèle Excel</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              Smart Graph analyse le classeur et vous propose les blocs importables.
            </p>
          </div>

          <Card className="border-border/70">
            <CardHeader className="pb-4">
              <CardTitle className="text-base text-foreground">
                {showUpload && "Qualification du classeur"}
                {showSelection && `${session.candidate_blocks.filter(b => b.formula_count > 0).length} feuille(s) exploitable(s)`}
                {showRefused && "Fichier non adapté"}
              </CardTitle>
            </CardHeader>

            <CardContent>
              {/* Upload zone */}
              {showUpload && (
                <div className="space-y-4">
                  <input
                    ref={inputRef}
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls"
                    onChange={handleInputChange}
                  />

                  <div
                    role="button"
                    tabIndex={0}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => inputRef.current?.click()}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
                    className={cn(
                      "relative cursor-pointer block rounded-2xl border-2 border-dashed transition-all duration-200 p-8 text-center",
                      isDragActive
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-border hover:border-emerald-300 hover:bg-emerald-50/40"
                    )}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center border transition-colors",
                        isDragActive ? "bg-emerald-100 border-emerald-200" : "bg-background border-border"
                      )}>
                        <Upload className={cn("w-5 h-5 transition-colors", isDragActive ? "text-emerald-600" : "text-muted-foreground")} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {isDragActive ? "Déposez le fichier ici" : "Cliquez ou déposez un fichier"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">.xlsx ou .xls · max 10 MB</p>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Block selection */}
              {showSelection && (
                <BlockSelectionView
                  session={session}
                  onConfirm={async (scope) => {
                    await selectScope(scope);
                    await handleCommit();
                  }}
                  onBack={handleReset}
                  isLoading={isLoading}
                />
              )}

              {/* Refused state */}
              {showRefused && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4">
                    <p className="text-sm font-medium text-red-900 mb-1">Fichier non adapté</p>
                    <p className="text-sm text-red-700">
                      {session.verdict_message ?? "Ce classeur n'est pas compatible avec Smart Graph."}
                    </p>
                    {session.errors.length > 0 && (
                      <p className="mt-2 text-xs text-red-600">{session.errors[0]}</p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Smart Graph modélise des relations causales (formules, dépendances entre variables).
                    Essayez un classeur avec des formules Excel ou décrivez votre modèle dans le chat.
                  </p>
                  <Button variant="outline" className="w-full" onClick={handleReset}>
                    <RefreshCw className="w-4 h-4" />
                    Choisir un autre fichier
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-6 flex justify-center">
            <button
              onClick={(e) => { e.stopPropagation(); onCancel(); }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2 px-4 hover:bg-accent rounded-lg"
            >
              Retour à l&apos;assistant
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
