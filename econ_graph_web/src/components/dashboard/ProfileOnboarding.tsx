/**
 * ProfileOnboarding - Questionnaire de profil intelligent (v2)
 *
 * 4 étapes avec couleurs distinctes :
 * 1. Contexte (Violet)    - Professions (multi-select, max 2)
 * 2. Domaines (Cyan)      - Centres d'intérêt (multi-select, max 3)
 * 3. Niveau (Emerald)     - Aisance avec les chiffres
 * 4. Outils (Amber)       - Outils actuels (multi-select)
 */

"use client";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SmartGraphLogo } from "@/components/ui/SmartGraphLogo";
import { saveSmartProfile } from "@/lib/api/smart-profile";
import { cn } from "@/lib/utils";
import {
  INTEREST_OPTIONS,
  InterestValue,
  LEVEL_OPTIONS,
  LevelValue,
  PROFESSION_OPTIONS,
  ProfessionValue,
  SmartProfileUpdate,
  STEP_COLORS,
  StepKey,
  TOOLS_OPTIONS,
  ToolsValue,
} from "@/types/smart-profile";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Brain,
  Briefcase,
  Building,
  Check,
  Circle,
  Clock,
  DollarSign,
  FileText,
  Flower,
  GraduationCap,
  Heart,
  Home,
  Leaf,
  LucideIcon,
  RefreshCw,
  Rocket,
  Smartphone,
  Sparkles,
  Sprout,
  Sunset,
  Table,
  TreeDeciduous,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useState } from "react";

// Map des icônes Lucide
const ICON_MAP: Record<string, LucideIcon> = {
  Building,
  Users,
  Briefcase,
  Rocket,
  Award,
  TrendingUp,
  Sunset,
  GraduationCap,
  RefreshCw,
  Wallet,
  DollarSign,
  Home,
  Clock,
  Heart,
  Leaf,
  Sparkles,
  Sprout,
  Flower,
  TreeDeciduous,
  Table,
  FileText,
  Smartphone,
  Brain,
  Circle,
};

type Step = "profession" | "interests" | "level" | "tools" | "complete";

const STEPS: Step[] = ["profession", "interests", "level", "tools"];

interface ProfileOnboardingProps {
  onComplete: () => void;
  onSkip?: () => void;
  /** Mode édition : affiche un titre différent et pas d'écran de bienvenue */
  editMode?: boolean;
  /** Valeurs initiales pour pré-remplir le formulaire */
  initialValues?: Partial<SmartProfileUpdate>;
}

