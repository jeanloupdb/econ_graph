"use client";

import {
  Select
} from "@/components/ui/select";
import type {
  ComputeNodeResponse,
  Node,
  Scenario,
  ScenarioCompositeOverride,
  ScenarioNodeOverride,
} from "@/lib/types";
import { Layers, Plus } from "lucide-react";
import React from "react";
import { ParameterCard } from "./ParameterCard";
import type { CompositeSection, OverrideTarget } from "./types";
import { makeVirtualNodeFromParam } from "./utils";

export interface ScenarioParametersProps {
  projectId: string | null;
  filteredRootNodes: Node[];
  compositeSections: CompositeSection[];
  scenarioEditable: boolean;
  currentScenario?: Scenario;
  activeScenarioId: string | null;
  scenarioValuesScenarioId: string | null;
  scenarioComputedValues: Record<string, ComputeNodeResponse | undefined>;
  overrideModes: Record<string, "value" | "formula">;
  overrideValues: Record<string, string>;
  overrideCodes: Record<string, string>;
  existingOverrides: Record<string, string>;
  scenarioNodeOverridesMap: Record<string, ScenarioNodeOverride>;
  scenarioCompositeOverridesMap: Record<string, ScenarioCompositeOverride>;
  pendingChanges: Record<string, boolean>;
  setPendingChanges: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  validationResults: Record<string, { ok: boolean; message: string }>;
  tones: any;
  theme: any;
  localHighlightId: string | null;
  highlightRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  expandedRows: Record<string, boolean>;
  toggleRowExpansion: (key: string) => void;
  setPendingModeChange: React.Dispatch<
    React.SetStateAction<{
      targetKey: string;
      newMode: "value" | "formula";
      target: OverrideTarget;
    } | null>
  >;
  setConfirmModeChangeOpen: (open: boolean) => void;
  handleOverrideChange: (key: string, value: string) => void;
  handleSaveOverride: (key: string, target: OverrideTarget) => Promise<void>;
  setOverrideCodes: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  setValidationResults: React.Dispatch<
    React.SetStateAction<Record<string, { ok: boolean; message: string }>>
  >;
  setSelectedNodeId: (id: string) => void;
  selectedNodeIds: string[];
  setSelectedNodeIds: (ids: string[]) => void;
  addSelectedNode: (id: string) => void;
  removeSelectedNode: (id: string) => void;
  isSavingOverride: boolean;
  isValidatingOverride: boolean;
  onValidateOverride: (params: {
    nodeId: string;
    code: string;
    realValue: number;
  }) => Promise<{ ok: boolean; result?: number | null; error?: string | null }>;
  onRequestCreateScenario: () => void;
  scenarios: Scenario[];
  onSelectScenario: (id: string) => void;
}

interface RenderOptions {
  parentCompositeLabel?: string;
  parameterLabel?: string;
  overrideKey?: string;
  overrideTarget?: OverrideTarget;
  isVirtual?: boolean;
}

