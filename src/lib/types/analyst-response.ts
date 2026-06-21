/**
 * Tool execution result
 */
export interface ToolResult {
  input: unknown;
  output: unknown;
  toolCallId: string;
  toolName: string;
}

/**
 * Analyst response from AI
 */
export interface AnalystResponse {
  answer: string;
  evidence: Array<{
    metric: string;
    period?: string;
    value: unknown;
  }>;
  recommendedActions: string[];
  toolResults: ToolResult[];
}

/**
 * Metric definition for trust and calculation context
 */
export interface MetricDefinition {
  calculation: string;
  description: string;
  label: string;
  source: string;
}

/**
 * Metric item for display
 */
export interface MetricItem {
  definition?: MetricDefinition;
  helper?: string;
  label: string;
  value: string;
}

/**
 * Chart data point
 */
export interface ChartDatum {
  current: number;
  label: string;
  previous?: number;
}

/**
 * Chart model
 */
export interface ChartModel {
  currentLabel?: string;
  data: ChartDatum[];
  previousLabel?: string;
  title?: string;
  variant?: "comparison" | "metric-bars" | "ranking" | "risk";
}

export type CanvasVisualizationMode = "analysis" | "compact";

/**
 * Table model
 */
export interface TableModel {
  columns: string[];
  rows: string[][];
}

/**
 * Canvas model for analysis display
 */
export interface CanvasModel {
  chart: ChartModel | null;
  definitions?: MetricDefinition[];
  filters: string[];
  metrics: MetricItem[];
  visualizationMode?: CanvasVisualizationMode;
  source: string;
  summary: string;
  summaryPoints: string[];
  suggestedQuestions?: string[];
  table: TableModel | null;
  title: string;
  userQuestion: string;
  windowLabel: string;
}


export interface ChatMessage {
  id?: string;
  role: "user" | "assistant" | "system" | "tool";
  content?: string;
  text?: string;
  createdAt?: string; // ISO timestamp
  metadata?: Record<string, unknown>;
}
