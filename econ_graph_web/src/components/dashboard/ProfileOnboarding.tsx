/**
 * ProfileOnboarding - Questionnaire de profil intelligent
 * 
 * Composant overlay qui s'affiche pour les nouveaux utilisateurs
 * afin de personnaliser leurs suggestions IA.
 * 
 * Design : Minimaliste, moderne, non-intrusif
 * 3 étapes courtes : Profession → Intérêts → Exemple concret (optionnel)
 */

"use client";

import { Button } from "@/components/ui/button";
import { SmartGraphLogo } from "@/components/ui/SmartGraphLogo";
import { saveSmartProfile } from "@/lib/api/smart-profile";
import { cn } from "@/lib/utils";
import {
    INTEREST_OPTIONS,
    InterestValue,
    PROFESSION_OPTIONS,
    ProfessionValue,
    SmartProfileUpdate,
} from "@/types/smart-profile";
import { AnimatePresence, motion } from "framer-motion";
import {
    ArrowRight,
    Briefcase,
    Building,
    Check,
    Clock,
    DollarSign,
    GraduationCap,
    Heart,
    Home,
    LucideIcon,
    Rocket,
    Sparkles,
    TrendingUp,
    User,
    Wallet,
    X,
} from "lucide-react";
import { useState } from "react";

// Map des icônes Lucide
const ICON_MAP: Record<string, LucideIcon> = {
  Briefcase,
  Building,
  Rocket,
  TrendingUp,
  GraduationCap,
  User,
  Wallet,
  DollarSign,
  Clock,
  Home,
  Heart,
};

type Step = "profession" | "interests" | "example" | "complete";

interface ProfileOnboardingProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export function ProfileOnboarding({ onComplete, onSkip }: ProfileOnboardingProps) {
  const [step, setStep] = useState<Step>("profession");
  const [profession, setProfession] = useState<ProfessionValue | null>(null);
  const [interests, setInterests] = useState<InterestValue[]>([]);
  const [example, setExample] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleProfessionSelect = (value: ProfessionValue) => {
    setProfession(value);
    // Auto-advance après un petit délai pour feedback visuel
    setTimeout(() => setStep("interests"), 300);
  };

  const handleInterestToggle = (value: InterestValue) => {
    setInterests((prev) =>
      prev.includes(value)
        ? prev.filter((i) => i !== value)
        : [...prev, value]
    );
  };

  const handleInterestsNext = () => {
    if (interests.length > 0) {
      setStep("example");
    }
  };

  const handleSubmit = async () => {
    if (!profession) return;

    setIsSubmitting(true);
    try {
      const profileData: SmartProfileUpdate = {
        profession,
        interests,
        concrete_example: example.trim() || null,
      };

      await saveSmartProfile(profileData);
      setStep("complete");

      // Attendre l'animation de succès
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (error) {
      console.error("Failed to save profile:", error);
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    onSkip?.();
  };

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
          onClick={handleSkip}
          className="absolute top-6 right-6 text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-2 text-sm"
        >
          Passer
          <X className="w-4 h-4" />
        </button>
      )}

