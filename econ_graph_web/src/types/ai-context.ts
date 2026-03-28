export type AiContextType = "parameter" | "calculation" | "result";

export type AiTargetKind = "node" | "node-field" | "section";

export type AiTargetField = "value" | "notes" | "formula";

export interface AiContextTarget {
  kind: AiTargetKind;
  id: string;
  field?: AiTargetField;
}

export interface AiContextInfo {
  label: string;
  type: AiContextType;
  target?: AiContextTarget;
}

export interface AiFocusTarget {
  contextType: AiContextType;
  target: AiContextTarget;
}

export function getAiTargetKey(target: AiContextTarget): string {
  return `${target.kind}:${target.id}${target.field ? `:${target.field}` : ""}`;
}
