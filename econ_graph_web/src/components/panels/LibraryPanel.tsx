import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useComposites } from "@/lib/api/hooks";
import { useGraphTheme } from "@/lib/context/GraphThemeContext";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/uiState";
import { ChevronLeft, Layers, Loader2, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CompositePreview } from "../composites/CompositePreview";

export function LibraryPanel() {
  const { isLightMode } = useGraphTheme();
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
    <div
      className={cn(
        "fixed top-[4.5rem] left-2 bottom-2 w-80 flex flex-col rounded-2xl border z-40 transition-all duration-300",
        isLightMode
          ? "bg-zinc-300 border-zinc-500"
          : "bg-zinc-900/95 border-white/[0.08]"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between px-4 py-3 border-b shrink-0",
          isLightMode
            ? "text-zinc-900 border-zinc-300"
            : "text-zinc-100 border-white/[0.06]"
        )}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLibraryPanelOpen(false)}
            className={cn(
              "p-1 -ml-2 rounded-lg transition-colors",
              isLightMode
                ? "hover:bg-zinc-300 text-zinc-700"
                : "hover:bg-white/10 text-zinc-400"
            )}
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
          <Search
            className={cn(
              "absolute left-2.5 top-2.5 h-4 w-4",
              isLightMode ? "text-zinc-400" : "text-zinc-500"
            )}
          />
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
            <Loader2
              className={cn(
                "h-6 w-6 animate-spin",
                isLightMode ? "text-zinc-500" : "text-zinc-400"
              )}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div
            className={cn(
              "flex flex-col items-center justify-center py-8 text-center text-sm",
              isLightMode ? "text-zinc-500" : "text-zinc-500"
            )}
          >
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
                className={cn(
                  "group relative flex cursor-grab flex-col gap-1 rounded-lg border p-3 transition-colors",
                  isLightMode
                    ? "border-zinc-200 bg-zinc-50/50 hover:border-amber-300 hover:bg-amber-50"
                    : "border-zinc-800 bg-zinc-900/50 hover:border-amber-700 hover:bg-amber-900/20"
                )}
              >
                <div
                  className={cn(
                    "font-medium",
                    isLightMode ? "text-zinc-900" : "text-zinc-100"
                  )}
                >
                  {composite.name}
                </div>
                <div
                  className={cn(
                    "mb-2 h-24 w-full overflow-hidden rounded border",
                    isLightMode
                      ? "border-zinc-100 bg-white"
                      : "border-zinc-800 bg-zinc-950"
                  )}
                >
                  <CompositePreview
                    graphData={composite.graph_data as any}
                    className="h-full w-full"
                  />
                </div>
                <div
                  className={cn(
                    "text-xs",
                    isLightMode ? "text-zinc-500" : "text-zinc-400"
                  )}
                >
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
