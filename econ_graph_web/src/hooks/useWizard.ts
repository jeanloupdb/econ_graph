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
import { ConversationTurn, WizardOption, WizardState, WizardSummary } from '@/types/wizard';
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

const toSerializableState = (state: WizardState): WizardState => {
  const systemMessage =
    state.systemMessage && typeof state.systemMessage.content === 'string'
      ? state.systemMessage
      : undefined;
  return { ...state, systemMessage };
};

export function useWizard() {
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const persistSessionState = useCallback((nextState: WizardState) => {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(toSerializableState(nextState)));
    } catch (error) {
      console.error('Failed to persist wizard state to sessionStorage', error);
    }
  }, []);

  const nextRequest = useCallback(() => {
    requestIdRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    return {
      requestId: requestIdRef.current,
      signal: abortControllerRef.current.signal,
    };
  }, []);

  // Sauvegarder l'état dans sessionStorage (pour navigation rapide)
  useEffect(() => {
    if (state.currentQuestion) {
      persistSessionState(state);
    }
  }, [state, persistSessionState]);

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
          if (parsedState.isLoading) {
            setState({
              ...parsedState,
              isLoading: false,
              currentStep: 'question',
              systemMessage: {
                type: 'info',
                content: 'Une génération précédente a été interrompue.',
                timestamp: new Date().toISOString(),
              },
            });
          } else {
            setState(parsedState);
          }
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
        persistSessionState(serverState);
        return;
      }

      // 3. Pas d'état existant, initialiser avec la question initiale
      const { signal, requestId } = nextRequest();
      const initialQuestion = await getInitialQuestion(signal);
      if (requestId !== requestIdRef.current) return;
      const newState: WizardState = {
        ...INITIAL_STATE,
        currentQuestion: initialQuestion,
        stepNumber: 1,
        isLoading: false,
      };

      setState(newState);
      persistSessionState(newState);
      saveToServer(newState);
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to initialize wizard',
        isLoading: false,
      }));
    }
  }, [nextRequest, saveToServer]);

  /**
   * Soumet la réponse de l'utilisateur et passe à l'étape suivante.
   */
  const submitAnswer = useCallback(
    async (
      userChoice?: string,
      userFreeform?: string,
      meta?: {
        selectedOption?: WizardOption;
        choiceType?: 'option' | 'freeform' | 'mixed';
        displayText?: string;
      }
    ) => {
      if (!state.currentQuestion) return;

      const selectedOption = meta?.selectedOption;
      const choiceType =
        meta?.choiceType ||
        (selectedOption && userFreeform ? 'mixed' : selectedOption ? 'option' : userFreeform ? 'freeform' : undefined);
      const displayText = meta?.displayText || userFreeform || userChoice;

      // 1. Créer le nouveau turn
      const newTurn: ConversationTurn = {
        step: state.stepNumber,
        section_id: state.currentQuestion.section_id,
        question: state.currentQuestion.question,
        userChoice,
        userFreeform,
        userChoiceValue: selectedOption?.value,
        userChoiceDescription: selectedOption?.description,
        choiceType,
        optionsSnapshot: state.currentQuestion.options,
        draftPrompt: state.currentQuestion.draft_prompt,
        displayText,
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
          const { signal, requestId } = nextRequest();
          const summary = await finalizeWizard(updatedHistory, signal);
          if (requestId !== requestIdRef.current) return;
          newState = {
            ...intermediateState,
            currentStep: 'summary',
            summary,
            isLoading: false,
          };
        } else {
          // Question suivante
          const { signal, requestId } = nextRequest();
          const nextQuestion = await getNextQuestion(updatedHistory, signal);
          if (requestId !== requestIdRef.current) return;
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
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        console.error('Generation failed', error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Generation failed',
        }));
      }
    },
    [nextRequest, state, saveToServer]
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
        const { signal, requestId } = nextRequest();
        const initialQuestion = await getInitialQuestion(signal);
        if (requestId !== requestIdRef.current) return;
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
        const { signal, requestId } = nextRequest();
        const previousQuestion = await getNextQuestion(updatedHistory.slice(0, -1), signal);
        if (requestId !== requestIdRef.current) return;
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
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to go back',
        isLoading: false,
      }));
    }
  }, [nextRequest, state, saveToServer]);

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
      const { signal, requestId } = nextRequest();
      const lastQuestion = await getNextQuestion(state.conversationHistory, signal);
      if (requestId !== requestIdRef.current) return;
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
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to refine',
        isLoading: false,
      }));
    }
  }, [nextRequest, state, saveToServer]);

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

  const buildSummary = useCallback(
    async (draftPromptOverride?: string): Promise<WizardSummary | null> => {
      if (!state.currentQuestion) return null;
      const { signal, requestId } = nextRequest();
      const summary = await finalizeWizard(state.conversationHistory, signal, draftPromptOverride);
      if (requestId !== requestIdRef.current) return null;
      return summary;
    },
    [nextRequest, state]
  );

  /**
   * Prépare le récapitulatif (preview) avant génération.
   */
  const prepareSummary = useCallback(
    async (draftPromptOverride?: string): Promise<void> => {
      if (!state.currentQuestion) return;

      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      try {
        const summary = await buildSummary(draftPromptOverride);
        if (!summary) return;

        const newState: WizardState = {
          ...state,
          summary,
          currentStep: 'summary',
          isLoading: false,
        };
        setState(newState);
        saveToServer(newState);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to prepare summary',
          isLoading: false,
        }));
      }
    },
    [buildSummary, saveToServer, state]
  );

  /**
   * Crée le projet avec le prompt final du wizard.
   * Construit le résumé en interne si nécessaire (skip l'étape summary UI).
   */
  const createProject = useCallback(
    async (customPrompt?: string): Promise<string | null> => {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        systemMessage: undefined,
      }));

      try {
        // Determine prompt to use
        let promptToUse = customPrompt;

        if (!promptToUse) {
          if (state.summary?.final_prompt) {
            promptToUse = state.summary.final_prompt;
          } else {
            // Build summary inline (skip showing summary UI)
            const summary = await buildSummary(state.currentQuestion?.draft_prompt);
            if (summary?.final_prompt) {
              promptToUse = summary.final_prompt;
            }
          }
        }

        // Fallback to draft prompt
        if (!promptToUse) {
          promptToUse = state.currentQuestion?.draft_prompt;
        }

        if (!promptToUse) {
          console.error('No prompt available to create project');
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: 'Aucun prompt disponible pour créer le projet.',
          }));
          return null;
        }

        const result = await createProjectFromWizard(promptToUse);
        setState((prev) => ({
          ...prev,
          currentStep: 'question',
          isLoading: false,
          systemMessage: {
            type: 'info',
            content: "Création lancée en arrière-plan. Vous pouvez continuer.",
            timestamp: new Date().toISOString(),
          },
        }));
        return result.task_id;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return null;
        }
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to create project',
          isLoading: false,
          currentStep: 'question',
        }));
        return null;
      }
    },
    [buildSummary, state.currentQuestion, state.summary]
  );

  const cancelLoading = useCallback((message: unknown = 'Génération interrompue.') => {
    requestIdRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    const content = typeof message === 'string' ? message : 'Génération interrompue.';
    setState((prev) => ({
      ...prev,
      isLoading: false,
      error: null,
      systemMessage: {
        type: 'info',
        content,
        timestamp: new Date().toISOString(),
      },
      currentStep: 'question',
    }));
  }, []);

  /**
   * Réinitialise complètement la conversation.
   * Efface l'état local et serveur, puis recharge la question initiale.
   */
  const resetConversation = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (!silent) {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
    }

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
      persistSessionState(newState);
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
    persistSessionState(wizardState);
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
    cancelLoading,
    prepareSummary,
  };
}
