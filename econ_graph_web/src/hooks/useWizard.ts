/**
 * Hook pour gérer l'état et la logique du wizard conversationnel.
 * Version simplifiée : une seule conversation par utilisateur, persistée sur User.wizard_state
 */

import {
    createProjectFromWizard,
    finalizeWizard,
    getInitialQuestion,
    getNextQuestion,
    loadUserWizardState,
    saveUserWizardState,
} from '@/lib/api/wizard';
import { ConversationTurn, WizardState } from '@/types/wizard';
import { useCallback, useEffect, useRef, useState } from 'react';

const SESSION_STORAGE_KEY = 'wizard_state';

const INITIAL_STATE: WizardState = {
  currentStep: 'question',
  stepNumber: 0,
  conversationHistory: [],
  currentQuestion: null,
  summary: null,
  isLoading: false,
  error: null,
};

export function useWizard() {
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  // Sauvegarder l'état dans sessionStorage (pour navigation rapide)
  useEffect(() => {
    if (state.currentQuestion) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  // Sauvegarder sur le serveur avec debounce
  const saveToServer = useCallback((newState: WizardState) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveUserWizardState(newState);
      } catch (e) {
        console.error('Failed to save wizard state to server', e);
      }
    }, 500);
  }, []);

  /**
   * Initialise le wizard.
   * 1. Essaie sessionStorage (rapide)
   * 2. Sinon charge depuis User.wizard_state (API)
   * 3. Si null, crée un état initial avec la question initiale
   */
  const initialize = useCallback(async () => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    // 1. Essayer sessionStorage
    try {
      const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        const parsedState = JSON.parse(saved) as WizardState;
        if (parsedState.currentQuestion) {
          setState(parsedState);
          return;
        }
      }
    } catch (e) {
      console.error('Failed to restore wizard state from session', e);
    }

    // 2. Charger depuis le serveur
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const serverState = await loadUserWizardState();

      if (serverState && serverState.currentQuestion) {
        // État existant sur le serveur
        setState(serverState);
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(serverState));
        return;
      }

      // 3. Pas d'état existant, initialiser avec la question initiale
      const initialQuestion = await getInitialQuestion();
      const newState: WizardState = {
        ...INITIAL_STATE,
        currentQuestion: initialQuestion,
        stepNumber: 1,
        isLoading: false,
      };

      setState(newState);
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newState));
      saveToServer(newState);
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to initialize wizard',
        isLoading: false,
      }));
    }
  }, [saveToServer]);

  /**
   * Soumet la réponse de l'utilisateur et passe à l'étape suivante.
   */
  const submitAnswer = useCallback(
    async (userChoice?: string, userFreeform?: string) => {
      if (!state.currentQuestion) return;

      // 1. Créer le nouveau turn
      const newTurn: ConversationTurn = {
        step: state.stepNumber,
        section_id: state.currentQuestion.section_id,
        question: state.currentQuestion.question,
        userChoice,
        userFreeform,
        timestamp: new Date().toISOString(),
      };

      const updatedHistory = [...state.conversationHistory, newTurn];

      // 2. Mettre à jour l'état local immédiatement (optimistic)
      const intermediateState: WizardState = {
        ...state,
        conversationHistory: updatedHistory,
        isLoading: true,
        error: null,
      };
      setState(intermediateState);

      try {
        let newState: WizardState;

        if (state.currentQuestion.is_final_step) {
          // Finaliser le wizard
          const summary = await finalizeWizard(updatedHistory);
          newState = {
            ...intermediateState,
            currentStep: 'summary',
            summary,
            isLoading: false,
          };
        } else {
          // Question suivante
          const nextQuestion = await getNextQuestion(updatedHistory);
          newState = {
            ...intermediateState,
            currentQuestion: nextQuestion,
            stepNumber: intermediateState.stepNumber + 1,
            isLoading: false,
          };
        }

        setState(newState);
        saveToServer(newState);
      } catch (error) {
        console.error('Generation failed', error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Generation failed',
        }));
      }
    },
    [state, saveToServer]
  );

  /**
   * Retourne à l'étape précédente.
   */
  const goBack = useCallback(async () => {
    if (state.conversationHistory.length === 0) return;

    const updatedHistory = state.conversationHistory.slice(0, -1);

    setState((prev) => ({
      ...prev,
      conversationHistory: updatedHistory,
      isLoading: true,
      error: null,
    }));

    try {
      if (updatedHistory.length === 0) {
        const initialQuestion = await getInitialQuestion();
        const newState: WizardState = {
          ...state,
          conversationHistory: updatedHistory,
          currentQuestion: initialQuestion,
          stepNumber: 1,
          currentStep: 'question',
          isLoading: false,
        };
        setState(newState);
        saveToServer(newState);
      } else {
        const previousQuestion = await getNextQuestion(updatedHistory.slice(0, -1));
        const newState: WizardState = {
          ...state,
          conversationHistory: updatedHistory,
          currentQuestion: previousQuestion,
          stepNumber: state.stepNumber - 1,
          currentStep: 'question',
          isLoading: false,
        };
        setState(newState);
        saveToServer(newState);
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to go back',
        isLoading: false,
      }));
    }
  }, [state, saveToServer]);

  /**
   * Revient du récapitulatif aux questions pour affiner.
   */
  const refineFromSummary = useCallback(async () => {
    if (state.conversationHistory.length === 0) return;

    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      const lastQuestion = await getNextQuestion(state.conversationHistory);
      const newState: WizardState = {
        ...state,
        currentStep: 'question',
        currentQuestion: lastQuestion,
        summary: null,
        isLoading: false,
      };
      setState(newState);
      saveToServer(newState);
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to refine',
        isLoading: false,
      }));
    }
  }, [state, saveToServer]);

  /**
   * Ajoute un message système (ex: erreur de création)
   */
  const addSystemMessage = useCallback((type: 'error' | 'info', content: string) => {
    setState((prev) => ({
      ...prev,
      systemMessage: {
        type,
        content,
        timestamp: new Date().toISOString(),
      },
      currentStep: 'question',
      isLoading: false,
    }));
  }, []);

  /**
   * Crée le projet avec le prompt final du wizard.
   */
  const createProject = useCallback(async (customPrompt?: string): Promise<string | null> => {
    const promptToUse = customPrompt || state.summary?.final_prompt || state.currentQuestion?.draft_prompt;

    if (!promptToUse) {
      console.error('No prompt available to create project');
      return null;
    }

    setState((prev) => ({
      ...prev,
      currentStep: 'creating',
      isLoading: true,
      error: null,
      systemMessage: undefined,
    }));

    try {
      const result = await createProjectFromWizard(promptToUse);
      return result.task_id;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to create project',
        isLoading: false,
        currentStep: 'question',
      }));
      return null;
    }
  }, [state.summary, state.currentQuestion]);

  /**
   * Réinitialise complètement la conversation.
   * Efface l'état local et serveur, puis recharge la question initiale.
   */
  const resetConversation = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // 1. Effacer sessionStorage
      sessionStorage.removeItem(SESSION_STORAGE_KEY);

      // 2. Effacer sur le serveur
      await saveUserWizardState(null);

      // 3. Recharger la question initiale
      const initialQuestion = await getInitialQuestion();
      const newState: WizardState = {
        ...INITIAL_STATE,
        currentQuestion: initialQuestion,
        stepNumber: 1,
        isLoading: false,
      };

      setState(newState);
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newState));
      // Pas besoin de sauvegarder sur le serveur car on vient de le vider
      // et le nouvel état sera sauvegardé lors de la prochaine interaction
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to reset conversation',
        isLoading: false,
      }));
    }
  }, []);

  /**
   * Charge l'état depuis un objet WizardState existant.
   * Utilisé lors de migrations ou restaurations spécifiques.
   */
  const loadFromState = useCallback((wizardState: WizardState) => {
    setState(wizardState);
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(wizardState));
  }, []);

  return {
    state,
    initialize,
    submitAnswer,
    goBack,
    refineFromSummary,
    createProject,
    resetConversation,
    addSystemMessage,
    loadFromState,
  };
}
