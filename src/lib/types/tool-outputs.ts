/**
 * Compare periods tool output
 */
export interface ComparePeriodsOutput {
  comparison: {
    revenue: { current: number; previous: number };
    orderCount: { current: number; previous: number };
    unitsSold: { current: number; previous: number };
    averageOrderValue: { current: number; previous: number };
    currency?: string;
  };
  currentWindow?: {
    label: string;
    startDate?: string;
    endDate?: string;
  };
  previousWindow?: {
    label: string;
    startDate?: string;
    endDate?: string;
  };
}

/**
 * Sales summary tool output
 */
export interface SalesSummaryOutput {
  summary: {
    revenue: number;
    orderCount: number;
    unitsSold: number;
    averageOrderValue: number;
    currency?: string;
  };
  window?: {
    startDate?: string;
    endDate?: string;
    days?: number;
  };
}

/**
 * Top products tool output
 */
export interface TopProductsOutput {
  products: Array<{
    name: string;
    unitsSold: number;
    revenue: number;
    orderCount: number;
  }>;
  summary?: {
    revenue: number;
    currency?: string;
  };
  window?: {
    startDate?: string;
    endDate?: string;
    days?: number;
  };
}

/**
 * Weekly snapshot tool output
 */
export interface WeeklySnapshotOutput {
  summary?: {
    summary: {
      revenue: number;
      orderCount: number;
      averageOrderValue: number;
      unitsSold: number;
      currency?: string;
    };
  };
  comparison?: {
    comparison: {
      revenue: { current: number; previous: number };
    };
  };
  window?: {
    label: string;
  };
}

/**
 * Low stock opportunities tool output
 */
export interface LowStockOutput {
  opportunities: Array<{
    name: string;
    sku?: string;
    stock: number;
    recentUnitsSold: number;
  }>;
  window?: {
    stockThreshold: number;
  };
}

/**
 * Union of all possible tool outputs
 */
export type ToolOutput =
  | ComparePeriodsOutput
  | SalesSummaryOutput
  | TopProductsOutput
  | WeeklySnapshotOutput
  | LowStockOutput;
