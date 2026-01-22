/**
 * ConversationalChat - Chat IA moderne style ChatGPT
 *
 * Features:
 * - Message de bienvenue intégré au démarrage
 * - Input centré quand pas de messages
 * - Scrollbar discrète, meilleure expansion de l'input
 * - Markdown rendu correctement
 */

"use client";

import { Button } from "@/components/ui/button";
import { SmartGraphLogo } from "@/components/ui/SmartGraphLogo";
import { cn } from "@/lib/utils";
import { WizardOption, WizardState } from "@/types/wizard";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Brain,
  Briefcase,
  Calculator,
  Check,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Edit,
  FileText,
  GitCompare,
  Home,
  Layers,
  LucideIcon,
  Pencil,
  Rocket,
  RotateCcw,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  Zap
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Map des icônes Lucide
const ICON_MAP: Record<string, LucideIcon> = {
  Target, Calculator, Brain, Zap, GitCompare, 
  Briefcase, DollarSign, TrendingUp, BarChart3, Home, Layers,
  Sparkles, Edit, Check, Pencil,
};

interface ConversationalChatProps {
  state: WizardState;
  onSubmitAnswer: (userChoice?: string, userFreeform?: string) => void;
  onGoBack: () => void;
  onRefineFromSummary: () => void;
  onCreateProject: (customPrompt?: string) => void;
  onReset: () => void;
}

interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
  options?: WizardOption[];
  isCurrentQuestion?: boolean;
  isError?: boolean;
  closingRemark?: string;
  modelReady?: boolean;    // Nouveau : le modèle est prêt à générer
  draftPrompt?: string;    // Nouveau : le brief complet du modèle
}

