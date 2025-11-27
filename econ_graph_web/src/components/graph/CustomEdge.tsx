'use client';

import { BaseEdge, EdgeLabelRenderer, EdgeProps, getBezierPath, useReactFlow } from 'reactflow';
import { Badge } from '@/components/ui/badge';
import { Calculator } from 'lucide-react';
import { useUIStore } from '@/store/uiState';

export function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
  data,
}: EdgeProps) {
  const { getEdges } = useReactFlow();
  const setSelectedEdgeIds = useUIStore((state) => state.setSelectedEdgeIds);

  // Standard edge rendering
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isAlgorithmLabel = typeof label === 'string' && label.includes('Algorithm');

  const handleLabelClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isAlgorithmLabel && data?.targetNode) {
      // Get all edges that have the same target (the computed node)
      const allEdges = getEdges();
      const targetNodeId = data.targetNode.id;
      const relatedEdgeIds = allEdges
        .filter(edge => edge.target === targetNodeId)
        .map(edge => edge.id);

      // Select all related edges
      setSelectedEdgeIds(relatedEdgeIds);
    }
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 10,
              pointerEvents: 'all',
            }}
            className="nodrag nopan cursor-pointer"
            onClick={handleLabelClick}
          >
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0.5 bg-white dark:bg-zinc-900 shadow-sm border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1"
            >
              {isAlgorithmLabel ? (
                <>
                  <Calculator className="h-3 w-3" />
                  <span>Algorithm</span>
                </>
              ) : (
                <span>{typeof label === 'string' ? label : ''}</span>
              )}
            </Badge>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