      <div className="w-full max-w-xl">
        <AnimatePresence mode="wait">
          {/* STEP 1: PROFESSION */}
          {step === "profession" && (
            <motion.div
              key="profession"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Header */}
              <div className="text-center space-y-4">
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/20 mx-auto"
                >
                  <SmartGraphLogo size={36} className="text-violet-400" />
                </motion.div>
                <div>
                  <h1 className="text-2xl font-semibold text-white mb-2">
                    Bienvenue sur Smart Graph !
                  </h1>
                  <p className="text-zinc-400 text-sm max-w-md mx-auto">
                    Répondez à 2-3 questions rapides pour personnaliser vos suggestions.
                  </p>
                </div>
              </div>

              {/* Question */}
              <div className="space-y-4">
                <p className="text-lg text-zinc-200 text-center font-medium">
                  Quel est votre contexte principal ?
                </p>

                <div className="grid grid-cols-2 gap-3">
                  {PROFESSION_OPTIONS.map((opt) => {
                    const Icon = ICON_MAP[opt.icon] || User;
                    const isSelected = profession === opt.value;

                    return (
                      <motion.button
                        key={opt.value}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleProfessionSelect(opt.value)}
                        className={cn(
                          "flex items-center gap-3 p-4 rounded-xl text-left transition-all",
                          "border",
                          isSelected
                            ? "bg-violet-500/20 border-violet-500/50 ring-2 ring-violet-500/30"
                            : "bg-zinc-900/60 border-zinc-800 hover:bg-zinc-800/80 hover:border-zinc-700"
                        )}
                      >
                        <div
                          className={cn(
                            "p-2.5 rounded-lg transition-colors",
                            isSelected
                              ? "bg-violet-500/30 text-violet-300"
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
                          <div className="text-xs text-zinc-500 truncate">
                            {opt.description}
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="w-5 h-5 text-violet-400" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Progress dots */}
              <div className="flex justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-violet-500" />
                <div className="w-2 h-2 rounded-full bg-zinc-700" />
                <div className="w-2 h-2 rounded-full bg-zinc-700" />
              </div>
            </motion.div>
          )}

          {/* STEP 2: INTERESTS */}
          {step === "interests" && (
            <motion.div
              key="interests"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Header */}
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold text-white">
                  Quels domaines vous intéressent ?
                </h2>
                <p className="text-zinc-400 text-sm">
                  Sélectionnez un ou plusieurs pour des suggestions adaptées.
                </p>
              </div>

              {/* Options multi-select */}
              <div className="grid grid-cols-2 gap-3">
                {INTEREST_OPTIONS.map((opt) => {
                  const Icon = ICON_MAP[opt.icon] || Sparkles;
                  const isSelected = interests.includes(opt.value);

                  return (
                    <motion.button
                      key={opt.value}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleInterestToggle(opt.value)}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-xl text-left transition-all",
                        "border",
                        isSelected
                          ? "bg-violet-500/20 border-violet-500/50"
                          : "bg-zinc-900/60 border-zinc-800 hover:bg-zinc-800/80 hover:border-zinc-700"
                      )}
                    >
                      <div
                        className={cn(
                          "p-2.5 rounded-lg transition-colors",
                          isSelected
                            ? "bg-violet-500/30 text-violet-300"
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
                        <div className="text-xs text-zinc-500 truncate">
                          {opt.description}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-5 h-5 text-violet-400" />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setStep("profession")}
                  className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  ← Retour
                </button>

                <Button
                  onClick={handleInterestsNext}
                  disabled={interests.length === 0}
                  className={cn(
                    "transition-all",
                    interests.length > 0
                      ? "bg-violet-600 hover:bg-violet-500"
                      : "bg-zinc-800 text-zinc-500"
                  )}
                >
                  Continuer
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              {/* Progress dots */}
              <div className="flex justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-violet-500" />
                <div className="w-2 h-2 rounded-full bg-violet-500" />
                <div className="w-2 h-2 rounded-full bg-zinc-700" />
              </div>
            </motion.div>
          )}

          {/* STEP 3: EXAMPLE */}
          {step === "example" && (
            <motion.div
              key="example"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Header */}
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold text-white">
                  Un exemple concret ? <span className="text-zinc-500">(optionnel)</span>
                </h2>
                <p className="text-zinc-400 text-sm max-w-md mx-auto">
                  Décrivez un calcul ou une décision que vous aimeriez simuler.
                  C'est optionnel mais ça nous aide à mieux vous suggérer.
                </p>
              </div>

              {/* Text input */}
              <div className="space-y-3">
                <textarea
                  value={example}
                  onChange={(e) => setExample(e.target.value)}
                  placeholder="Ex: Savoir si je dois embaucher ou sous-traiter, calculer ma rentabilité mensuelle, comparer l'achat vs la location..."
                  className={cn(
                    "w-full bg-zinc-900/80 border border-zinc-700 rounded-xl p-4",
                    "text-white placeholder:text-zinc-600 text-sm",
                    "focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50",
                    "resize-none transition-all"
                  )}
                  rows={4}
                />
                <p className="text-xs text-zinc-600 text-center">
                  {example.length}/200 caractères
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setStep("interests")}
                  className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  ← Retour
                </button>

                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 shadow-lg shadow-violet-500/25"
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
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Terminer
                    </>
                  )}
                </Button>
              </div>

              {/* Progress dots */}
              <div className="flex justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-violet-500" />
                <div className="w-2 h-2 rounded-full bg-violet-500" />
                <div className="w-2 h-2 rounded-full bg-violet-500" />
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
                  Profil créé !
                </h2>
                <p className="text-zinc-400 text-sm">
                  Vos suggestions sont maintenant personnalisées.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
