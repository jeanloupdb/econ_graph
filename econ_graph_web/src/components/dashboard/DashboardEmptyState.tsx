"use client";

import { processExcelFile } from "@/lib/excel";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Box,
  FileCode,
  FileSpreadsheet,
  FileText,
  GitBranch,
  Loader2,
  MousePointer,
  Paperclip,
  PlusCircle,
  Sliders,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FloatingNodes } from "./FloatingNodes";

// Templates for quick project creation
export const TEMPLATES = [
  {
    id: "saas-mrr",
    name: "SaaS MRR",
    description: "Revenus récurrents, churn, LTV/CAC",
    icon: TrendingUp,
    prompt:
      "Crée un modèle SaaS avec MRR, calcul du churn rate, expansion revenue, CAC et LTV. Inclus les métriques clés comme le ratio LTV/CAC.",
    color: "violet",
  },
  {
    id: "ecommerce",
    name: "E-commerce",
    description: "Marge, logistique, acquisition",
    icon: Box,
    prompt:
      "Modélise un business e-commerce avec calcul du panier moyen, taux de conversion, coût d'acquisition, marge brute et coûts logistiques.",
    color: "blue",
  },
  {
    id: "marketing-roi",
    name: "ROI Marketing",
    description: "ROAS, CPC, conversion",
    icon: Zap,
    prompt:
      "Crée un modèle de ROI marketing avec budget campagne, CPC, taux de conversion, revenu par client et calcul du ROAS.",
    color: "emerald",
  },
];

// How it works steps
const STEPS = [
  {
    icon: MousePointer,
    title: "Décrivez",
    description: "Expliquez votre modèle en langage naturel",
  },
  {
    icon: GitBranch,
    title: "Visualisez",
    description: "L'IA génère un graphe de nœuds connectés",
  },
  {
    icon: Sliders,
    title: "Simulez",
    description: "Ajustez les paramètres, voyez l'impact",
  },
];

interface DashboardEmptyStateProps {
  onAiGenerate: (prompt: string, file?: File) => void;
  onCreateBlank: () => void;
}