export function ConversationalChat({
  state,
  onSubmitAnswer,
  onRefineFromSummary,
  onCreateProject,
  onReset,
}: ConversationalChatProps) {
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Construire les messages (exclure la question courante si loading)
  const messages: Message[] = buildMessages(state, state.isLoading);
  const isFirstMessage = messages.length === 0 || (messages.length === 1 && !state.conversationHistory.length);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, state.isLoading]);

  // Focus input
  useEffect(() => {
    if (!state.isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [state.isLoading, state.currentQuestion?.step]);

  // Reset input quand la question change
  useEffect(() => {
    setInputValue("");
  }, [state.currentQuestion?.step]);

  // Focus input
  const focusInput = () => {
    inputRef.current?.focus();
  };

  const handleSubmit = () => {
    const text = inputValue.trim();
    if (!text || state.isLoading) return;
    
    onSubmitAnswer(undefined, text);
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleQuickOption = (option: WizardOption) => {
    if (state.isLoading) return;
    
    // Si c'est "modify" ou "custom_input", juste focus l'input
    if (option.value === "modify" || option.value === "custom_input") {
      focusInput();
      return;
    }
    
    // Si c'est "accept", créer le projet directement (raccourci explicite)
    if (option.value === "accept") {
      onCreateProject();
      return;
    }
    
    // Sinon soumission directe
    onSubmitAnswer(option.value, option.label);
  };

  // ÉCRAN CHAT - Centré si premier message
  return (
    <div className="h-full flex flex-col bg-zinc-950">
      {/* Zone de messages */}
      <div 
        ref={scrollRef} 
        className={cn(
          "flex-1 overflow-y-auto",
          isFirstMessage && "flex items-center justify-center"
        )}
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#27272a transparent",
        }}
      >
        <div className={cn(
          "max-w-2xl mx-auto px-4",
          isFirstMessage ? "w-full" : "py-8 space-y-6"
        )}>
          {/* Message de bienvenue si premier message */}
          {isFirstMessage && !state.isLoading ? (
            <WelcomeMessage 
              state={state}
              onOptionClick={handleQuickOption}
            />
          ) : (
            <>
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onQuickOption={handleQuickOption}
                  isLoading={state.isLoading}
                  onCreateProject={onCreateProject}
                />
              ))}

              {/* Loading - 3 points animés */}
              {state.isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3 items-start"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="py-2">
                    <TypingDots />
                  </div>
                </motion.div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Zone Input simplifiée */}
      {state.currentQuestion && state.currentStep === "question" && (
        <div className="px-4 pb-4 pt-2 bg-gradient-to-t from-zinc-950 via-zinc-950 to-transparent">
          <div className="max-w-2xl mx-auto space-y-2">
            {/* Input principal */}
            <div className="relative flex items-end gap-2 bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-800/60 focus-within:border-violet-500/60 focus-within:ring-1 focus-within:ring-violet-500/20 transition-all shadow-xl shadow-black/30">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={state.currentQuestion.freeform_placeholder || "Décrivez ce que vous voulez modéliser..."}
                rows={1}
                disabled={state.isLoading}
                className={cn(
                  "flex-1 bg-transparent text-white placeholder:text-zinc-500",
                  "px-4 py-3.5 resize-none outline-none",
                  "text-[15px] leading-relaxed"
                )}
                style={{
                  minHeight: "52px",
                  maxHeight: "200px",
                  overflow: "hidden",
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  const newHeight = Math.min(target.scrollHeight, 200);
                  target.style.height = newHeight + "px";
                  target.style.overflowY = target.scrollHeight > 200 ? "auto" : "hidden";
                }}
              />
              <button
                onClick={handleSubmit}
                disabled={!inputValue.trim() || state.isLoading}
                className={cn(
                  "p-2.5 m-1.5 rounded-xl transition-all",
                  inputValue.trim() && !state.isLoading
                    ? "bg-violet-600 text-white hover:bg-violet-500 shadow-lg shadow-violet-500/25"
                    : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                )}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {/* Footer minimal */}
            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-zinc-600">
                Entrée pour envoyer
              </p>
              {state.conversationHistory.length > 0 && (
                <button
                  onClick={onReset}
                  disabled={state.isLoading}
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
                >
                  <RotateCcw className="w-3 h-3" />
                  Recommencer
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WelcomeMessage({ 
  state, 
  onOptionClick 
}: { 
  state: WizardState;
  onOptionClick: (option: WizardOption) => void;
}) {
  const options = state.currentQuestion?.options || [];
  const title = state.currentQuestion?.question || "Bonjour ! Que souhaitez-vous modéliser ?";
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-8"
    >
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 border border-blue-500/10 mb-6 shadow-2xl shadow-violet-500/5">
        <SmartGraphLogo size={40} className="drop-shadow-lg" />
      </div>
      
      <h1 className="text-2xl font-semibold text-white mb-3 px-4">
        {parseInlineMarkdown(title)}
      </h1>
      
      {!options.length && (
        <p className="text-zinc-500 max-w-md mx-auto text-sm leading-relaxed mb-8">
          Décrivez votre besoin ci-dessous. Je vous proposerai une structure adaptée.
        </p>
      )}

      {options.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 max-w-2xl mx-auto px-2">
          {options.map((option) => {
            const IconComponent = option.icon ? ICON_MAP[option.icon] : null;
            return (
              <motion.button
                key={option.value}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onOptionClick(option)}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-xl text-left transition-all",
                  "bg-zinc-900/50 border border-zinc-800/50 hover:bg-zinc-800/80 hover:border-zinc-700",
                  "group"
                )}
              >
                <div className="p-2 rounded-lg bg-zinc-800/50 text-zinc-400 group-hover:text-violet-400 group-hover:bg-violet-500/10 transition-colors">
                  {IconComponent ? <IconComponent className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                </div>
                <div>
                  <div className="font-medium text-zinc-200 group-hover:text-white transition-colors">
                    {option.label}
                  </div>
                  {option.description && (
                    <div className="text-sm text-zinc-500 mt-0.5 group-hover:text-zinc-400 transition-colors">
                      {option.description}
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

/**
 * 3 points animés pour le loading
 */
function TypingDots() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-2 h-2 bg-zinc-500 rounded-full"
          animate={{
            opacity: [0.3, 1, 0.3],
            scale: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Rendu simple du Markdown (bullet points, gras, italique)
 */
function MarkdownContent({ content }: { content: string }) {
  const lines = content.split('\n');
  
  return (
    <div className="text-zinc-200 text-[15px] leading-relaxed space-y-2">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />;
        
        const bulletMatch = line.match(/^[\s]*[•\-\*]\s*(.*)$/);
        if (bulletMatch) {
          return (
            <div key={i} className="flex items-start gap-2 ml-2">
              <span className="text-violet-400 mt-1.5">•</span>
              <span>{parseInlineMarkdown(bulletMatch[1])}</span>
            </div>
          );
        }
        
        return <p key={i}>{parseInlineMarkdown(line)}</p>;
      })}
    </div>
  );
}

/**
 * Parse le markdown inline (gras, italique)
 */
function parseInlineMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-white font-medium">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

/**
 * Affiche le contenu du brief/prompt formaté
 */
function BriefContent({ content }: { content: string }) {
  const lines = content.split('\n');
  
  return (
    <div className="space-y-1 font-mono text-xs leading-relaxed">
      {lines.map((line, i) => {
        // Ligne vide
        if (!line.trim()) return <div key={i} className="h-2" />;
        
        // Titre de section (PARAMÈTRES, CALCULS, etc.)
        if (line.match(/^[A-ZÉÈÀÙ\s]+(\s*:|\s*\()/) || line.match(/^[A-ZÉÈÀÙ]{3,}/)) {
          return (
            <div key={i} className="text-zinc-500 font-semibold pt-2 first:pt-0 uppercase text-[10px] tracking-wider">
              {line}
            </div>
          );
        }
        
        // Bullet point
        if (line.match(/^[\s]*[-•]\s/)) {
          return (
            <div key={i} className="text-zinc-300 pl-2 flex">
              <span className="text-zinc-600 mr-2">•</span>
              <span>{parseInlineMarkdown(line.replace(/^[\s]*[-•]\s*/, ''))}</span>
            </div>
          );
        }

        // Numérotation (1., 2., etc.)
        if (line.match(/^[\s]*\d+\.\s/)) {
          const match = line.match(/^([\s]*\d+\.\s*)(.*)/);
          return (
            <div key={i} className="text-zinc-300 pl-2">
              <span className="text-zinc-500">{match?.[1]}</span>
              {parseInlineMarkdown(match?.[2] || '')}
            </div>
          );
        }

        // Première ligne (titre principal)
        if (i === 0) {
          return (
            <div key={i} className="text-white font-medium text-sm pb-2 border-b border-zinc-800/50 mb-2">
              {parseInlineMarkdown(line)}
            </div>
          );
        }

        // Ligne normale
        return (
          <div key={i} className="text-zinc-400">
            {parseInlineMarkdown(line)}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Message de chat avec rendu Markdown
 */
function ChatMessage({
  message,
  onQuickOption,
  isLoading,
  onCreateProject,
}: {
  message: Message;
  onQuickOption: (option: WizardOption) => void;
  isLoading: boolean;
  onCreateProject: () => void;
}) {
  const [briefExpanded, setBriefExpanded] = useState(true);

  if (message.role === "user") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="max-w-[80%] bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-2xl rounded-br-md px-4 py-3 shadow-sm">
          <p className="text-[14px] leading-relaxed">{message.content}</p>
        </div>
      </motion.div>
    );
  }

  // Assistant ou Erreur
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 items-start"
    >
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
        message.isError 
          ? "bg-red-500/10 border border-red-500/20" 
          : "bg-zinc-800 border border-zinc-700 shadow-sm"
      )}>
        {message.isError ? (
          <AlertCircle className="w-4 h-4 text-red-400" />
        ) : (
          <SmartGraphLogo size={16} className="text-violet-400" />
        )}
      </div>

      <div className="flex-1 space-y-3">
        <div className={cn(
          "py-1",
          message.isError && "p-3 bg-red-500/5 border border-red-500/10 rounded-xl text-red-200"
        )}>
          <MarkdownContent content={message.content} />
        </div>

        {/* === BLOC MODÈLE PRÊT === */}
        {message.isCurrentQuestion && message.modelReady && message.draftPrompt && !isLoading && !message.isError && (
          <EditableBriefBlock 
            originalPrompt={message.draftPrompt} 
            onCreateProject={onCreateProject} 
          />
        )}

        {/* === OPTIONS D'AFFINAGE (quand modelReady) === */}
        {message.isCurrentQuestion && message.modelReady && message.options && message.options.length > 0 && !isLoading && !message.isError && (
          <div className="pt-2">
            <p className="text-xs text-zinc-500 mb-2">Ou affiner :</p>
            <div className="flex flex-col items-start gap-0.5 w-full">
              {message.options.map(option => (
                <button
                  key={option.value}
                  onClick={() => onQuickOption(option)}
                  className={cn(
                    "flex items-start justify-between w-full text-left group px-3 py-1.5 -mx-3 rounded-lg transition-colors",
                    "hover:bg-zinc-800/40"
                  )}
                >
                  <div className="flex-1 text-left text-[15px] leading-relaxed text-zinc-300 pr-3">
                    <span className="font-medium text-zinc-300 group-hover:text-white transition-colors">
                      • {option.label}
                    </span>
                    {option.description && (
                      <span className="text-zinc-400 group-hover:text-zinc-300 transition-colors ml-1.5">
                        : {option.description}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-zinc-600 group-hover:text-violet-400 group-hover:translate-x-1 transition-all duration-300">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* === OPTIONS NORMALES (quand pas modelReady) === */}
        {message.isCurrentQuestion && !message.modelReady && message.options && message.options.length > 0 && !isLoading && !message.isError && (
          <motion.div className="w-full mt-2">
            {(() => {
              const creationOption = message.options.find(o => o.value === 'accept');
              const standardOptions = message.options.filter(o => o.value !== 'accept');
              
              return (
                <div className="flex flex-col gap-4">
                  {/* Options Standard (Liste) */}
                  {standardOptions.length > 0 && (
                    <div className="flex flex-col items-start gap-0.5 w-full">
                      {standardOptions.map(option => (
                        <button
                          key={option.value}
                          onClick={() => onQuickOption(option)}
                          className={cn(
                            "flex items-start justify-between w-full text-left group px-3 py-1.5 -mx-3 rounded-lg transition-colors",
                            "hover:bg-zinc-800/40"
                          )}
                        >
                          <div className="flex-1 text-left text-[15px] leading-relaxed text-zinc-300 pr-3">
                            <span className="font-medium text-zinc-300 group-hover:text-white transition-colors">
                              • {option.label}
                            </span>
                            {option.description && (
                              <span className="text-zinc-400 group-hover:text-zinc-300 transition-colors ml-1.5">
                                : {option.description}
                              </span>
                            )}
                          </div>
                          
                          <div className="mt-1 text-zinc-600 group-hover:text-violet-400 group-hover:translate-x-1 transition-all duration-300">
                            <ArrowRight className="w-4 h-4" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Option Création (Mise en avant) - uniquement si pas modelReady */}
                  {creationOption && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.98, y: 5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className="mt-2 w-full"
                    >
                      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-4 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700">
                            <SmartGraphLogo size={16} className="text-violet-400" />
                          </div>
                          <div>
                            <h4 className="text-zinc-200 font-medium text-sm">Prêt à créer</h4>
                            <p className="text-zinc-500 text-xs mt-0.5 leading-relaxed">
                              Le contexte est suffisant pour générer une première version du modèle.
                            </p>
                          </div>
                        </div>
                        
                        <Button 
                          onClick={() => onQuickOption(creationOption)}
                          className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium shadow-sm border border-zinc-600 h-9 transition-colors"
                        >
                          <Sparkles className="w-4 h-4 mr-2 text-violet-400" />
                          Générer le modèle
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </div>
              );
            })()}
          </motion.div>
        )}

        {message.isCurrentQuestion && message.closingRemark && !isLoading && !message.isError && (
          <div className="text-[15px] text-zinc-300 mt-4 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-500 delay-300 fill-mode-backwards">
            {message.closingRemark}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Construit les messages depuis l'état
 */
function buildMessages(state: WizardState, excludeCurrentIfLoading: boolean): Message[] {
  const messages: Message[] = [];

  state.conversationHistory.forEach((turn, index) => {
    // Masquer la question d'accueil (step 1) dans le flux pour éviter la répétition visuelle
    // car elle a déjà été affichée via le WelcomeMessage
    if (turn.step !== 1) {
      messages.push({
        id: `assistant-${index}`,
        role: "assistant",
        content: turn.question,
        isCurrentQuestion: false,
      });
    }

    const userContent = turn.userFreeform || turn.userChoice || "";
    if (userContent) {
      messages.push({
        id: `user-${index}`,
        role: "user",
        content: userContent,
      });
    }
  });

  if (state.systemMessage) {
    const isError = state.systemMessage.type === 'error';
    const emoji = isError ? "❌ " : "ℹ️ ";
    
    messages.push({
      id: "system-message",
      role: "assistant",
      content: emoji + state.systemMessage.content,
      isError: isError,
    });
  }

  if (state.currentStep === "question" && state.currentQuestion && !excludeCurrentIfLoading) {
    messages.push({
      id: "assistant-current",
      role: "assistant",
      content: state.currentQuestion.question,
      options: state.currentQuestion.options,
      isCurrentQuestion: true,
      closingRemark: state.currentQuestion.closing_remark,
      modelReady: state.currentQuestion.is_model_ready,
      draftPrompt: state.currentQuestion.draft_prompt,
    });
  }

  return messages;
}

function EditableBriefBlock({ 
  originalPrompt, 
  onCreateProject 
}: { 
  originalPrompt: string; 
  onCreateProject: (customPrompt?: string) => void; 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [prompt, setPrompt] = useState(originalPrompt);
  const [isExpanded, setIsExpanded] = useState(true);

  // Auto-resize textarea
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [isEditing, prompt]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900/80 border border-zinc-700/50 rounded-xl overflow-hidden shadow-lg"
    >
      {/* Header */}
      <div className="w-full px-4 py-3 flex items-center justify-between bg-zinc-900/50 border-b border-zinc-800/50">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-medium text-zinc-200">Brief du modèle</span>
          <span className="text-xs text-zinc-500">
            ({prompt.length} caractères)
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="h-7 px-2 text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            {isEditing ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1.5" />
                Terminer
              </>
            ) : (
              <>
                <Edit className="w-3.5 h-3.5 mr-1.5" />
                Modifier
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-7 w-7 p-0 text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
             {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 bg-zinc-950/30">
              {isEditing ? (
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-sm font-mono text-zinc-300 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/50 outline-none resize-none min-h-[200px]"
                  spellCheck={false}
                />
              ) : (
                <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  <BriefContent content={prompt} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Actions */}
      <div className="px-4 py-3 bg-zinc-900 border-t border-zinc-800/50 flex gap-3">
        {prompt !== originalPrompt && (
          <Button
            variant="ghost"
            onClick={() => {
              setPrompt(originalPrompt);
              setIsEditing(false);
            }}
            className="flex-1 text-zinc-500 hover:text-zinc-300"
          >
            Rétablir l'original
          </Button>
        )}
        <Button
          onClick={() => onCreateProject(prompt !== originalPrompt ? prompt : undefined)}
          className="flex-1 bg-violet-600 hover:bg-violet-500 text-white font-medium shadow-lg shadow-violet-500/20 h-10"
        >
          <Rocket className="w-4 h-4 mr-2" />
          {prompt !== originalPrompt ? "Générer la version modifiée" : "Générer ce modèle"}
        </Button>
      </div>
    </motion.div>
  );
}