export function ScenarioParameters({
  projectId,
  filteredRootNodes,
  compositeSections,
  scenarioEditable,
  currentScenario,
  activeScenarioId,
  scenarioValuesScenarioId,
  scenarioComputedValues,
  overrideModes,
  overrideValues,
  overrideCodes,
  existingOverrides,
  scenarioNodeOverridesMap,
  scenarioCompositeOverridesMap,
  pendingChanges,
  setPendingChanges,
  validationResults,
  tones,
  theme,
  localHighlightId,
  highlightRefs,
  expandedRows,
  toggleRowExpansion,
  setPendingModeChange,
  setConfirmModeChangeOpen,
  handleOverrideChange,
  handleSaveOverride,
  setOverrideCodes,
  setValidationResults,
  setSelectedNodeId,
  selectedNodeIds,
  setSelectedNodeIds,
  addSelectedNode,
  removeSelectedNode,
  isSavingOverride,
  isValidatingOverride,
  onValidateOverride,
  onRequestCreateScenario,
  scenarios,
  onSelectScenario,
}: ScenarioParametersProps) {
  const renderCard = (node: Node, options?: RenderOptions) => {
    const targetKey = options?.overrideKey || node.id;
    const overrideTarget =
      options?.overrideTarget || ({ type: "node", nodeId: node.id } as OverrideTarget);

    return (
      <ParameterCard
        key={targetKey}
        node={node}
        targetKey={targetKey}
        overrideTarget={overrideTarget}
        parentCompositeLabel={options?.parentCompositeLabel}
        parameterLabel={options?.parameterLabel}
        isVirtual={options?.isVirtual}
        scenarioEditable={scenarioEditable}
        scenarioValuesScenarioId={scenarioValuesScenarioId}
        scenarioComputedValues={scenarioComputedValues}
        activeScenarioId={activeScenarioId}
        overrideModes={overrideModes}
        overrideValues={overrideValues}
        overrideCodes={overrideCodes}
        existingOverrides={existingOverrides}
        scenarioNodeOverridesMap={scenarioNodeOverridesMap}
        scenarioCompositeOverridesMap={scenarioCompositeOverridesMap}
        pendingChanges={pendingChanges}
        setPendingChanges={setPendingChanges}
        validationResults={validationResults}
        tones={tones}
        theme={theme}
        localHighlightId={localHighlightId}
        highlightRefs={highlightRefs}
        expandedRows={expandedRows}
        toggleRowExpansion={toggleRowExpansion}
        setPendingModeChange={setPendingModeChange}
        setConfirmModeChangeOpen={setConfirmModeChangeOpen}
        handleOverrideChange={handleOverrideChange}
        handleSaveOverride={handleSaveOverride}
        setOverrideCodes={setOverrideCodes}
        setValidationResults={setValidationResults}
        setSelectedNodeId={setSelectedNodeId}
        selectedNodeIds={selectedNodeIds}
        setSelectedNodeIds={setSelectedNodeIds}
        addSelectedNode={addSelectedNode}
        removeSelectedNode={removeSelectedNode}
        isSavingOverride={isSavingOverride}
        isValidatingOverride={isValidatingOverride}
        onValidateOverride={onValidateOverride}
      />
    );
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Paramètres réglables
        </h3>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          {activeScenarioId ? (
            <>
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor: currentScenario?.color || "#9ca3af",
                }}
              />
              <span>
                Pour le scénario « {currentScenario?.name || activeScenarioId} »
              </span>
            </>
          ) : (
            <>
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-400" />
              <span>Pour la Baseline (valeurs de base)</span>
            </>
          )}
        </div>
      </div>

      {!activeScenarioId && (
        <div className="flex flex-col items-center justify-center py-6 px-4 text-center space-y-3 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/20 mb-4">
          <div className="space-y-1">
            <h4 className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">
              Mode Baseline (Lecture seule)
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-[280px] mx-auto">
              Les valeurs ci-dessous sont fixes. Pour simuler des impacts, créez ou sélectionnez un scénario.
            </p>
          </div>
          
          {scenarios.length > 0 ? (
            <div className="w-full max-w-[200px]">
              <Select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    onSelectScenario(e.target.value);
                  }
                }}
                className="h-8 text-xs"
              >
                <option value="" disabled>
                  Sélectionner un scénario
                </option>
                {scenarios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
          ) : (
            <button
              onClick={onRequestCreateScenario}
              className="inline-flex items-center justify-center px-3 py-1.5 rounded text-xs font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Créer un scénario
            </button>
          )}
        </div>
      )}

      {filteredRootNodes.length === 0 && compositeSections.length === 0 && (
        <div className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-8 border border-zinc-200 dark:border-zinc-800 rounded">
          Aucun nœud réglable disponible.
          <br />
          Créez des nœuds API ou des nœuds d&apos;entrée.
        </div>
      )}

      {filteredRootNodes.length > 0 &&
        filteredRootNodes.map((node) => renderCard(node))}

      {compositeSections.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-dashed border-zinc-200 dark:border-zinc-800">
          <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-2">
            <Layers className="h-4 w-4 text-amber-600" />
            Composites utilisés
          </h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Visualisez les paramètres internes des composites présents dans ce projet.
            Les paramètres déjà liés à un nœud du projet peuvent être ajustés directement ci-dessous.
          </p>
          {compositeSections.map(({ composite, params }) => (
            <div
              key={composite.id}
              className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/30 p-3 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                    {composite.label}
                  </div>
                  <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                    {composite.slug || composite.id}
                  </div>
                </div>
                <div className="text-[11px] text-amber-600 dark:text-amber-300 flex items-center gap-1">
                  <Layers className="h-3 w-3" />
                  {params.length} paramètres
                </div>
              </div>
              <div className="space-y-2">
                {params.map((param) => {
                  if (param.node) {
                    return renderCard(param.node, {
                      parentCompositeLabel: composite.label,
                      parameterLabel:
                        param.meta?.label || param.meta?.slug || param.meta?.id,
                    });
                  }
                  const virtualNode = makeVirtualNodeFromParam(
                    param,
                    projectId
                  );
                  return renderCard(virtualNode, {
                    parentCompositeLabel: composite.label,
                    parameterLabel:
                      param.meta?.label || param.meta?.slug || param.rawId,
                    overrideKey: param.overrideKey,
                    overrideTarget: {
                      type: "composite",
                      compositeNodeId: param.compositeNodeId,
                      rawInternalId: param.rawId,
                    },
                    isVirtual: true,
                  });
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
