/**
 * PromptPreview - Document de prompt vivant
 *
 * Affiche le prompt qui sera envoyé à l'IA constructrice.
 * Se met à jour en temps réel grâce au draft_prompt de l'API.
 * Bouton pour créer le modèle à tout moment.
 */

"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WizardQuestion, WizardSummary } from "@/types/wizard";
import { motion } from "framer-motion";
import { FileText, Loader2, Rocket, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface PromptPreviewProps {
  currentQuestion: WizardQuestion | null;
  summary: WizardSummary | null;
  isLoading: boolean;
  onCreateProject: () => void;
}

export function PromptPreview({
  currentQuestion,
  summary,
  isLoading,
  onCreateProject,
}: PromptPreviewProps) {
  // Utiliser le draft_prompt de l'API, ou le final_prompt du summary
  const displayPrompt = summary?.final_prompt || currentQuestion?.draft_prompt || "";
  const hasContent = displayPrompt.length > 0;
  const canCreate = hasContent;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800/30">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="h-4 w-4 text-zinc-500" />
          <h2 className="text-sm font-medium text-white">
            Prompt de création
          </h2>
        </div>
        <p className="text-xs text-zinc-500">
          {hasContent 
            ? "Ce prompt sera envoyé pour créer votre modèle"
            : "Le prompt apparaîtra ici automatiquement"
          }
        </p>
      </div>

      {/* Contenu du prompt */}
      <div className="flex-1 overflow-y-auto p-4">
        {!hasContent ? (
          <EmptyState isLoading={isLoading} />
        ) : (
          <motion.div
            key={displayPrompt.slice(0, 50)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <PromptDocument content={displayPrompt} isLoading={isLoading} />
          </motion.div>
        )}
      </div>

      {/* Footer - Bouton Créer */}
      <div className="p-4 border-t border-zinc-800/30 bg-zinc-900/30">
        <Button
          onClick={onCreateProject}
          disabled={!canCreate || isLoading}
          className={cn(
            "w-full",
            canCreate && !isLoading
              ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-600 shadow-sm"
              : "bg-zinc-900 border border-zinc-800 text-zinc-600 cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Chargement...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Rocket className="w-4 h-4" />
              <span>Créer le modèle</span>
            </div>
          )}
        </Button>
        {!canCreate && !isLoading && (
          <p className="text-xs text-zinc-600 mt-2 text-center">
            Décrivez ce que vous voulez modéliser
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * État vide
 */
function EmptyState({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-4">
      <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
        {isLoading ? (
          <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
        ) : (
          <Sparkles className="w-5 h-5 text-zinc-600" />
        )}
      </div>
      <p className="text-sm text-zinc-500 mb-1">
        {isLoading ? "Génération en cours..." : "En attente"}
      </p>
      <p className="text-xs text-zinc-600">
        {isLoading 
          ? "Le prompt se construit..."
          : "Le prompt apparaîtra automatiquement"
        }
      </p>
    </div>
  );
}

/**
 * Affiche le document de prompt avec mise en forme Markdown
 */
function PromptDocument({ content, isLoading }: { content: string; isLoading: boolean }) {
  return (
    <div className={cn(
      "font-mono text-xs leading-relaxed transition-opacity",
      isLoading && "opacity-50"
    )}>
      <ReactMarkdown
        components={{
          h1: (props) => <h1 className="text-white font-medium text-sm pb-2 border-b border-zinc-800/50 mb-4 blocking-header" {...props} />,
          h2: (props) => <h2 className="text-zinc-500 font-semibold mt-4 mb-2 uppercase text-[10px] tracking-wider" {...props} />,
          h3: (props) => <h3 className="text-zinc-400 font-medium mt-3 mb-1 text-[11px]" {...props} />,
          ul: (props) => <ul className="my-2 space-y-1" {...props} />,
          ol: (props) => <ol className="list-decimal pl-4 my-2 space-y-1 text-zinc-300" {...props} />,
          li: ({children, ...props}) => (
             <li className="text-zinc-300 flex" {...props}>
                <span className="text-zinc-600 mr-2 min-w-[10px]">•</span>
                <span>{children}</span>
             </li>
          ),
          p: (props) => <div className="text-zinc-400 mb-2 last:mb-0 break-words whitespace-pre-wrap" {...props} />,
          strong: (props) => <span className="text-zinc-200 font-bold" {...props} />,
          code: (props) => <code className="bg-zinc-800/50 px-1 py-0.5 rounded text-zinc-300" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// Alias pour la compatibilité
export { PromptPreview as LiveBrief };
