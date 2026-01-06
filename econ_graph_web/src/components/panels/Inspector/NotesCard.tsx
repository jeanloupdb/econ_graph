"use client";

import { InfoHint } from "@/components/ui/info-hint";
import { useGraphData } from "@/graph/context/GraphDataContext";

interface NotesCardProps {
  nodeId: string;
}

export function NotesCard({ nodeId }: NotesCardProps) {
  const { nodes } = useGraphData();
  const node = nodes.find((n) => n.id === nodeId);
  const text = (node?.notes as string) || "";
  const isEmpty = !text || text.trim().length === 0;

  return (
    <div className="py-2 pl-3 pr-4">
      {!isEmpty ? (
        <div className="text-sm leading-relaxed whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
          {text}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <span className="italic">Aucune note.</span>
          <InfoHint title="Astuce">
            Saisissez des notes via le bouton « Éditer » en en-tête.
          </InfoHint>
        </div>
      )}
    </div>
  );
}