export function ProfileOnboarding({
  onComplete,
  onSkip,
  editMode = false,
  initialValues,
}: ProfileOnboardingProps) {
  const [step, setStep] = useState<Step>("profession");
  const [profession, setProfession] = useState<ProfessionValue[]>(
    (initialValues?.profession as ProfessionValue[]) || []
  );
  const [interests, setInterests] = useState<InterestValue[]>(
    (initialValues?.interests as InterestValue[]) || []
  );
  const [level, setLevel] = useState<LevelValue | null>(
    (initialValues?.level as LevelValue) || null
  );
  const [tools, setTools] = useState<ToolsValue[]>(
    (initialValues?.tools as ToolsValue[]) || []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStepIndex = STEPS.indexOf(step as Step);
  const currentColors = step !== "complete" ? STEP_COLORS[step as StepKey] : STEP_COLORS.profession;

  // Navigation
  const goNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setStep(STEPS[nextIndex]);
    } else {
      handleSubmit();
    }
  };

  const goBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(STEPS[prevIndex]);
    }
  };

  // Handlers
  const handleProfessionToggle = (value: ProfessionValue) => {
    setProfession((prev) =>
      prev.includes(value)
        ? prev.filter((p) => p !== value)
        : prev.length < 2
          ? [...prev, value]
          : prev
    );
  };

  const handleInterestToggle = (value: InterestValue) => {
    setInterests((prev) =>
      prev.includes(value)
        ? prev.filter((i) => i !== value)
        : prev.length < 3
          ? [...prev, value]
          : prev
    );
  };

  const handleLevelSelect = (value: LevelValue) => {
    setLevel(value);
    setTimeout(() => goNext(), 250);
  };

  const handleToolToggle = (value: ToolsValue) => {
    if (value === "aucun") {
      setTools(["aucun"]);
    } else {
      setTools((prev) => {
        const withoutAucun = prev.filter((t) => t !== "aucun");
        return withoutAucun.includes(value)
          ? withoutAucun.filter((t) => t !== value)
          : [...withoutAucun, value];
      });
    }
  };

  const handleSubmit = async () => {
    if (profession.length === 0) return;

    setIsSubmitting(true);
    try {
      const profileData: SmartProfileUpdate = {
        profession,
        interests,
        level,
        tools,
      };

      await saveSmartProfile(profileData);
      setStep("complete");

      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (error) {
      console.error("Failed to save profile:", error);
      toast.error("Impossible de sauvegarder le profil. Vérifiez votre connexion et réessayez.");
      setIsSubmitting(false);
    }
  };

  // Validation par étape
  const canProceed = () => {
    switch (step) {
      case "profession":
        return profession.length > 0;
      case "interests":
        return interests.length > 0;
      case "level":
        return !!level;
      case "tools":
        return tools.length > 0;
      default:
        return false;
    }
  };

  // Questions par étape
  const getStepContent = () => {
    switch (step) {
      case "profession":
        return {
          title: "Quel est votre contexte ?",
          subtitle: "Sélectionnez 1 ou 2 profils qui vous correspondent",
          options: PROFESSION_OPTIONS,
          selected: profession,
          onSelect: handleProfessionToggle,
          multiSelect: true,
          maxSelect: 2,
        };
      case "interests":
        return {
          title: "Quels domaines vous intéressent ?",
          subtitle: "Sélectionnez jusqu'à 3 domaines",
          options: INTEREST_OPTIONS,
          selected: interests,
          onSelect: handleInterestToggle,
          multiSelect: true,
          maxSelect: 3,
        };
      case "level":
        return {
          title: "Votre aisance avec les chiffres ?",
          subtitle: "Pour adapter la complexité des modèles",
          options: LEVEL_OPTIONS,
          selected: level,
          onSelect: handleLevelSelect,
          multiSelect: false,
        };
      case "tools":
        return {
          title: "Vos outils actuels ?",
          subtitle: "Que utilisez-vous aujourd'hui pour vos calculs ?",
          options: TOOLS_OPTIONS,
          selected: tools,
          onSelect: handleToolToggle,
          multiSelect: true,
        };
      default:
        return null;
    }
  };

  const stepContent = getStepContent();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-zinc-950/98 backdrop-blur-xl flex items-center justify-center p-4"
    >
      {/* Skip button */}
      {onSkip && step !== "complete" && (
        <button
          onClick={onSkip}
          className="absolute top-6 right-6 text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-2 text-sm"
        >
          {editMode ? "Annuler" : "Passer"}
          <X className="w-4 h-4" />
        </button>
      )}

      <div className="w-full max-w-xl">
        <AnimatePresence mode="wait">
          {/* STEPS 1-4 */}
          {step !== "complete" && stepContent && (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-5 sm:space-y-8 px-2 sm:px-0"
            >
              {/* Header */}
              <div className="text-center space-y-4">
                {currentStepIndex === 0 && !editMode && (
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className={cn(
                      "inline-flex items-center justify-center w-16 h-16 rounded-2xl mx-auto",
                      "bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/20"
                    )}
                  >
                    <SmartGraphLogo size={36} className="text-violet-400" />
                  </motion.div>
                )}
                <div>
                  {currentStepIndex === 0 && !editMode && (
                    <h1 className="text-2xl font-semibold text-white mb-2">
                      Bienvenue sur SmartGraph !
                    </h1>
                  )}
                  {editMode && currentStepIndex === 0 && (
                    <h1 className="text-2xl font-semibold text-white mb-2">
                      Modifier votre profil
                    </h1>
                  )}
                  <p className="text-lg text-zinc-200 font-medium">
                    {stepContent.title}
                  </p>
                  <p className="text-zinc-500 text-sm mt-1">
                    {stepContent.subtitle}
                  </p>
                </div>
              </div>

              {/* Options grid */}
              <div
                className={cn(
                  "grid gap-3",
                  stepContent.options.length <= 5 ? "grid-cols-1 max-w-sm mx-auto" : "grid-cols-1 sm:grid-cols-2"
                )}
              >
                {stepContent.options.map((opt) => {
                  const Icon = ICON_MAP[opt.icon] || Circle;
                  const isSelected = stepContent.multiSelect
                    ? (stepContent.selected as string[]).includes(opt.value)
                    : stepContent.selected === opt.value;

                  return (
                    <motion.button
                      key={opt.value}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => stepContent.onSelect(opt.value as never)}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-xl text-left transition-all",
                        "border",
                        isSelected
                          ? cn(currentColors.bg, currentColors.border, "ring-2", currentColors.ring)
                          : "bg-zinc-900/60 border-zinc-800 hover:bg-zinc-800/80 hover:border-zinc-700"
                      )}
                    >
                      <div
                        className={cn(
                          "p-2.5 rounded-lg transition-colors",
                          isSelected
                            ? cn(currentColors.iconBg, currentColors.iconText)
                            : "bg-zinc-800 text-zinc-400"
                        )}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className={cn(
                            "font-medium transition-colors",
                            isSelected ? "text-white" : "text-zinc-200"
                          )}
                        >
                          {opt.label}
                        </div>
                        <div className="text-xs text-zinc-500 line-clamp-2">
                          {opt.description}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className={cn("w-5 h-5", currentColors.text)} />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Navigation - always show for multi-select, auto-advance for single */}
              {stepContent.multiSelect && (
                <div className="flex justify-between items-center">
                  <button
                    onClick={goBack}
                    disabled={currentStepIndex === 0}
                    className={cn(
                      "text-sm flex items-center gap-1 transition-colors",
                      currentStepIndex === 0
                        ? "text-zinc-700 cursor-not-allowed"
                        : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Retour
                  </button>

                  <Button
                    onClick={goNext}
                    disabled={!canProceed() || isSubmitting}
                    className={cn(
                      "transition-all",
                      canProceed()
                        ? cn("bg-gradient-to-r hover:opacity-90", currentColors.gradient)
                        : "bg-zinc-800 text-zinc-500"
                    )}
                  >
                    {isSubmitting ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2"
                        />
                        Enregistrement...
                      </>
                    ) : currentStepIndex === STEPS.length - 1 ? (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Terminer
                      </>
                    ) : (
                      <>
                        Continuer
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Progress dots */}
              <div className="flex justify-center gap-2">
                {STEPS.map((s, i) => (
                  <motion.div
                    key={s}
                    initial={false}
                    animate={{
                      scale: i === currentStepIndex ? 1.2 : 1,
                    }}
                    className={cn(
                      "w-2 h-2 rounded-full transition-colors",
                      i < currentStepIndex
                        ? STEP_COLORS[STEPS[i] as StepKey].dot
                        : i === currentStepIndex
                          ? currentColors.dot
                          : "bg-zinc-700"
                    )}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* COMPLETE */}
          {step === "complete" && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 flex items-center justify-center"
              >
                <Check className="w-10 h-10 text-green-400" />
              </motion.div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-2">
                  {editMode ? "Profil mis à jour !" : "Profil créé !"}
                </h2>
                <p className="text-zinc-400 text-sm">
                  Vos suggestions sont maintenant personnalisées.
                </p>
              </div>

              {/* Résumé coloré */}
              <div className="flex justify-center gap-2 flex-wrap">
                {profession.map((p) => (
                  <span key={p} className={cn("px-3 py-1 rounded-full text-xs", STEP_COLORS.profession.bg, STEP_COLORS.profession.text)}>
                    {PROFESSION_OPTIONS.find((opt) => opt.value === p)?.label}
                  </span>
                ))}
                {interests.map((i) => (
                  <span key={i} className={cn("px-3 py-1 rounded-full text-xs", STEP_COLORS.interests.bg, STEP_COLORS.interests.text)}>
                    {INTEREST_OPTIONS.find((opt) => opt.value === i)?.label}
                  </span>
                ))}
                {level && (
                  <span className={cn("px-3 py-1 rounded-full text-xs", STEP_COLORS.level.bg, STEP_COLORS.level.text)}>
                    {LEVEL_OPTIONS.find((l) => l.value === level)?.label}
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
