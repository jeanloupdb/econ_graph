import { apiClient } from '@/lib/api/client';
// import { useGraphActions } from '@/graph/context/GraphActionsContext';
import { Scenario } from '@/lib/types';
import { useProjectStore } from '@/store/projectState';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

interface AiNodeDefinition {
  id: string;
  label?: string;
  slug?: string;
  type?: 'computed' | 'parameter' | 'composite';
  action?: 'create' | 'update' | 'delete';
  unit?: string;
  description?: string;
  code?: string;
  inputs?: string[];
  value?: number;
  pos_x?: number;
  pos_y?: number;
  composite_id?: string;
}

interface AiCompositeDefinition {
  id: string;
  name: string;
  description?: string;
  input_slugs: string[];
}

interface AiScenarioOverride {
  node_id: string;
  mode: 'value' | 'formula';
  value?: number;
  code?: string;
}

interface AiScenarioDefinition {
  id?: string;
  name: string;
  action?: 'create' | 'update' | 'delete';
  overrides: AiScenarioOverride[];
}

interface AiGraphActionResponse {
  project_name?: string;
  project_description?: string;
  composite_name?: string;
  composite_description?: string;
  nodes: AiNodeDefinition[];
  scenarios?: AiScenarioDefinition[];
  explanation?: string;
}

