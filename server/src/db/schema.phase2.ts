import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { employees, users } from "./schema.core";
import { projects } from "./schema.pmo";

const ts = () => ({
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// ================================================================ CRM =====

export const customers = sqliteTable(
  "customers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    customerCode: text("customer_code").notNull().unique(),
    name: text("name").notNull(),
    industry: text("industry"),
    website: text("website"),
    accountOwnerId: integer("account_owner_id").references(() => employees.id),
    status: text("status").notNull().default("Active"), // Active | Inactive
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
    ...ts(),
  },
  (t) => ({ ownerIdx: index("customers_owner_idx").on(t.accountOwnerId) })
);

export const contacts = sqliteTable(
  "contacts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    customerId: integer("customer_id").references(() => customers.id),
    fullName: text("full_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    jobTitle: text("job_title"),
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({ custIdx: index("contacts_customer_idx").on(t.customerId) })
);

export const leads = sqliteTable(
  "leads",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    leadCode: text("lead_code").notNull().unique(),
    companyName: text("company_name").notNull(),
    contactName: text("contact_name"),
    email: text("email"),
    phone: text("phone"),
    source: text("source"),
    status: text("status").notNull().default("New"),
    ownerId: integer("owner_id").references(() => employees.id),
    convertedCustomerId: integer("converted_customer_id").references(() => customers.id),
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({ ownerIdx: index("leads_owner_idx").on(t.ownerId) })
);

export const opportunities = sqliteTable(
  "opportunities",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    opportunityCode: text("opportunity_code").notNull().unique(),
    customerId: integer("customer_id").references(() => customers.id),
    name: text("name").notNull(),
    stage: text("stage").notNull().default("Qualification"),
    amount: real("amount").notNull().default(0),
    probability: integer("probability").notNull().default(20),
    expectedCloseDate: text("expected_close_date"),
    ownerId: integer("owner_id").references(() => employees.id),
    linkedProjectId: integer("linked_project_id").references(() => projects.id),
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({ custIdx: index("opportunities_customer_idx").on(t.customerId), ownerIdx: index("opportunities_owner_idx").on(t.ownerId) })
);

// ============================================================= FINANCE ====

export const chartOfAccounts = sqliteTable("chart_of_accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountCode: text("account_code").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  parentAccountId: integer("parent_account_id"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});

export const journalEntries = sqliteTable(
  "journal_entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    entryCode: text("entry_code").notNull().unique(),
    entryDate: text("entry_date").notNull(),
    memo: text("memo"),
    projectId: integer("project_id").references(() => projects.id),
    postedBy: integer("posted_by").references(() => users.id),
    status: text("status").notNull().default("Posted"),
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({ dateIdx: index("journal_entries_date_idx").on(t.entryDate) })
);

export const journalLines = sqliteTable(
  "journal_lines",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    journalEntryId: integer("journal_entry_id").notNull().references(() => journalEntries.id),
    accountId: integer("account_id").notNull().references(() => chartOfAccounts.id),
    debit: real("debit").notNull().default(0),
    credit: real("credit").notNull().default(0),
    description: text("description"),
  },
  (t) => ({ entryIdx: index("journal_lines_entry_idx").on(t.journalEntryId), acctIdx: index("journal_lines_account_idx").on(t.accountId) })
);

// =========================================================== PROCUREMENT ==

export const vendors = sqliteTable("vendors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  vendorCode: text("vendor_code").notNull().unique(),
  name: text("name").notNull(),
  category: text("category"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  status: text("status").notNull().default("Active"),
  rating: real("rating"),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const purchaseOrders = sqliteTable(
  "purchase_orders",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    poNumber: text("po_number").notNull().unique(),
    vendorId: integer("vendor_id").notNull().references(() => vendors.id),
    projectId: integer("project_id").references(() => projects.id),
    status: text("status").notNull().default("Draft"),
    totalAmount: real("total_amount").notNull().default(0),
    orderDate: text("order_date").notNull(),
    expectedDate: text("expected_date"),
    workflowInstanceId: integer("workflow_instance_id"),
    requestedBy: integer("requested_by").references(() => employees.id),
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({ vendorIdx: index("po_vendor_idx").on(t.vendorId), projectIdx: index("po_project_idx").on(t.projectId) })
);

export const poLines = sqliteTable("po_lines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  purchaseOrderId: integer("purchase_order_id").notNull().references(() => purchaseOrders.id),
  description: text("description").notNull(),
  quantity: real("quantity").notNull().default(1),
  unitPrice: real("unit_price").notNull().default(0),
  lineTotal: real("line_total").notNull().default(0),
});

// ===================================================================== HR ==

export const leaveRequests = sqliteTable(
  "leave_requests",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    leaveCode: text("leave_code").notNull().unique(),
    employeeId: integer("employee_id").notNull().references(() => employees.id),
    leaveType: text("leave_type").notNull(),
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    status: text("status").notNull().default("Pending"),
    approvedBy: integer("approved_by").references(() => employees.id),
    reason: text("reason"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({ empIdx: index("leave_employee_idx").on(t.employeeId) })
);

export const attendanceRecords = sqliteTable(
  "attendance_records",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    employeeId: integer("employee_id").notNull().references(() => employees.id),
    date: text("date").notNull(),
    status: text("status").notNull().default("Present"),
    checkIn: text("check_in"),
    checkOut: text("check_out"),
  },
  (t) => ({ uniq: uniqueIndex("attendance_uq").on(t.employeeId, t.date) })
);
