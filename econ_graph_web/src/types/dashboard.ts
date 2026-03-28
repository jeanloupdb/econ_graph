// ─── V1 types (legacy) ────────────────────────────────────────────────────────
export type WidgetType = 'kpi' | 'bar_chart' | 'comparison' | 'line_chart' | 'explanation';
export type WidgetSize = 'sm' | 'md' | 'lg';

export interface KpiWidget {
  id: string; type: 'kpi'; title: string; node_slug: string; size?: WidgetSize;
}
export interface BarChartWidget {
  id: string; type: 'bar_chart'; title: string; node_slugs: string[]; labels?: string[];
}
export interface ComparisonWidget {
  id: string; type: 'comparison'; title: string; node_slug: string;
}
/** @deprecated use comparison instead */
export interface LineChartWidget {
  id: string; type: 'line_chart'; title: string; node_slug: string; compare_scenarios?: boolean;
}
export interface ExplanationWidget {
  id: string; type: 'explanation'; content: string;
}
export type DashboardWidget = KpiWidget | BarChartWidget | ComparisonWidget | LineChartWidget | ExplanationWidget;

export interface DashboardConfigV1 {
  widgets: DashboardWidget[];
}

// ─── V2 types — Control Panel Dashboard ───────────────────────────────────────

export type ControlType = 'slider' | 'toggle' | 'stepper' | 'text';
export type VizType = 'donut' | 'gauge' | 'bar_breakdown' | 'big_number' | 'pie' | 'grouped_bar' | 'horizontal_bar' | 'radar' | 'progress';

export interface ParameterControl {
  node_slug: string;
  label: string;
  control_type: ControlType;
  unit?: string;
  // slider
  min?: number;
  max?: number;
  step?: number;
  // toggle: maps boolean to numeric values
  value_off?: number;
  value_on?: number;
  // select/stepper
  options?: { label: string; value: number }[];
}

export interface ParameterGroup {
  id: string;
  title: string;
  controls: ParameterControl[];
}

export interface KpiVisualization {
  id: string;
  title: string;
  node_slug: string;           // primary node (single-value viz)
  node_slugs?: string[];       // multiple nodes (grouped_bar, horizontal_bar, radar)
  node_labels?: string[];      // labels for node_slugs items
  viz_type: VizType;
  // donut / bar_breakdown / pie: breakdown of what makes up the value
  breakdown_slugs?: string[];
  breakdown_labels?: string[];
  // gauge / progress: value range
  min?: number;
  max?: number;
  // visual accent
  color?: 'blue' | 'emerald' | 'violet' | 'amber' | 'rose';
  unit?: string;
}

export interface DashboardConfigV2 {
  version: 2;
  parameter_groups: ParameterGroup[];
  kpi_widgets: KpiVisualization[];
  insight?: string;
}

// Union: a dashboard_config can be v1 or v2
export type DashboardConfig = DashboardConfigV1 | DashboardConfigV2;

export function isDashboardV2(config: DashboardConfig): config is DashboardConfigV2 {
  return (config as DashboardConfigV2).version === 2;
}
