import { pgTable, text, integer, real, timestamp, boolean, serial, index, uniqueIndex } from "drizzle-orm/pg-core";
import { employees, users } from "./schema.core";
import { projects } from "./schema.pmo";
import { customers } from "./schema.phase2";

// ============================================================ INVENTORY ===

export const warehouses = pgTable("warehouses", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  location: text("location"),
  isActive: boolean("is_active").notNull().default(true),
});

export const stockItems = pgTable("stock_items", {
  id: serial("id").primaryKey(),
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  category: text("category"),
  unitOfMeasure: text("unit_of_measure").notNull().default("ea"),
  reorderPoint: real("reorder_point").notNull().default(0),
  standardCost: real("standard_cost").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

/** One row per (item, warehouse) — the current on-hand quantity. Never written directly by the
 *  API; only ever mutated by stock transactions (see inventory.service.ts) so there's a single
 *  audit trail for every quantity change instead of a number a client could overwrite directly. */
export const stockLevels = pgTable(
  "stock_levels",
  {
    id: serial("id").primaryKey(),
    stockItemId: integer("stock_item_id").notNull().references(() => stockItems.id),
    warehouseId: integer("warehouse_id").notNull().references(() => warehouses.id),
    quantityOnHand: real("quantity_on_hand").notNull().default(0),
  },
  (t) => ({ uniq: uniqueIndex("stock_levels_uq").on(t.stockItemId, t.warehouseId) })
);

/** Append-only ledger of every stock movement — receipts, issues, transfers, adjustments,
 *  cycle-count corrections. stock_levels.quantityOnHand is a materialized sum of this ledger. */
export const stockTransactions = pgTable(
  "stock_transactions",
  {
    id: serial("id").primaryKey(),
    stockItemId: integer("stock_item_id").notNull().references(() => stockItems.id),
    warehouseId: integer("warehouse_id").notNull().references(() => warehouses.id),
    type: text("type").notNull(), // Receipt | Issue | Transfer | Adjustment | CycleCount
    quantity: real("quantity").notNull(), // signed: positive = in, negative = out
    reference: text("reference"),
    performedBy: integer("performed_by").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({ itemIdx: index("stock_txn_item_idx").on(t.stockItemId, t.warehouseId) })
);

// ========================================================= MANUFACTURING ==

export const workCenters = pgTable("work_centers", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  capacityHoursPerDay: real("capacity_hours_per_day").notNull().default(8),
});

export const boms = pgTable("boms", {
  id: serial("id").primaryKey(),
  bomCode: text("bom_code").notNull().unique(),
  outputItemId: integer("output_item_id").notNull().references(() => stockItems.id),
  outputQuantity: real("output_quantity").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
});

export const bomLines = pgTable("bom_lines", {
  id: serial("id").primaryKey(),
  bomId: integer("bom_id").notNull().references(() => boms.id),
  componentItemId: integer("component_item_id").notNull().references(() => stockItems.id),
  quantityPerOutput: real("quantity_per_output").notNull(),
});

export const productionOrders = pgTable(
  "production_orders",
  {
    id: serial("id").primaryKey(),
    orderCode: text("order_code").notNull().unique(),
    bomId: integer("bom_id").notNull().references(() => boms.id),
    quantityPlanned: real("quantity_planned").notNull(),
    quantityCompleted: real("quantity_completed").notNull().default(0),
    warehouseId: integer("warehouse_id").notNull().references(() => warehouses.id),
    workCenterId: integer("work_center_id").references(() => workCenters.id),
    status: text("status").notNull().default("Planned"),
    scheduledStart: text("scheduled_start"),
    scheduledEnd: text("scheduled_end"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({ bomIdx: index("po_mfg_bom_idx").on(t.bomId) })
);

// ========================================================= ASSET MGMT =====

export const assets = pgTable(
  "assets",
  {
    id: serial("id").primaryKey(),
    assetCode: text("asset_code").notNull().unique(),
    name: text("name").notNull(),
    category: text("category"),
    purchaseDate: text("purchase_date").notNull(),
    purchaseCost: real("purchase_cost").notNull(),
    usefulLifeYears: real("useful_life_years").notNull().default(5),
    salvageValue: real("salvage_value").notNull().default(0),
    location: text("location"),
    assignedTo: integer("assigned_to").references(() => employees.id),
    projectId: integer("project_id").references(() => projects.id),
    status: text("status").notNull().default("Active"),
    deletedAt: timestamp("deleted_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({ assignedIdx: index("assets_assigned_idx").on(t.assignedTo) })
);

export const maintenanceLogs = pgTable(
  "maintenance_logs",
  {
    id: serial("id").primaryKey(),
    assetId: integer("asset_id").notNull().references(() => assets.id),
    scheduledDate: text("scheduled_date").notNull(),
    completedDate: text("completed_date"),
    type: text("type").notNull().default("Preventive"),
    cost: real("cost").notNull().default(0),
    notes: text("notes"),
    status: text("status").notNull().default("Scheduled"),
  },
  (t) => ({ assetIdx: index("maintenance_asset_idx").on(t.assetId) })
);

// ============================================================ HELP DESK ===

export const tickets = pgTable(
  "tickets",
  {
    id: serial("id").primaryKey(),
    ticketCode: text("ticket_code").notNull().unique(),
    subject: text("subject").notNull(),
    description: text("description"),
    customerId: integer("customer_id").references(() => customers.id),
    raisedBy: integer("raised_by").references(() => users.id),
    assignedTo: integer("assigned_to").references(() => employees.id),
    priority: text("priority").notNull().default("Medium"),
    status: text("status").notNull().default("Open"),
    slaHours: integer("sla_hours").notNull().default(48),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { mode: "date" }),
  },
  (t) => ({ statusIdx: index("tickets_status_idx").on(t.status), assignedIdx: index("tickets_assigned_idx").on(t.assignedTo) })
);

export const kbArticles = pgTable("kb_articles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  category: text("category"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});