export function DashboardEmptyState({
  onAiGenerate,
  onCreateBlank,
}: DashboardEmptyStateProps) {
  const [prompt, setPrompt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const promptInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the AI input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      promptInputRef.current?.focus();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = () => {
    if (!prompt.trim()) return;
    onAiGenerate(prompt, file || undefined);
    setPrompt("");
    setFile(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const fileType = selectedFile.name.split(".").pop()?.toLowerCase();

      const allowedTypes = ["pdf", "txt", "md", "csv", "xlsx", "xls"];
      if (!fileType || !allowedTypes.includes(fileType)) {
        toast.error(
          "Type de fichier non supporté. Utilisez PDF, Excel, TXT, MD ou CSV."
        );
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      if (["xlsx", "xls"].includes(fileType)) {
        try {
          setIsProcessing(true);
          const processedFile = await processExcelFile(selectedFile);
          setFile(processedFile);
          toast.success("Fichier Excel traité avec succès");
        } catch (error) {
          console.error(error);
          toast.error("Erreur lors du traitement du fichier Excel");
          if (fileInputRef.current) fileInputRef.current.value = "";
        } finally {
          setIsProcessing(false);
        }
      } else {
        setFile(selectedFile);
      }
    }
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleTemplateClick = (template: (typeof TEMPLATES)[0]) => {
    onAiGenerate(template.prompt);
  };

  const getFileIcon = () => {
    if (!file) return null;
    const name = file.name.toLowerCase();
    if (
      name.endsWith(".xlsx") ||
      name.endsWith(".xls") ||
      name.endsWith(".csv")
    ) {
      return <FileSpreadsheet className="h-4 w-4" />;
    }
    if (name.endsWith(".pdf")) {
      return <FileText className="h-4 w-4" />;
    }
    return <FileCode className="h-4 w-4" />;
  };

  const getFileChipClass = () => {
    if (!file) return "";
    const name = file.name.toLowerCase();
    if (
      name.endsWith(".xlsx") ||
      name.endsWith(".xls") ||
      name.endsWith(".csv")
    ) {
      return "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
    }
    if (name.endsWith(".pdf")) {
      return "bg-red-500/10 border-red-500/20 text-red-400";
    }
    return "bg-blue-500/10 border-blue-500/20 text-blue-400";
  };

  return (
    <div className="relative">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".pdf,.txt,.md,.csv,.xlsx,.xls"
      />

      {/* Floating nodes background */}
      <FloatingNodes />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-[75vh]"
      >
        {/* Left column - Main action */}
        <div className="lg:col-span-2 flex flex-col justify-center">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl font-semibold text-white mb-3 tracking-[-0.02em]"
          >
            Créez votre premier modèle
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-zinc-500 text-lg mb-8 max-w-lg"
          >
            Décrivez votre business en une phrase, l&apos;IA génère un modèle
            économique complet avec des nœuds connectés.
          </motion.p>

          {/* AI Input */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-6"
          >
            {/* File chip above input */}
            {file && !isProcessing && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-3"
              >
                <div
                  className={cn(
                    "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border",
                    getFileChipClass()
                  )}
                >
                  {getFileIcon()}
                  <span className="text-xs font-medium max-w-[200px] truncate">
                    {file.name}
                  </span>
                  <button
                    onClick={removeFile}
                    className="p-0.5 hover:bg-white/10 rounded transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Processing state */}
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-3"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800/50 text-zinc-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs font-medium">
                    Traitement du fichier...
                  </span>
                </div>
              </motion.div>
            )}

            <div className="relative max-w-xl group">
              {/* Gradient border on focus */}
              <div
                className={cn(
                  "absolute -inset-[1px] rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 opacity-0 transition-opacity duration-300",
                  isFocused && "opacity-40"
                )}
              />

              <div
                className={cn(
                  "relative flex items-center gap-2 bg-zinc-900 border rounded-xl transition-all",
                  isFocused
                    ? "border-transparent shadow-lg shadow-violet-500/10"
                    : "border-zinc-800 hover:border-zinc-700"
                )}
              >
                {/* Attach button */}
                <button
                  onClick={() =>
                    !isProcessing && fileInputRef.current?.click()
                  }
                  disabled={isProcessing}
                  className={cn(
                    "shrink-0 p-3 transition-colors rounded-l-xl hover:bg-zinc-800",
                    file
                      ? "text-violet-400"
                      : "text-zinc-500 hover:text-zinc-300",
                    isProcessing && "opacity-50 cursor-wait"
                  )}
                  title="Joindre un fichier (PDF, Excel, CSV, TXT)"
                >
                  {isProcessing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Paperclip className="h-5 w-5" />
                  )}
                </button>

                <input
                  ref={promptInputRef}
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder="Ex: Calcule mon ROI marketing avec budget, CPC et conversions..."
                  className="flex-1 h-14 bg-transparent text-white placeholder:text-zinc-500 outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && prompt.trim()) {
                      handleSubmit();
                    }
                  }}
                />

                <button
                  onClick={handleSubmit}
                  disabled={!prompt.trim() || isProcessing}
                  className={cn(
                    "shrink-0 m-2 p-2.5 rounded-lg transition-all",
                    prompt.trim()
                      ? "bg-violet-600 hover:bg-violet-500 text-white"
                      : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                  )}
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            <p className="mt-2 text-xs text-zinc-600">
              Joignez un fichier Excel ou PDF pour enrichir votre modèle
            </p>
          </motion.div>

          {/* Templates */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <p className="text-xs text-zinc-600 mb-3">
              Ou essayez un exemple :
            </p>
            <div className="flex flex-wrap gap-2">
              {TEMPLATES.map((template) => {
                const Icon = template.icon;
                return (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateClick(template)}
                    className="flex items-center gap-2 px-3 py-2 bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-lg text-sm text-zinc-400 hover:text-white transition-all"
                  >
                    <Icon className="w-4 h-4" />
                    {template.name}
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Manual link */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            onClick={onCreateBlank}
            className="mt-6 text-sm text-zinc-600 hover:text-zinc-400 transition-colors flex items-center gap-1.5 w-fit"
          >
            <PlusCircle className="w-4 h-4" />
            Créer un projet vierge
          </motion.button>
        </div>

        {/* Right column - How it works */}
        <div className="flex flex-col gap-6 justify-center">
          {/* How it works */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="p-5 rounded-xl border border-zinc-800/50 bg-zinc-900/30"
          >
            <h3 className="text-sm font-medium text-zinc-400 mb-4">
              Comment ça marche
            </h3>
            <div className="space-y-4">
              {STEPS.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="p-1.5 rounded-md bg-zinc-800/50 text-zinc-500">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-300">
                        {step.title}
                      </p>
                      <p className="text-xs text-zinc-600">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

