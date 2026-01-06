import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useComposites } from "@/lib/api/hooks";
import { useScenarioStore } from "@/store/scenarioState";
import { useUIStore } from "@/store/uiState";
import { ChevronLeft, Layers, Loader2, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CompositePreview } from "../composites/CompositePreview";

export function LibraryPanel() {
  const { data: composites = [], isLoading } = useComposites();
  const setLibraryPanelOpen = useUIStore((s) => s.setLibraryPanelOpen);
  const [search, setSearch] = useState("");
  const router = useRouter();

  // Mode determination for styling
  const activeScenarioId = useScenarioStore((s) => s.activeScenarioId);
  const comparisonEnabled = useScenarioStore((s) => s.comparisonEnabled);
  
  const mode = comparisonEnabled
    ? "comparison"
    : activeScenarioId
    ? "scenario"
    : "baseline";

  const getContainerStyles = () => {
    switch (mode) {
      case "scenario":
        return "bg-slate-950 border-slate-800/50 backdrop-blur-xl";
      case "comparison":
        return "bg-[#170600] border-[#331000]/50 backdrop-blur-xl";
      default: // baseline
        return "bg-white/60 dark:bg-black/40 border-white/20 backdrop-blur-xl shadow-lg";
    }
  };

  const getHeaderStyles = () => {
    switch (mode) {
      case "scenario":
        return "text-slate-200 border-white/5";
      case "comparison":
        return "text-orange-100 border-white/5";
      default:
        return "text-zinc-900 dark:text-zinc-100 border-white/10 dark:border-white/5";
    }
  };

  const filtered = composites.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDragStart = (event: React.DragEvent, compositeId: string) => {
    event.dataTransfer.setData("application/reactflow/composite", compositeId);
    event.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div className={`fixed top-[4.5rem] left-2 bottom-2 w-80 flex flex-col rounded-2xl border z-40 transition-all duration-300 ${getContainerStyles()}`}>
      <div className={`flex items-center justify-between px-4 py-3 border-b shrink-0 ${getHeaderStyles()}`}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLibraryPanelOpen(false)}
            className={`p-1 -ml-2 rounded-lg transition-colors ${
                mode === 'baseline' 
                    ? 'hover:bg-white/20 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400' 
                    : 'hover:bg-white/10 text-white/60 hover:text-white'
            }`}
            title="Retour au menu"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 font-semibold">
            <Layers className="h-4 w-4" />
            Library
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.push("/composites/new")}
            title="Créer un nouveau composite"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search composites..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-zinc-500">
            <Layers className="mb-2 h-8 w-8 opacity-20" />
            <p>No composites found.</p>
            <Button
              variant="link"
              className="mt-2"
              onClick={() => router.push("/composites/new")}
            >
              Create new
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((composite) => (
              <div
                key={composite.id}
                draggable
                onDragStart={(e) => handleDragStart(e, composite.id)}
                className="group relative flex cursor-grab flex-col gap-1 rounded-lg border border-zinc-200 bg-zinc-50/50 p-3 transition-colors hover:border-amber-300 hover:bg-amber-50 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-amber-700 dark:hover:bg-amber-900/20"
              >
                <div className="font-medium text-zinc-900 dark:text-zinc-100">
                  {composite.name}
                </div>
                <div className="mb-2 h-24 w-full overflow-hidden rounded border border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-950">
                  <CompositePreview
                    graphData={composite.graph_data as any}
                    className="h-full w-full"
                  />
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  Updated {new Date(composite.updated_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
