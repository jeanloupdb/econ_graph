import type { CompositeGraphData } from "@/lib/types";
import { useMemo } from "react";

interface CompositePreviewProps {
  graphData: CompositeGraphData;
  className?: string;
}

export function CompositePreview({ graphData, className }: CompositePreviewProps) {
  const nodes = graphData?.nodes || [];
  const edges = graphData?.edges || [];

  const { viewBox, scaledNodes, scaledEdges } = useMemo(() => {
    if (!nodes || nodes.length === 0) {
      return { viewBox: "0 0 100 100", scaledNodes: [], scaledEdges: [] };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    nodes.forEach((node) => {
      const x = node.pos_x || 0;
      const y = node.pos_y || 0;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + 200); // Assume node width ~200
      maxY = Math.max(maxY, y + 100); // Assume node height ~100
    });

    // Add padding
    const padding = 50;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const width = maxX - minX;
    const height = maxY - minY;

    return {
      viewBox: `${minX} ${minY} ${width} ${height}`,
      scaledNodes: nodes,
      scaledEdges: edges || [],
    };
  }, [nodes, edges]);

  if (!nodes || nodes.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-zinc-100 dark:bg-zinc-900 ${className}`}>
        <span className="text-xs text-zinc-400">Empty</span>
      </div>
    );
  }

  return (
    <svg
      viewBox={viewBox}
      className={`h-full w-full bg-zinc-50 dark:bg-zinc-900 ${className}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#9ca3af" />
        </marker>
      </defs>
      {scaledEdges.map((edge, i) => {
        const source = nodes.find((n) => n.id === edge.source);
        const target = nodes.find((n) => n.id === edge.target);
        if (!source || !target) return null;

        const sx = (source.pos_x || 0) + 100; // Center x
        const sy = (source.pos_y || 0) + 50;  // Center y
        const tx = (target.pos_x || 0) + 100;
        const ty = (target.pos_y || 0) + 50;

        return (
          <line
            key={i}
            x1={sx}
            y1={sy}
            x2={tx}
            y2={ty}
            stroke="#e4e4e7"
            strokeWidth="4"
            markerEnd="url(#arrowhead)"
            className="dark:stroke-zinc-700"
          />
        );
      })}
      {scaledNodes.map((node) => (
        <rect
          key={node.id}
          x={node.pos_x || 0}
          y={node.pos_y || 0}
          width="200"
          height="100"
          rx="8"
          fill="#ffffff"
          stroke="#e4e4e7"
          strokeWidth="2"
          className="dark:fill-zinc-800 dark:stroke-zinc-700"
        />
      ))}
    </svg>
  );
}
