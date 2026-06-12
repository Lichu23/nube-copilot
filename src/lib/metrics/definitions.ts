export type MetricDefinition = {
  calculation: string;
  description: string;
  label: string;
  source: string;
};

export const metricDefinitions = {
  averageOrderValue: {
    calculation: "facturación neta ÷ cantidad de pedidos",
    description: "Valor promedio de cada pedido pagado en el período elegido.",
    label: "Ticket promedio",
    source: "orders.total",
  },
  grossProductSales: {
    calculation: "suma de totales de líneas de pedido",
    description: "Venta bruta atribuida a productos antes de conciliaciones del total final del pedido.",
    label: "Venta bruta de productos",
    source: "order_items.total_price",
  },
  lowStock: {
    calculation: "variantes con stock menor o igual al umbral configurado",
    description: "Productos o variantes que necesitan revisión por bajo stock.",
    label: "Stock bajo",
    source: "product_variants.stock",
  },
  netRevenue: {
    calculation: "suma de total de pedidos no cancelados",
    description: "Facturación tomada del total final de pedidos pagados/no cancelados.",
    label: "Facturación neta",
    source: "orders.total",
  },
  orderCount: {
    calculation: "conteo de pedidos no cancelados",
    description: "Cantidad de pedidos válidos incluidos en la ventana de análisis.",
    label: "Pedidos",
    source: "orders",
  },
  topProductsRevenue: {
    calculation: "suma de venta bruta por producto, ordenada de mayor a menor",
    description: "Ranking de productos según la facturación bruta de sus líneas de pedido.",
    label: "Facturación por producto",
    source: "order_items.total_price + products",
  },
  unitsSold: {
    calculation: "suma de cantidades vendidas en ítems de pedido",
    description: "Unidades totales vendidas dentro del período elegido.",
    label: "Unidades vendidas",
    source: "order_items.quantity",
  },
} satisfies Record<string, MetricDefinition>;
