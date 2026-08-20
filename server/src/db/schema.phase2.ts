import { pgTable, text, integer, real, timestamp, boolean, serial, index, uniqueIndex } from "drizzle-orm/pg-core";
import { employees, users } from "./schema.core";
import { projects } from "./schema.pmo";

const ts = () => ({
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

// ================================================================ CRM =====

export const customers = pgTable(
  "customers",
  {
    id: serial("id").primaryKey(),
    customerCode: text("customer_code").notNull().unique(),
    name: text("name").notNull(),
    industry: text("industry"),
    website: text("website"),
    accountOwnerId: integer("account_owner_id").references(() => employees.id),
    status: text("status").notNull().default("Active"), // Active | Inactive
    deletedAt: timestamp("deleted_at", { mode: "date" }),
    ...ts(),
  },
  (t) => ({ ownerIdx: index("customers_owner_idx").on(t.accountOwnerId) })
);

export const contacts = pgTable(
  "contacts",
  {
    id: serial("id").primaryKey(),
    customerId: integer("customer_id").references(() => customers.id),
    fullName: text("full_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    jobTitle: text("job_title"),
    deletedAt: timestamp("deleted_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({ custIdx: index("contacts_customer_idx").on(t.customerId) })
);

export const leads = pgTable(
  "leads",
  {
    id: serial("id").primaryKey(),
    leadCode: text("lead_code").notNull().unique(),
    companyName: text("company_name").notNull(),
    contactName: text("contact_name"),
    email: text("email"),
    phone: text("phone"),
    source: text("source"),
    status: text("status").notNull().default("New"),
    ownerId: integer("owner_id").references(() => employees.id),
    convertedCustomerId: integer("converted_customer_id").references(() => customers.id),
    deletedAt: timestamp("deleted_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({ ownerIdx: index("leads_owner_idx").on(t.ownerId) })
);

export const opportunities = pgTable(
  "opportunities",
  {
    id: serial("id").primaryKey(),
    opportunityCode: text("opportunity_code").notNull().unique(),
    customerId: integer("customer_id").references(() => customers.id),
    name: text("name").notNull(),
    stage: text("stage").notNull().default("Qualification"),
    amount: real("amount").notNull().default(0),
    probability: integer("probability").notNull().default(20),
    expectedCloseDate: text("expected_close_date"),
    ownerId: integer("owner_id").references(() => employees.id),
    linkedProjectId: integer("linked_project_id").references(() => projects.id),
    deletedAt: timestamp("deleted_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({ custIdx: index("opportunities_customer_idx").on(t.customerId), ownerIdx: index("opportunities_owner_idx").on(t.ownerId) })
);

// ============================================================= FINANCE ====

export const chartOfAccounts = pgTable("chart_of_accounts", {
  id: serial("id").primaryKey(),
  accountCode: text("account_code").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  parentAccountId: integer("parent_account_id"),
  isActive: boolean("is_active").notNull().default(true),
});

export const journalEntries = pgTable(
  "journal_entries",
  {
    id: serial("id").primaryKey(),
    entryCode: text("entry_code").notNull().unique(),
    entryDate: text("entry_date").notNull(),
    memo: text("memo"),
    projectId: integer("project_id").references(() => projects.id),
    postedBy: integer("posted_by").references(() => users.id),
    status: text("status").notNull().default("Posted"),
    deletedAt: timestamp("deleted_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({ dateIdx: index("journal_entries_date_idx").on(t.entryDate) })
);

export const journalLines = pgTable(
  "journal_lines",
  {
    id: serial("id").primaryKey(),
    journalEntryId: integer("journal_entry_id").notNull().references(() => journalEntries.id),
    accountId: integer("account_id").notNull().references(() => chartOfAccounts.id),
    debit: real("debit").notNull().default(0),
    credit: real("credit").notNull().default(0),
    description: text("description"),
  },
  (t) => ({ entryIdx: index("journal_lines_entry_idx").on(t.journalEntryId), acctIdx: index("journal_lines_account_idx").on(t.accountId) })
);

// =========================================================== PROCUREMENT ==

export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  vendorCode: text("vendor_code").notNull().unique(),
  name: text("name").notNull(),
  category: text("category"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  status: text("status").notNull().default("Active"),
  rating: real("rating"),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const purchaseOrders = pgTable(
  "purchase_orders",
  {
    id: serial("id").primaryKey(),
    poNumber: text("po_number").notNull().unique(),
    vendorId: integer("vendor_id").notNull().references(() => vendors.id),
    projectId: integer("project_id").references(() => projects.id),
    status: text("status").notNull().default("Draft"),
    totalAmount: real("total_amount").notNull().default(0),
    orderDate: text("order_date").notNull(),
    expectedDate: text("expected_date"),
    workflowInstanceId: integer("workflow_instance_id"),
    requestedBy: integer("requested_by").references(() => employees.id),
    deletedAt: timestamp("deleted_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({ vendorIdx: index("po_vendor_idx").on(t.vendorId), projectIdx: index("po_project_idx").on(t.projectId) })
);

export const poLines = pgTable("po_lines", {
  id: serial("id").primaryKey(),
  purchaseOrderId: integer("purchase_order_id").notNull().references(() => purchaseOrders.id),
  description: text("description").notNull(),
  quantity: real("quantity").notNull().default(1),
  unitPrice: real("unit_price").notNull().default(0),
  lineTotal: real("line_total").notNull().default(0),
});

// ===================================================================== HR ==

export const leaveRequests = pgTable(
  "leave_requests",
  {
    id: serial("id").primaryKey(),
    leaveCode: text("leave_code").notNull().unique(),
    employeeId: integer("employee_id").notNull().references(() => employees.id),
    leaveType: text("leave_type").notNull(),
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    status: text("status").notNull().default("Pending"),
    approvedBy: integer("approved_by").references(() => employees.id),
    reason: text("reason"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({ empIdx: index("leave_employee_idx").on(t.employeeId) })
);

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    id: serial("id").primaryKey(),
    employeeId: integer("employee_id").notNull().references(() => employees.id),
    date: text("date").notNull(),
    status: text("status").notNull().default("Present"),
    checkIn: text("check_in"),
    checkOut: text("check_out"),
  },
  (t) => ({ uniq: uniqueIndex("attendance_uq").on(t.employeeId, t.date) })
);
