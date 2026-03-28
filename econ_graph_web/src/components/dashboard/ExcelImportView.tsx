"use client";

import { AiCreationOverlay } from "@/components/agent/AiCreationOverlay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useExcelImport } from "@/hooks/useExcelImport";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  ArrowRight,
  Check,
  FileSpreadsheet,
  LucideIcon,
  RefreshCw,
  Sparkles,
  Upload,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

interface ExcelImportViewProps {
  onCancel: () => void;
}

export function ExcelImportView({ onCancel }: ExcelImportViewProps) {
  const {
    state,
    analyzeFile,
    importFile,
    isExcelFile,
    analysis,
    currentFile,
    isAnalyzing,
    isImporting,
    reset,
  } = useExcelImport();
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

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
    if (!isExcelFile(file)) {
      toast.error("Format non supporté. Veuillez utiliser un fichier .xlsx ou .xls");
      return;
    }

    setSelectedFile(file);
    const controller = new AbortController();
    abortRef.current = controller;
    await analyzeFile(file, { signal: controller.signal });
    abortRef.current = null;
  }, [analyzeFile, isExcelFile]);

  const handleCancelImport = useCallback(() => {
    abortRef.current?.abort();
    toast.info(isAnalyzing ? "Analyse annulée" : "Import annulé");
  }, [isAnalyzing]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [processFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
    e.target.value = "";
  }, [processFile]);

  const openFilePicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleImport = useCallback(async () => {
    const file = selectedFile ?? currentFile;
    if (!file) {
      toast.error("Aucun fichier sélectionné");
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    const projectName = file.name.replace(/\.[^/.]+$/, "");
    await importFile(file, projectName, 5000, { signal: controller.signal });
    abortRef.current = null;
  }, [currentFile, importFile, selectedFile]);

  const handleReset = useCallback(() => {
    abortRef.current?.abort();
    setSelectedFile(null);
    reset();
  }, [reset]);

  const file = selectedFile ?? currentFile;
  const showAnalysis = state.status === "analyzed" && analysis;
  const showError = state.status === "error";
  const overlayVisible = isAnalyzing || isImporting;
  const overlayStep = isAnalyzing ? "analyste" : "executeur";
  const primaryCtaLabel = analysis
    ? analysis.import_recommendation === "import_with_simplification"
      ? "Importer avec simplification"
      : "Importer dans Smart Graph"
    : "Analyser le fichier";

  return (
    <>
      <AiCreationOverlay
        isVisible={overlayVisible}
        variant="import"
        logs={
          isAnalyzing
            ? [
                { timestamp: new Date().toISOString(), message: `Analyse du fichier ${file?.name || "Excel"}...`, step: "analyste", type: "log" },
              ]
            : [
                { timestamp: new Date().toISOString(), message: "Construction du graphe causal", step: "executeur", type: "log" },
              ]
        }
        status="executing"
        currentStep={overlayStep}
        onCancel={handleCancelImport}
      />

      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
        <div className="max-w-3xl w-full">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 ring-1 ring-emerald-500/20 shadow-[0_0_15px_-3px_rgba(16,185,129,0.15)]">
              <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold text-zinc-950 mb-2">Importer un modèle Excel</h2>
            <p className="text-sm text-zinc-500 max-w-md mx-auto leading-relaxed">
              Déposez un fichier. Smart Graph vérifie d&apos;abord s&apos;il est importable.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <Card className="border-border/70 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base text-foreground">Qualification du classeur</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {!showAnalysis && (
                  <>
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
                      onClick={openFilePicker}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openFilePicker();
                        }
                      }}
                      className={cn(
                        "relative group cursor-pointer block rounded-2xl border-2 border-dashed transition-all duration-300 p-6 sm:p-10 text-center overflow-hidden",
                        isDragActive
                          ? "border-emerald-500 bg-emerald-50 scale-[1.01] shadow-lg shadow-emerald-500/10"
                          : "border-border bg-muted/40 hover:border-emerald-300 hover:bg-emerald-50/50"
                      )}
                    >
                      <div className="flex flex-col items-center gap-4 relative z-10">
                        <div
                          className={cn(
                            "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 border",
                            isDragActive
                              ? "bg-emerald-100 border-emerald-200 scale-110"
                              : "bg-background border-border group-hover:border-emerald-200 group-hover:scale-105"
                          )}
                        >
                          <Upload
                            className={cn(
                              "w-7 h-7 transition-colors duration-300",
                              isDragActive ? "text-emerald-600" : "text-muted-foreground group-hover:text-foreground"
                            )}
                          />
                        </div>

                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">
                            {isDragActive ? "Déposez le fichier ici" : "Cliquez ou glissez un fichier ici"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Supporte .xlsx et .xls. Smart Graph analyse d&apos;abord le modèle avant import.
                          </p>
                        </div>
                      </div>

                      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#18181b_1px,transparent_1px)] [background-size:16px_16px]" />
                    </div>

                    {file && (
                      <div className="rounded-2xl border border-border bg-background px-4 py-3">
                        <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Fichier sélectionné
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FeatureItem icon={Check} label="Analyse avant import" />
                      <FeatureItem icon={Check} label="Refus propre si le fichier est inadapté" />
                    </div>
                  </>
                )}

                {showError && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <div className="space-y-1">
                        <p className="font-medium">L&apos;analyse a échoué</p>
                        <p>{state.error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {showAnalysis && analysis && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{file?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {analysis.next_step_hint ?? analysis.suitability_message}
                        </p>
                      </div>
                      <SuitabilityBadge level={analysis.suitability_level} />
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <StatCard label="Feuilles" value={analysis.sheet_count} />
                      <StatCard label="Formules" value={analysis.formula_count} />
                      <StatCard label="Noeuds estimés" value={analysis.estimated_nodes} />
                    </div>

                    <div className="rounded-2xl border border-border bg-background px-4 py-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Sparkles className="w-4 h-4 text-violet-500" />
                        Verdict
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {getRecommendationCopy(analysis)}
                      </p>
                      {analysis.refusal_reason && (
                        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                          {analysis.refusal_reason}
                        </div>
                      )}
                      {analysis.warning && (
                        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                          {analysis.warning}
                        </div>
                      )}
                    </div>

                    {analysis.insights.length > 0 && (
                      <div className="rounded-2xl border border-border bg-background px-4 py-4">
                        <p className="text-sm font-medium text-foreground mb-2">Analyse structurelle</p>
                        <ul className="space-y-1.5">
                          {analysis.insights.slice(0, 5).map((insight, i) => (
                            <li key={i} className="text-xs text-muted-foreground leading-snug">
                              {insight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {analysis.detected_kpis.length > 0 && (
                      <div className="rounded-2xl border border-border bg-background px-4 py-4">
                        <p className="text-sm font-medium text-foreground">KPIs détectés</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {analysis.detected_kpis.slice(0, 4).map((kpi) => (
                            <Badge key={kpi} variant="secondary" className="bg-zinc-100 text-zinc-700">
                              {kpi}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/70 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base text-foreground">Decision d&apos;import</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-border bg-muted/30 px-4 py-4">
                  <p className="text-sm font-medium text-foreground">
                    {showAnalysis && analysis
                      ? analysis.can_import
                        ? "Le fichier peut être importé"
                        : "Fichier non recommandé"
                      : "Choisissez un fichier"}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {showAnalysis && analysis
                      ? analysis.can_import
                        ? (analysis.next_step_hint ?? "Vous pouvez lancer l'import.")
                        : (analysis.next_step_hint ?? "Essayez un autre fichier ou un classeur avec formules.")
                      : "Analyse automatique avant import."}
                  </p>
                </div>

                <div className="space-y-3">
                  <Button
                    className="w-full"
                    onClick={handleImport}
                    disabled={!showAnalysis || !analysis?.can_import || isImporting}
                  >
                    {primaryCtaLabel}
                    <ArrowRight className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleReset}
                    disabled={isAnalyzing || isImporting}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Choisir un autre fichier
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 flex justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCancel();
              }}
              className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors py-2 px-4 hover:bg-zinc-100 rounded-lg"
            >
              Retour a l&apos;assistant
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function FeatureItem({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-background border border-border transition-colors">
      <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20">
        <Icon className="w-3 h-3 text-emerald-600" />
      </div>
      <span className="text-[12px] text-muted-foreground font-medium leading-tight">{label}</span>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-background px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function SuitabilityBadge({ level }: { level: "excellent" | "good" | "limited" | "not_suitable" }) {
  const config = {
    excellent: {
      label: "Excellent",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    },
    good: {
      label: "Bon",
      className: "border-blue-200 bg-blue-50 text-blue-700",
    },
    limited: {
      label: "Limité",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    },
    not_suitable: {
      label: "A refuser",
      className: "border-red-200 bg-red-50 text-red-700",
    },
  }[level];

  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}

function getRecommendationCopy(analysis: NonNullable<ReturnType<typeof useExcelImport>["analysis"]>) {
  if (analysis.import_recommendation === "direct_import") {
    return "Import recommandé.";
  }
  if (analysis.import_recommendation === "import_with_simplification") {
    return "Import possible avec simplification.";
  }
  return "Le fichier n'est pas adapté à un import fiable.";
}
