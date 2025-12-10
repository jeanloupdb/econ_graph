import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useComposites } from "@/lib/api/hooks";
import { useUIStore } from "@/store/uiState";
import { Layers, Loader2, Plus, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CompositePreview } from "../composites/CompositePreview";

export function LibraryPanel() {
  const { data: composites = [], isLoading } = useComposites();
  const setLibraryPanelOpen = useUIStore((s) => s.setLibraryPanelOpen);
  const [search, setSearch] = useState("");
  const router = useRouter();

  const filtered = composites.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDragStart = (event: React.DragEvent, compositeId: string) => {
    event.dataTransfer.setData("application/reactflow/composite", compositeId);
    event.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div className="flex h-full w-80 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
          <Layers className="h-4 w-4" />
          Library
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
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setLibraryPanelOpen(false)}
          >
            <X className="h-4 w-4" />
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
