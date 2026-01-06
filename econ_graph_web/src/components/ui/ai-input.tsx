'use client';

import { processExcelFile } from '@/lib/excel';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, Loader2, Minimize2, Paperclip, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

const BORDER_LIGHT_DURATION = 2000;

interface AiInputProps {
  value: string;
  onChange: (value: string) => void;
  onGenerate: (file?: File) => void;
  isGenerating?: boolean;
  placeholder?: string;
  className?: string;
  allowFileUpload?: boolean;
  selectedFile?: File | null;
  onFileSelect?: (file: File | null) => void;
  renderFileExternal?: boolean;
  onProcessingChange?: (isProcessing: boolean) => void;
  borderLightEffect?: boolean;
}

export function AiInput({
  value,
  onChange,
  onGenerate,
  isGenerating = false,
  placeholder = "Describe what you want to create...",
  className,
  allowFileUpload = false,
  selectedFile,
  onFileSelect,
  renderFileExternal = false,
  borderLightEffect = false,
}: AiInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [internalFile, setInternalFile] = useState<File | null>(null);

  const file = selectedFile !== undefined ? selectedFile : internalFile;
  const setFile = (f: File | null) => {
    if (onFileSelect) {
      onFileSelect(f);
    } else {
      setInternalFile(f);
    }
  };
  const [isFocused, setIsFocused] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isBorderLightActive, setIsBorderLightActive] = useState(false);
  const borderLightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundedClass = className?.split(/\s+/).find((cls) => cls.startsWith('rounded')) || 'rounded-xl';

  const startBorderLightAnimation = useCallback(() => {
    if (!borderLightEffect) return;

    setIsBorderLightActive(true);
    if (borderLightTimeoutRef.current) {
      clearTimeout(borderLightTimeoutRef.current);
    }

    borderLightTimeoutRef.current = setTimeout(() => {
      setIsBorderLightActive(false);
      borderLightTimeoutRef.current = null;
    }, BORDER_LIGHT_DURATION);
  }, [borderLightEffect, BORDER_LIGHT_DURATION]);

  useEffect(() => {
    if (!borderLightEffect || !isFocused) return;
    startBorderLightAnimation();
  }, [borderLightEffect, isFocused, startBorderLightAnimation]);

  useEffect(() => () => {
    if (borderLightTimeoutRef.current) {
      clearTimeout(borderLightTimeoutRef.current);
    }
  }, []);

  // Handle Enter to submit
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      // In zen mode, Shift+Enter allows new lines
      // In normal mode, no new lines allowed
      if (isZenMode && e.shiftKey) {
        // Allow new line in zen mode
        return;
      }
      e.preventDefault();
      if (value.trim() && !isGenerating && !isProcessingFile) {
        // Pass the file to onGenerate and keep it in state
        onGenerate(allowFileUpload ? (file || undefined) : undefined);
        // Exit Zen mode on submit
        setIsZenMode(false);
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const fileType = selectedFile.name.split('.').pop()?.toLowerCase();
      
      // Validate file type
      const allowedTypes = ['pdf', 'txt', 'md', 'csv', 'xlsx', 'xls'];
      if (!fileType || !allowedTypes.includes(fileType)) {
        toast.error("Type de fichier non supporté. Utilisez PDF, Excel, TXT, MD ou CSV.");
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      // Handle Excel files specially
      if (['xlsx', 'xls'].includes(fileType)) {
        try {
          setIsProcessingFile(true);
          const processedFile = await processExcelFile(selectedFile);
          setFile(processedFile);
          toast.success("Fichier Excel traité avec succès");
        } catch (error) {
          console.error(error);
          toast.error("Erreur lors du traitement du fichier Excel");
          if (fileInputRef.current) fileInputRef.current.value = '';
        } finally {
          setIsProcessingFile(false);
        }
      } else {
        // Standard files
        setFile(selectedFile);
      }
    }
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleZenMode = () => setIsZenMode(!isZenMode);

  // Render the input content (shared between modes)
  const renderInputContent = (isZen: boolean) => (
    <>
      {isZen ? (
        // Zen mode: vertical layout
        <>
          {allowFileUpload && file && !renderFileExternal && (
            <div className="flex items-center gap-2 mb-2">
              <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                <span className="text-xs text-zinc-600 dark:text-zinc-300 truncate max-w-[200px]">
                  {file.name}
                </span>
                <button
                  onClick={removeFile}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={isGenerating}
            className={cn(
              "flex-1 w-full bg-transparent border-none focus:ring-0 text-base text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none resize-none scrollbar-hide leading-relaxed",
              isGenerating && "opacity-50 cursor-not-allowed"
            )}
            autoComplete="off"
            spellCheck={false}
          />
          <div className="flex items-center justify-between w-full gap-2 mt-2">
            {allowFileUpload && (
                <button
                onClick={() => !isProcessingFile && fileInputRef.current?.click()}
                disabled={isProcessingFile}
                className={cn(
                  "shrink-0 p-2 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800",
                  file ? "text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200",
                  isProcessingFile && "opacity-50 cursor-wait"
                )}
                title="Joindre un fichier"
              >
                {isProcessingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
              </button>
            )}
            <div className={cn("flex items-center gap-2", !allowFileUpload && "w-full justify-end")}>
              <button
                onClick={toggleZenMode}
                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                title="Quitter le mode zen"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  if (value.trim() && !isGenerating && !isProcessingFile) {
                    onGenerate(allowFileUpload ? (file || undefined) : undefined);
                    setIsZenMode(false);
                  }
                }}
                disabled={isGenerating || !value.trim() || isProcessingFile}
                className={cn(
                  "shrink-0 h-9 w-9 rounded-lg flex items-center justify-center transition-all duration-200",
                  value.trim()
                    ? "bg-black dark:bg-white text-white dark:text-black hover:opacity-80 active:scale-95"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-300 dark:text-zinc-600 cursor-not-allowed"
                )}
              >
                {isGenerating ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ArrowUp className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </>
      ) : (
        // Normal mode: horizontal layout
        <div className="flex items-center w-full gap-2">
          {allowFileUpload && (
            <button
              onClick={() => !isProcessingFile && fileInputRef.current?.click()}
              disabled={isProcessingFile}
              className={cn(
                "shrink-0 p-1.5 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800",
                file ? "text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200",
                isProcessingFile && "opacity-50 cursor-wait"
              )}
              title="Joindre un fichier"
            >
              {isProcessingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
            </button>
          )}

          <div className="flex items-center flex-1 min-w-0 gap-2">
            {allowFileUpload && file && !renderFileExternal && (
              <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                <span className="text-xs text-zinc-600 dark:text-zinc-300 truncate max-w-[150px]">
                  {file.name}
                </span>
                <button
                  onClick={removeFile}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              disabled={isGenerating}
              className={cn(
                "ai-input-field flex-1 w-full bg-transparent border-none focus:ring-0 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none resize-none scrollbar-hide leading-relaxed h-9 py-2 overflow-hidden",
                isGenerating && "opacity-50 cursor-not-allowed"
              )}
              autoComplete="off"
              spellCheck={false}
              rows={1}
            />
          </div>

          <div className="shrink-0 flex items-center gap-1">

            <button
              onClick={() => {
                if (value.trim() && !isGenerating && !isProcessingFile) {
                  onGenerate(allowFileUpload ? (file || undefined) : undefined);
                  setIsZenMode(false);
                }
              }}
              disabled={isGenerating || !value.trim() || isProcessingFile}
              className={cn(
                "shrink-0 h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-200",
                value.trim()
                  ? "bg-black dark:bg-white text-white dark:text-black hover:opacity-80 active:scale-95"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-300 dark:text-zinc-600 cursor-not-allowed"
              )}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );

  const baseInputClasses = cn(
    "relative flex items-center px-3 py-1.5 border transition-all duration-200 overflow-hidden w-full",
    roundedClass,
    isFocused
      ? "border-zinc-300 dark:border-zinc-700"
      : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700",
    !className?.includes('bg-') && "bg-white dark:bg-zinc-950",
    className,
    borderLightEffect && isBorderLightActive && "border-transparent"
  );

  const defaultModeInput = (
    <div className={baseInputClasses}>
      {renderInputContent(false)}
    </div>
  );

  return (
    <>
      {allowFileUpload && (
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".pdf,.txt,.md,.csv,.xlsx,.xls"
        />
      )}

      {/* Default Mode - ChatGPT Style */}
      <div className={cn("relative group w-full transition-all duration-300", isZenMode && "opacity-0 pointer-events-none")}>
        {borderLightEffect ? (
          <div className={cn(
            "ai-border-light-shell",
            roundedClass,
            isBorderLightActive && "ai-border-light-shell-active"
          )}>
            {defaultModeInput}
          </div>
        ) : (
          defaultModeInput
        )}
      </div>

      {/* Zen Mode Portal */}
      {isZenMode && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm p-4"
            onClick={() => setIsZenMode(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-3xl bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden relative flex flex-col h-[50vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/50">
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Zen Mode</span>
                <button
                  onClick={() => setIsZenMode(false)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <Minimize2 className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 relative flex flex-col p-4">
                {renderInputContent(true)}
              </div>

              <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900/30 text-[10px] text-zinc-400 border-t border-zinc-100 dark:border-zinc-900 flex justify-between">
                <span>Markdown supported</span>
                <span>Shift+Enter for new line, Enter to send</span>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
