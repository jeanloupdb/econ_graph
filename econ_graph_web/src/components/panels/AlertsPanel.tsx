'use client';

import { useState } from 'react';
import { useCheckRules, useApplySuggestion } from '@/lib/api/hooks';
import { useUIStore } from '@/store/uiState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Info, XCircle, CheckCircle, Loader2, Focus } from 'lucide-react';
import type { RuleViolation, NodeUpdate } from '@/lib/types';

export function AlertsPanel() {
  // Panel currently disabled (no toggle in UI store)
  const alertsPanelOpen = false;
  const setSelectedNodeIds = useUIStore((state) => state.setSelectedNodeIds);
  const [violations, setViolations] = useState<RuleViolation[]>([]);

  const checkMutation = useCheckRules({
    onSuccess: (data) => {
      setViolations(data.violations);
    },
  });

  const applySuggestion = useApplySuggestion({
    onSuccess: () => {
      // Re-check after applying suggestion
      checkMutation.mutate({});
    },
  });

  const handleCheck = () => {
    checkMutation.mutate({});
  };

  const handleFocusNodes = (nodeIds: string[]) => {
    setSelectedNodeIds(nodeIds);
  };

  const handleApplySuggestion = async (violation: RuleViolation) => {
    if (!violation.suggestion) return;

    const update: NodeUpdate = {};
    if (violation.suggestion.proposed_value !== undefined) {
      update.value_computed = violation.suggestion.proposed_value;
    }
    // plausible ranges removed
    if (violation.suggestion.proposed_status) {
      update.status = violation.suggestion.proposed_status;
    }

    if (!confirm(`Apply suggestion for ${violation.nodes_involved.join(', ')}?`)) {
      return;
    }

    await applySuggestion.mutateAsync({
      nodeId: violation.suggestion.node_id,
      update,
    });
  };

  if (!alertsPanelOpen) {
    return null;
  }

  const getSeverityIcon = (severity: RuleViolation['severity']) => {
    switch (severity) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const getSeverityBadgeVariant = (severity: RuleViolation['severity']) => {
    switch (severity) {
      case 'error':
        return 'destructive' as const;
      case 'warning':
        return 'warning' as const;
      case 'info':
        return 'secondary' as const;
    }
  };

  const sortedViolations = [...violations].sort((a, b) => {
    const severityOrder = { error: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  return (
    <div className="flex h-full w-80 flex-col border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-lg font-semibold mb-3">Coherency Alerts</h2>
        <Button
          onClick={handleCheck}
          disabled={checkMutation.isPending}
          className="w-full"
          size="sm"
        >
          {checkMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          <CheckCircle className="h-4 w-4" />
          Check Coherency
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {checkMutation.isError && (
          <div className="p-4">
            <div className="rounded-md bg-red-50 p-3 dark:bg-red-950/20">
              <p className="text-sm text-red-800 dark:text-red-200">
                {checkMutation.error?.message}
              </p>
            </div>
          </div>
        )}

        {checkMutation.isSuccess && violations.length === 0 && (
          <div className="p-4">
            <div className="rounded-md bg-green-50 p-3 dark:bg-green-950/20">
              <p className="text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                No violations found. All rules passed!
              </p>
            </div>
          </div>
        )}

        {sortedViolations.length > 0 && (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {sortedViolations.map((violation, index) => (
              <div key={`${violation.rule_id}-${index}`} className="p-4 space-y-3">
                <div className="flex items-start gap-2">
                  {getSeverityIcon(violation.severity)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium">{violation.rule_name}</h4>
                      <Badge variant={getSeverityBadgeVariant(violation.severity)} className="text-xs">
                        {violation.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {violation.message}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {violation.nodes_involved.map((nodeId) => (
                    <Badge key={nodeId} variant="outline" className="text-xs">
                      {nodeId}
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleFocusNodes(violation.nodes_involved)}
                    className="flex-1"
                  >
                    <Focus className="h-3 w-3" />
                    Focus
                  </Button>
                  {violation.suggestion && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleApplySuggestion(violation)}
                      disabled={applySuggestion.isPending}
                      className="flex-1"
                    >
                      {applySuggestion.isPending && (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      )}
                      Apply Fix
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
