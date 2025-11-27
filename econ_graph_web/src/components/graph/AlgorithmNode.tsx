'use client';

import { Handle, Position, NodeProps } from 'reactflow';
import { Calculator } from 'lucide-react';

interface AlgorithmNodeData {
  targetNodeId: string;
  computation_definition?: string;
  error?: string | null;
}

export function AlgorithmNode({ data }: NodeProps<AlgorithmNodeData>) {
  const hasError = !!data.error;

  return (
    <div
      className={`rounded-full p-2 shadow-lg border-2 cursor-pointer transition-all hover:scale-110 ${
        hasError
          ? 'bg-red-100 border-red-400 dark:bg-red-950 dark:border-red-600'
          : 'bg-blue-100 border-blue-400 dark:bg-blue-950 dark:border-blue-600'
      }`}
      title={hasError ? 'Algorithm Error - Click to view' : 'Algorithm - Click to view'}
    >
      <Handle type="target" position={Position.Left} className="w-2 h-2" />

      <Calculator
        className={`h-5 w-5 ${
          hasError
            ? 'text-red-600 dark:text-red-400'
            : 'text-blue-600 dark:text-blue-400'
        }`}
      />

      <Handle type="source" position={Position.Right} className="w-2 h-2" />
    </div>
  );
}