export function useAiGraphAction() {
  const [isPending, setIsPending] = useState(false);
  const currentProjectId = useProjectStore(s => s.currentProjectId);
  const { createProject } = useProjectStore();
  const router = useRouter();

  const execute = async (
    prompt: string, 
    context?: string, 
    currentNodes?: any[], 
    currentScenarios?: Scenario[],
    graphActions?: any,
    mode: 'project' | 'composite' = 'project',
    focusNodeIds: string[] = [],
    availableComposites: AiCompositeDefinition[] = [],
    onSuccess?: () => void
  ) => {
    setIsPending(true);
    try {
      // Map current nodes to AI context format
      const aiContextNodes = currentNodes?.map((n: any) => ({
        id: n.id,
        label: n.label,
        slug: n.slug,
        type: n.composite_id ? 'composite' : (n.computation_definition ? 'computed' : 'parameter'),
        unit: n.unit,
        description: n.notes,
        value: n.computation_definition?.match(/return\s+([\d.]+)/)?.[1] ? parseFloat(n.computation_definition.match(/return\s+([\d.]+)/)![1]) : undefined,
        code: n.computation_definition,
        composite_id: n.composite_id
      })) || [];

      // Map scenarios to AI context format
      const aiContextScenarios = currentScenarios?.map(s => ({
        id: s.id,
        name: s.name,
        action: 'create', // Default, though irrelevant for context
        overrides: s.overrides?.map((o: any) => ({
            node_id: o.node_id,
            mode: o.mode,
            value: o.override_value ?? undefined,
            code: o.override_code ?? undefined
        })) || []
      })) || [];

      const data = await apiClient.post<AiGraphActionResponse>('/ai/graph-action', { 
        prompt,
        context: context || 'dashboard',
        current_nodes: aiContextNodes,
        current_scenarios: aiContextScenarios,
        focus_node_ids: focusNodeIds,
        available_composites: availableComposites
      });
      
      // 0. Handle Project/Composite Creation if requested
      let targetProjectId = currentProjectId;
      let targetCompositeId: string | null = null;
      let isNewProject = false;
      let isNewComposite = false;
      
      if (mode === 'project' && data.project_name) {
        try {
          const newProject = await createProject(data.project_name);
          targetProjectId = newProject.id;
          isNewProject = true;
          toast.success(`Projet "${newProject.name}" créé !`);
          if (onSuccess) onSuccess();
        } catch (e) {
           console.error("Project creation failed", e);
           toast.error("Erreur lors de la création du projet");
           return;
        }
      } else if (context === 'new_composite' && data.composite_name) {
         try {
            // Build graph_data locally
            const nodesToCreate = data.nodes.filter(n => n.action === 'create' || !n.action);
            const generatedNodes: any[] = [];
            const generatedEdges: any[] = [];
            const slugToId: Record<string, string> = {};

            // 1. Generate IDs and Slugs first
            nodesToCreate.forEach(n => {
                const id = crypto.randomUUID();
                const label = n.label || n.id;
                const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
                slugToId[slug] = id;
                // Also map label just in case
                if (n.label) slugToId[n.label] = id; 
                (n as any)._generatedId = id;
                (n as any)._generatedSlug = slug;
            });

            // 2. Create Nodes and Edges
            nodesToCreate.forEach(n => {
                const id = (n as any)._generatedId;
                const slug = (n as any)._generatedSlug;
                
                let computation = n.code;
                
                // Sanitize code if present
                if (computation && /return\s+null/.test(computation)) {
                    computation = computation.replace(/return\s+null/g, 'return 0.0');
                }

                if (n.value !== undefined && n.value !== null) {
                    computation = `def compute():\n    return ${n.value}`;
                } else if (n.type === 'parameter' && !computation) {
                    // Default for parameter if no value provided
                    computation = `def compute():\n    return 0.0`;
                }

                // Create edges using explicit inputs from AI
                if (n.inputs && n.inputs.length > 0) {
                    n.inputs.forEach(inputId => {
                        // Find the real ID of the input node
                        // The inputId from AI is the temp ID (e.g. "n1")
                        // We need to find the node definition that has this temp ID
                        const inputNodeDef = nodesToCreate.find(def => def.id === inputId);
                        if (inputNodeDef) {
                            const sourceId = (inputNodeDef as any)._generatedId;
                            if (sourceId) {
                                generatedEdges.push({
                                    source: sourceId,
                                    target: id
                                });
                            }
                        }
                    });
                }

                generatedNodes.push({
                    id: id,
                    label: n.label,
                    slug: slug,
                    pos_x: n.pos_x ?? Math.random() * 500,
                    pos_y: n.pos_y ?? Math.random() * 500,
                    computation_definition: computation,
                    unit: n.unit,
                    notes: n.description,
                    value_computed: null // Initial state
                });
            });

            const payload = {
                name: data.composite_name,
                graph_data: {
                    nodes: generatedNodes,
                    edges: generatedEdges
                }
            };

            const newComposite = await apiClient.post<any>('/composites', payload);
            targetCompositeId = newComposite.id;
            isNewComposite = true;
            toast.success(`Composite "${newComposite.name}" créé !`);
            
            if (onSuccess) onSuccess();
            return; // Stop further processing

         } catch (e) {
            console.error("Composite creation failed", e);
            toast.error("Erreur lors de la création du composite");
            return;
         }
      }

      if (mode === 'project' && !targetProjectId) {
        toast.error("Impossible de créer des nœuds sans projet actif.");
        return;
      }

      // 1. Process Actions
      const nodesToCreate = data.nodes.filter(n => n.action === 'create' || !n.action);
      const nodesToUpdate = data.nodes.filter(n => n.action === 'update');
      const nodesToDelete = data.nodes.filter(n => n.action === 'delete');

      // Track changes to avoid conflicts
      const deletedNodeIds = new Set<string>();
      const tempIdToRealId = new Map<string, string>();

      // DELETE
      if (nodesToDelete.length > 0 && graphActions) {
        for (const node of nodesToDelete) {
          try {
            await graphActions.deleteNode(node.id);
            deletedNodeIds.add(node.id);
          } catch (e) {
            console.error(`Failed to delete node ${node.id}`, e);
          }
        }
        toast.success(`${nodesToDelete.length} nœuds supprimés.`);
      }

      // CREATE
      if (nodesToCreate.length > 0) {
        // 1. Separate parameters and computed nodes
        const parameters = nodesToCreate.filter(n => n.type === 'parameter');
        const computedNodes = nodesToCreate.filter(n => n.type !== 'parameter');

          // Helper to create node based on mode
        const createNodeHelper = async (nodeDef: AiNodeDefinition) => {
          const label = nodeDef.label || nodeDef.id;
          const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
          
          let computation = nodeDef.code;
          if (computation && /return\s+null/.test(computation)) {
              computation = computation.replace(/return\s+null/g, 'return 0.0');
          }

          const payload = {
            label: label,
            slug: slug,
            project_id: mode === 'project' ? targetProjectId : undefined,
            composite_id: nodeDef.composite_id || (targetCompositeId || undefined), // Use specific composite_id if provided (for composite node), else targetCompositeId (if creating new composite)
            pos_x: nodeDef.pos_x ?? Math.random() * 500,
            pos_y: nodeDef.pos_y ?? Math.random() * 500,
            computation_definition: (nodeDef.value !== undefined && nodeDef.value !== null)
                ? `def compute():\n    return ${nodeDef.value}`
                : computation,
            unit: nodeDef.unit,
            notes: nodeDef.description,
          };

          // If it's a composite node usage, ensure we don't send computation_definition
          if (nodeDef.type === 'composite' && nodeDef.composite_id) {
             delete (payload as any).computation_definition;
             // Also ensure we don't send provider stuff if any
          }

          let createdNode: any;
          if (mode === 'composite' && !isNewComposite) {
             // Editing existing composite locally
             createdNode = await graphActions.createNode(payload);
          } else {
             // Creating nodes via API (Project or New Composite)
             const res = await apiClient.post<any>('/nodes', payload);
             createdNode = res;
          }

          // Track temp ID to real ID mapping
          if (createdNode && createdNode.id) {
              tempIdToRealId.set(nodeDef.id, createdNode.id);
          }
        };

        // 2. Create all parameters first (no dependencies)
        for (const nodeDef of parameters) {
          await createNodeHelper(nodeDef);
        }

        // 3. Create computed nodes with multi-pass retry for dependencies
        let remaining = [...computedNodes];
        let progress = true;
        
        while (remaining.length > 0 && progress) {
          progress = false;
          const nextRemaining: AiNodeDefinition[] = [];

          for (const nodeDef of remaining) {
            try {
              await createNodeHelper(nodeDef);
              progress = true; 
            } catch (e: any) {
              // If error is 422 (dependency missing), keep for next pass
              if (e.status === 422 && (e.message?.includes('Dépendance inconnue') || e.detail?.includes('Dépendance inconnue'))) {
                nextRemaining.push(nodeDef);
              } else {
                console.error(`Failed to create node ${nodeDef.label}`, e);
                // In composite mode, local errors might not have status/detail structure
                if (mode === 'composite' && !isNewComposite) {
                   // For now, just retry blindly or fail
                   nextRemaining.push(nodeDef); 
                } else {
                   toast.error(`Erreur création nœud ${nodeDef.label}: ${e.message || 'Inconnue'}`);
                }
              }
            }
          }
          remaining = nextRemaining;
        }

        if (remaining.length > 0) {
          console.warn("Some nodes could not be created due to circular or missing dependencies", remaining);
          toast.warning(`${remaining.length} nœuds n'ont pas pu être créés (dépendances manquantes).`);
        }
        
        if (nodesToCreate.length > 0) {
            toast.success(`${nodesToCreate.length} nœuds créés.`);
        }
      }

      // UPDATE
      if (nodesToUpdate.length > 0 && graphActions) {
        let updateCount = 0;
        for (const node of nodesToUpdate) {
          // Skip if deleted
          if (deletedNodeIds.has(node.id)) continue;

          // Resolve ID (handle temp IDs)
          const targetId = tempIdToRealId.get(node.id) || node.id;

          try {
            const updatePayload: any = {};
            if (node.label) updatePayload.label = node.label;
            if (node.unit) updatePayload.unit = node.unit;
            if (node.description) updatePayload.notes = node.description;
            
            // Update computation if provided
            if (node.type === 'parameter' && node.value !== undefined && node.value !== null) {
               updatePayload.computation_definition = `def compute():\n    return ${node.value}`;
            } else if (node.type === 'computed' && node.code) {
               let cleanCode = node.code;
               if (cleanCode.includes('return null')) {
                   cleanCode = cleanCode.replace('return null', 'return 0.0');
               }
               updatePayload.computation_definition = cleanCode;
            }

            await graphActions.updateNode(targetId, updatePayload);
            updateCount++;
          } catch (e: any) {
            // Ignore "Node not found" errors silently or with warning, as it might be an AI hallucination
            if (e.message === "Node not found" || e.message?.includes("not found")) {
                console.warn(`Skipping update for non-existent node ${targetId}`);
            } else {
                console.error(`Failed to update node ${targetId}`, e);
            }
          }
        }
        if (updateCount > 0) {
            toast.success(`${updateCount} nœuds mis à jour.`);
        }
      }

      // Recompute graph to update values
      if (mode === 'project' && graphActions?.computeProject) {
        await graphActions.computeProject();
      } else if (mode === 'composite' && graphActions?.computeNode) {
         if (graphActions.refreshNodes) graphActions.refreshNodes();
      }

      // 2. Process Scenarios
      if (data.scenarios && data.scenarios.length > 0) {
        for (const scenario of data.scenarios) {
          try {
            if (scenario.action === 'create' || !scenario.action) {
              // Create Scenario
              const newScenario = await apiClient.post<any>(`/api/projects/${currentProjectId}/scenarios`, {
                name: scenario.name,
                color: '#3B82F6'
              });
              
              // Apply Overrides
              if (scenario.overrides && scenario.overrides.length > 0) {
                const overridesPayload = scenario.overrides.map(o => ({
                  node_id: o.node_id,
                  mode: o.mode,
                  override_value: o.value,
                  override_code: o.code
                }));
                
                await apiClient.put(`/api/scenarios/${newScenario.id}/overrides`, {
                  overrides: overridesPayload
                });
              }
              toast.success(`Scénario "${scenario.name}" créé.`);
              
            } else if (scenario.action === 'delete') {
               // Delete Scenario
               if (scenario.id) {
                   await apiClient.delete(`/api/scenarios/${scenario.id}`);
                   toast.success(`Scénario "${scenario.name}" supprimé.`);
               } else {
                   console.warn("Cannot delete scenario without ID");
               }
            }
          } catch (e) {
            console.error(`Failed to process scenario ${scenario.name}`, e);
            toast.error(`Erreur scénario ${scenario.name}`);
          }
        }
        
      }

      // Always refresh scenarios if in project mode, to ensure UI is in sync
      if (mode === 'project' && graphActions?.refreshScenarios) {
          await graphActions.refreshScenarios();
      }

      if (onSuccess) onSuccess();
      
      return data.explanation;

    } catch (error) {
      console.error(error);
      toast.error("Une erreur est survenue lors de la génération.");
    } finally {
      setIsPending(false);
    }
  };

  return { execute, isPending };
}
