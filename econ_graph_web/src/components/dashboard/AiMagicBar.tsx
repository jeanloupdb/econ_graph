"use client";

import { AiInput } from "@/components/ui/ai-input";
import { cn } from "@/lib/utils";
import { FileCode, FileSpreadsheet, FileText, X } from "lucide-react";
import { useEffect, useState } from "react";

const DEFAULT_QUICK_STARTERS = [
  {
    label: "Business Plan SaaS",
    prompt: "Crée un modèle SaaS B2B complet avec Acquisition (CAC), Rétention (Churn), Revenus (MRR) et marge brute.",
  },
  {
    label: "ROI Campagne Pub",
    prompt: "Calcule le ROI d'une campagne marketing avec Budget, CPC, Taux de conversion et Panier moyen.",
  },
  {
    label: "Rentabilité Locative",
    prompt: "Modèle d'investissement immobilier avec Prix d'achat, Loyer, Charges, Taxe foncière et Cash Flow net.",
  },
];

const DEFAULT_PLACEHOLDER = "Créez un projet complet en une phrase";

interface AiMagicBarProps {
  onGenerate: (prompt: string, file?: File) => void;
  isPending: boolean;
  quickStarters?: { label: string; prompt: string }[];
  placeholder?: string;
}

export function AiMagicBar({
  onGenerate,
  isPending,
  quickStarters = DEFAULT_QUICK_STARTERS,
  placeholder = DEFAULT_PLACEHOLDER
}: AiMagicBarProps) {
  const [prompt, setPrompt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isFileProcessing, setIsFileProcessing] = useState(false);

  const handleGenerate = (fileArg?: File) => {
    if (!prompt.trim()) return;
    // Use the state file if available (since AiInput might pass it back, or we use ours)
    // Actually AiInput calls onGenerate with the file it has. 
    // Since we control it, fileArg should be the same as file state.
    onGenerate(prompt, file || undefined);
    setPrompt("");
    setFile(null);
  };

  // Keyboard shortcut to focus (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        // Focus logic if needed
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] pointer-events-none">
      <div className="w-full max-w-4xl mx-auto px-4 pb-2 pointer-events-auto">
        <div
          className="relative flex flex-col gap-3"
          onFocus={() => setIsFocused(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) {
              setIsFocused(false);
            }
          }}
        >
          {/* Quick Starters - Au-dessus de l'input */}
          <div className={cn(
            "flex justify-center flex-wrap gap-2 transition-all duration-300 mb-2",
            (isFocused || prompt) && !file && !isFileProcessing ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
          )}>
            {quickStarters.map((starter) => (
              <button
                key={starter.label}
                onClick={() => setPrompt(starter.prompt)}
                className="text-xs px-3 py-1.5 rounded-lg bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-sm"
              >
                {starter.label}
              </button>
            ))}
          </div>

          {/* Processing State */}
          {isFileProcessing && (
            <div className="flex justify-start mb-2 animate-in slide-in-from-bottom-2 fade-in duration-300 px-1">
              <div className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-lg border shadow-sm backdrop-blur-sm bg-zinc-50/90 dark:bg-zinc-900/90 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
                <div className="h-3 w-3 rounded-full border-2 border-zinc-400 border-t-transparent animate-spin" />
                <span className="text-xs font-medium">Traitement du fichier...</span>
              </div>
            </div>
          )}

          {/* File Chip - Au-dessus de l'input (remplace Quick Starters si fichier) */}
          {file && !isFileProcessing && (
            <div className="flex justify-start mb-2 animate-in slide-in-from-bottom-2 fade-in duration-300 px-1">
               <div className={cn(
                  "flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg border shadow-sm backdrop-blur-sm",
                  (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls') || file.name.toLowerCase().endsWith('.csv'))
                    ? "!bg-emerald-50/90 !dark:bg-emerald-950/90 !border-emerald-200 !dark:border-emerald-800 !text-emerald-700 !dark:text-emerald-300"
                    : file.name.toLowerCase().endsWith('.pdf')
                    ? "!bg-red-50/90 !dark:bg-red-950/90 !border-red-200 !dark:border-red-800 !text-red-700 !dark:text-red-300"
                    : "bg-blue-50/90 dark:bg-blue-950/90 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                )}>
                  {(file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls') || file.name.toLowerCase().endsWith('.csv')) ? (
                    <FileSpreadsheet className="h-4 w-4" />
                  ) : file.name.toLowerCase().endsWith('.pdf') ? (
                    <FileText className="h-4 w-4" />
                  ) : (
                    <FileCode className="h-4 w-4" />
                  )}
                  <span className="text-xs font-medium max-w-[200px] truncate">{file.name}</span>
                  <button 
                    onClick={() => setFile(null)}
                    className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-md transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
               </div>
            </div>
          )}

          {/* Input */}
          <div className="relative w-full">
            <AiInput
              value={prompt}
              onChange={setPrompt}
              onGenerate={() => handleGenerate(file || undefined)}
              isGenerating={isPending}
              placeholder={placeholder}
              className="shadow-2xl border-zinc-200/50 dark:border-zinc-700/50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl"
              allowFileUpload={true}
              selectedFile={file}
              onFileSelect={setFile}
              renderFileExternal={true}
              onProcessingChange={setIsFileProcessing}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
