import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const stores = pgTable("stores", {
  id: uuid("id").defaultRandom().primaryKey(),
  tiendanubeStoreId: text("tiendanube_store_id").notNull().unique(),
  name: text("name"),
  country: text("country"),
  currency: text("currency"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const storeConnections = pgTable("store_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  accessTokenEncrypted: text("access_token_encrypted").notNull(),
  scopes: text("scopes").array(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  storeIdIdx: index("store_connections_store_id_idx").on(table.storeId),
}));

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  tiendanubeProductId: text("tiendanube_product_id").notNull(),
  name: text("name"),
  handle: text("handle"),
  published: boolean("published"),
  raw: jsonb("raw"),
}, (table) => ({
  storeIdIdx: index("products_store_id_idx").on(table.storeId),
  storeProductUnique: uniqueIndex("products_store_id_tiendanube_product_id_uidx").on(
    table.storeId,
    table.tiendanubeProductId,
  ),
}));

export const productVariants = pgTable("product_variants", {
  id: uuid("id").defaultRandom().primaryKey(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  tiendanubeVariantId: text("tiendanube_variant_id").notNull(),
  sku: text("sku"),
  price: numeric("price", { precision: 12, scale: 2 }),
  stock: integer("stock"),
  raw: jsonb("raw"),
}, (table) => ({
  storeIdIdx: index("product_variants_store_id_idx").on(table.storeId),
  productIdIdx: index("product_variants_product_id_idx").on(table.productId),
  storeVariantUnique: uniqueIndex("product_variants_store_id_tiendanube_variant_id_uidx").on(
    table.storeId,
    table.tiendanubeVariantId,
  ),
}));

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  tiendanubeOrderId: text("tiendanube_order_id").notNull(),
  orderNumber: text("order_number"),
  status: text("status"),
  paymentStatus: text("payment_status"),
  shippingStatus: text("shipping_status"),
  total: numeric("total", { precision: 12, scale: 2 }),
  currency: text("currency"),
  createdAtTiendanube: timestamp("created_at_tiendanube", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  customerId: uuid("customer_id"),
  raw: jsonb("raw"),
}, (table) => ({
  storeIdIdx: index("orders_store_id_idx").on(table.storeId),
  customerIdIdx: index("orders_customer_id_idx").on(table.customerId),
  createdAtTiendanubeIdx: index("orders_created_at_tiendanube_idx").on(table.createdAtTiendanube),
  storeOrderUnique: uniqueIndex("orders_store_id_tiendanube_order_id_uidx").on(
    table.storeId,
    table.tiendanubeOrderId,
  ),
}));

export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  productName: text("product_name"),
  quantity: integer("quantity").notNull().default(0),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }),
  totalPrice: numeric("total_price", { precision: 12, scale: 2 }),
}, (table) => ({
  storeIdIdx: index("order_items_store_id_idx").on(table.storeId),
  orderIdIdx: index("order_items_order_id_idx").on(table.orderId),
}));

export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  tiendanubeCustomerId: text("tiendanube_customer_id").notNull(),
  name: text("name"),
  emailHash: text("email_hash"),
  phoneHash: text("phone_hash"),
  raw: jsonb("raw"),
}, (table) => ({
  storeIdIdx: index("customers_store_id_idx").on(table.storeId),
  storeCustomerUnique: uniqueIndex("customers_store_id_tiendanube_customer_id_uidx").on(
    table.storeId,
    table.tiendanubeCustomerId,
  ),
}));

export const syncJobs = pgTable("sync_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  status: text("status").notNull().default("pending"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"),
}, (table) => ({
  storeIdIdx: index("sync_jobs_store_id_idx").on(table.storeId),
  statusIdx: index("sync_jobs_status_idx").on(table.status),
}));

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  structuredPayload: jsonb("structured_payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  storeIdIdx: index("chat_messages_store_id_idx").on(table.storeId),
  createdAtIdx: index("chat_messages_created_at_idx").on(table.createdAt),
}));

export const aiToolCalls = pgTable("ai_tool_calls", {
  id: uuid("id").defaultRandom().primaryKey(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id, { onDelete: "cascade" }),
  chatMessageId: uuid("chat_message_id").references(() => chatMessages.id, { onDelete: "set null" }),
  toolName: text("tool_name").notNull(),
  arguments: jsonb("arguments"),
  resultSummary: jsonb("result_summary"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  storeIdIdx: index("ai_tool_calls_store_id_idx").on(table.storeId),
  chatMessageIdIdx: index("ai_tool_calls_chat_message_id_idx").on(table.chatMessageId),
  createdAtIdx: index("ai_tool_calls_created_at_idx").on(table.createdAt),
}));
