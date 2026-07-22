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
    sortBy?: "orderCount" | "revenue" | "unitsSold";
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
 * Daily sales trend tool output
 */
export interface DailySalesTrendOutput {
  peakDay?: {
    day: string;
    orderCount: number;
    revenue: number;
  };
  trend: Array<{
    day: string;
    orderCount: number;
    revenue: number;
  }>;
  summary: {
    averageOrderValue: number;
    currency?: string;
    orderCount: number;
    revenue: number;
    unitsSold: number;
  };
  window?: {
    days?: number;
    endDate?: string;
    startDate?: string;
  };
}

/**
 * Monthly sales trend tool output
 */
export interface MonthlyTrendOutput {
  comparison: {
    averageOrderValue: { current: number; previous: number };
    currency?: string;
    orderCount: { current: number; previous: number };
    revenue: { current: number; previous: number };
    unitsSold: { current: number; previous: number };
  };
  peakDay?: {
    day: string;
    orderCount: number;
    revenue: number;
  };
  summary: {
    averageOrderValue: number;
    currency?: string;
    orderCount: number;
    revenue: number;
    unitsSold: number;
  };
  trend: Array<{
    day: string;
    orderCount: number;
    revenue: number;
  }>;
  window?: {
    days?: number;
    endDate?: string;
    startDate?: string;
  };
  previousWindow?: {
    endDate?: string;
    startDate?: string;
  };
}

/**
 * Next week priorities tool output
 */
export interface NextWeekPrioritiesOutput {
  lowStockOpportunities: Array<{
    name: string;
    recentUnitsSold: number;
    sku?: string;
    stock: number;
  }>;
  summary: {
    averageOrderValue: number;
    currency?: string;
    orderCount: number;
    revenue: number;
    unitsSold: number;
  };
  topProducts: Array<{
    name: string;
    orderCount: number;
    revenue: number;
    unitsSold: number;
  }>;
  window?: {
    days?: number;
    label: string;
  };
}

/**
 * Union of all possible tool outputs
 */
export type ToolOutput =
  | ComparePeriodsOutput
  | SalesSummaryOutput
  | DailySalesTrendOutput
  | MonthlyTrendOutput
  | TopProductsOutput
  | WeeklySnapshotOutput
  | NextWeekPrioritiesOutput
  | LowStockOutput;
