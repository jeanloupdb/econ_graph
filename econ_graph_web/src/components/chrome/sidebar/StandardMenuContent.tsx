"use client";

import { useProjectStore } from "@/store/projectState";
import { useUIStore } from "@/store/uiState";
import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { NodeExplorer } from "./NodeExplorer";
import { CollapsibleSection } from "./SidebarSection";

export function StandardMenuContent({
    onShowCreateApiDialog,
    onShowInsertCompositeModal,
    onEditNode,
}: {
    onShowCreateApiDialog: () => void;
    onShowInsertCompositeModal: () => void;
    onEditNode: (id: string) => void;
}) {
  const router = useRouter();
  const developerMode = useUIStore((s) => s.developerMode);
  const setScenarioPanelOpen = useUIStore((s) => s.setScenarioPanelOpen);
  const resetDetailPanels = useUIStore((s) => s.resetDetailPanels);
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const setNodeEditorMode = useUIStore((s) => s.setNodeEditorMode);
  const setNodeEditorNodeId = useUIStore((s) => s.setNodeEditorNodeId);
  
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleCreateCompositeFromGraph = useCallback(() => {
    if (!currentProjectId) {
      toast.error("Sélectionnez un projet avant de créer un composite.");
      return;
    }
    resetDetailPanels();
    const encoded = encodeURIComponent(currentProjectId);
    router.push(`/composites/new?return=graph&project=${encoded}`);
  }, [currentProjectId, router, resetDetailPanels]);

  const handleCreateNode = () => {
    setNodeEditorNodeId(null);
    setNodeEditorMode('create');
  };

  return (
    <>




      <CollapsibleSection 
        title={
            isSearchOpen ? (
                <input
                    autoFocus
                    type="text"
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-transparent border-none outline-none text-xs w-full placeholder:text-zinc-500 text-zinc-900 dark:text-zinc-100 h-full"
                />
            ) : (
                "Explorateur"
            )
        }
        defaultOpen={true}
        action={
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    if (isSearchOpen) {
                        setIsSearchOpen(false);
                        setSearchQuery("");
                    } else {
                        setIsSearchOpen(true);
                    }
                }}
                className="p-1 hover:bg-white/10 rounded transition-colors text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
                {isSearchOpen ? <X className="h-3.5 w-3.5" /> : <Search className="h-3.5 w-3.5" />}
            </button>
        }
      >
        <NodeExplorer onEditNode={onEditNode} searchQuery={searchQuery} />
      </CollapsibleSection>
    </>
  );
}
