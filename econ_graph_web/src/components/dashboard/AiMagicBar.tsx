"use client";

/**
 * Re-export InlineAiBar as AiMagicBar for backward compatibility
 * This component is used in other pages like composites
 */

import { processExcelFile } from "@/lib/excel";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/uiState";
import { motion } from "framer-motion";
import {
  ArrowRight,
  FileCode,
  FileSpreadsheet,
  FileText,
  Loader2,
  Paperclip,
  Sparkles,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

interface AiMagicBarProps {
  onGenerate: (prompt: string, file?: File) => void;
  isPending: boolean;
  placeholder?: string;
}

export function AiMagicBar({
  onGenerate,
  isPending,
  placeholder = "Décrivez ce que vous souhaitez créer...",
}: AiMagicBarProps) {
  const [prompt, setPrompt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const developerMode = useUIStore((s) => s.developerMode);

  const handleSubmit = () => {
    if (!prompt.trim() || isPending) return;
    onGenerate(prompt, file || undefined);
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

  const getFileIcon = () => {
    if (!file) return null;
    const name = file.name.toLowerCase();
    if (
      name.endsWith(".xlsx") ||
      name.endsWith(".xls") ||
      name.endsWith(".csv")
    ) {
      return <FileSpreadsheet className="h-3.5 w-3.5" />;
    }
    if (name.endsWith(".pdf")) {
      return <FileText className="h-3.5 w-3.5" />;
    }
    return <FileCode className="h-3.5 w-3.5" />;
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

  if (!developerMode) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full mb-6"
    >
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".pdf,.txt,.md,.csv,.xlsx,.xls"
      />

      <div className="relative">
        {/* File chip above input */}
        {file && !isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-2"
          >
            <div
              className={cn(
                "inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border",
                getFileChipClass()
              )}
            >
              {getFileIcon()}
              <span className="text-xs font-medium max-w-[180px] truncate">
                {file.name}
              </span>
              <button
                onClick={removeFile}
                className="p-0.5 hover:bg-white/10 rounded transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Processing state */}
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-2"
          >
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border border-zinc-700 bg-zinc-800/80 text-zinc-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="text-xs font-medium">Traitement...</span>
            </div>
          </motion.div>
        )}

        {/* Input container */}
        <div className="relative group">
          {/* Gradient border on focus */}
          <div
            className={cn(
              "absolute -inset-[1px] rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 opacity-0 transition-opacity duration-300",
              isFocused && "opacity-30"
            )}
          />

          <div
            className={cn(
              "relative flex items-center gap-2 bg-zinc-900/80 backdrop-blur-sm border rounded-xl transition-all",
              isFocused
                ? "border-transparent shadow-lg shadow-violet-500/5"
                : "border-zinc-800 hover:border-zinc-700"
            )}
          >
            {/* AI Icon */}
            <div className="shrink-0 pl-4 flex items-center gap-2">
              <Sparkles
                className={cn(
                  "w-4 h-4 transition-colors",
                  isFocused ? "text-violet-400" : "text-zinc-500"
                )}
              />
            </div>

            {/* Attach button */}
            <button
              onClick={() => !isProcessing && fileInputRef.current?.click()}
              disabled={isProcessing}
              className={cn(
                "shrink-0 p-2 transition-colors rounded-lg hover:bg-zinc-800",
                file ? "text-violet-400" : "text-zinc-500 hover:text-zinc-300",
                isProcessing && "opacity-50 cursor-wait"
              )}
              title="Joindre un fichier"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
            </button>

            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              className="flex-1 h-12 bg-transparent text-white text-sm placeholder:text-zinc-500 outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && prompt.trim()) {
                  handleSubmit();
                }
              }}
              disabled={isPending}
            />

            <button
              onClick={handleSubmit}
              disabled={!prompt.trim() || isProcessing || isPending}
              className={cn(
                "shrink-0 m-1.5 px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-sm font-medium",
                prompt.trim() && !isPending
                  ? "bg-violet-600 hover:bg-violet-500 text-white"
                  : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
              )}
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Générer</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

