export const compareWindowConfig = {
  "7d": { days: 7, label: "7d", title: "Ultimos 7 dias" },
  "30d": { days: 30, label: "30d", title: "Ultimos 30 dias" },
} as const;

export type CompareWindowKey = keyof typeof compareWindowConfig;

export const DEFAULT_COMPARE_WINDOW: CompareWindowKey = "7d";
export const WEEKLY_SNAPSHOT_DAYS = 7;
export const TOP_PRODUCTS_LIMIT = 5;
export const WEEKLY_TOP_PRODUCTS_LIMIT = 1;
export const LOW_STOCK_ALERT_LIMIT = 5;
export const LOW_STOCK_RECENT_DAYS = 30;
export const LOW_STOCK_THRESHOLD = 5;
