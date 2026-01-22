
import { cn } from "@/lib/utils";

interface DeleteScenarioModalProps {
  isLightMode: boolean;
  scenarioToDelete: { id: string; name: string } | null;
  setScenarioToDelete: (v: { id: string; name: string } | null) => void;
  handleDeleteScenario: () => void;
}

export function DeleteScenarioModal({
  isLightMode,
  scenarioToDelete,
  setScenarioToDelete,
  handleDeleteScenario
}: DeleteScenarioModalProps) {
  if (!scenarioToDelete) return null;

  return (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setScenarioToDelete(null)}
        >
          <div 
            className={cn(
              "w-full max-w-sm rounded-xl p-6",
              isLightMode ? "bg-white" : "bg-zinc-900"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={cn(
              "text-lg font-semibold mb-2",
              isLightMode ? "text-zinc-900" : "text-white"
            )}>
              Supprimer le scénario ?
            </h3>
            <p className={cn(
              "text-sm mb-6",
              isLightMode ? "text-zinc-600" : "text-zinc-400"
            )}>
              Le scénario &quot;{scenarioToDelete?.name}&quot; sera supprimé définitivement.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setScenarioToDelete(null)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  isLightMode 
                    ? "bg-zinc-100 text-zinc-700 hover:bg-zinc-200" 
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                )}
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteScenario}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  isLightMode 
                    ? "bg-red-500 text-white hover:bg-red-600" 
                    : "bg-red-600 text-white hover:bg-red-700"
                )}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
  );
}
