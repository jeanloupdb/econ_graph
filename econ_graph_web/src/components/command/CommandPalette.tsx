"use client";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useGraphData } from "@/graph/context/GraphDataContext";
import { useUIStore } from "@/store/uiState";
import {
  Box,
  Home,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CommandPalette() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  // Use store state (keyboard shortcut is handled in useKeyboardShortcuts hook)
  const open = useUIStore((s) => s.commandPaletteOpen);
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);

  // Data
  const { nodes } = useGraphData();

  // Filter nodes based on search
  const filteredNodes = nodes.filter((node) =>
    node.label.toLowerCase().includes(search.toLowerCase()) ||
    (node.description && node.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search nodes, navigate..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>
          <div className="py-6 text-center">
            <p className="text-sm text-zinc-500">No results found</p>
            <p className="text-xs text-zinc-400 mt-1">
              Try searching for a node name or description
            </p>
          </div>
        </CommandEmpty>

        {/* Search Results - Nodes */}
        {search && filteredNodes.length > 0 && (
          <CommandGroup heading="Nodes">
            {filteredNodes.slice(0, 10).map((node) => (
              <CommandItem
                key={node.id}
                onSelect={() => {
                  // Focus node on canvas
                  useUIStore.getState().setSelectedNodeIds([node.id]);
                  setOpen(false);
                  setSearch("");
                }}
                className="gap-3"
              >
                <Box className="h-4 w-4 text-zinc-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{node.label}</p>
                  {node.description && (
                    <p className="text-xs text-zinc-500 line-clamp-1">
                      {node.description}
                    </p>
                  )}
                </div>
              </CommandItem>
            ))}
            {filteredNodes.length > 10 && (
              <div className="px-2 py-1.5 text-xs text-zinc-500">
                +{filteredNodes.length - 10} more results
              </div>
            )}
          </CommandGroup>
        )}

        {/* Navigation */}
        {!search && (
          <>
            <CommandGroup heading="Navigation">
              <CommandItem
                onSelect={() => {
                  router.push("/dashboard");
                  setOpen(false);
                }}
                className="gap-3"
              >
                <Home className="h-4 w-4 text-zinc-500" />
                <span className="text-sm">Go to Dashboard</span>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Help */}
        {!search && (
          <CommandGroup heading="Quick tips">
            <div className="px-2 py-3 text-xs text-zinc-500 space-y-1">
              <p>• Search for nodes by name or description</p>
              <p>• Press <kbd className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">⌘K</kbd> to open this menu</p>
              <p>• Use the <kbd className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">+</kbd> button for AI & creation</p>
            </div>
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
