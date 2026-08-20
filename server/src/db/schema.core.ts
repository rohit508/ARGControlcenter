import { pgTable, text, integer, real, timestamp, boolean, serial, primaryKey, uniqueIndex, index } from "drizzle-orm/pg-core";

// NOTE ON MONEY FIELDS: stored as `real` (float) for this build. This is a known, intentional
// simplification for the initial vertical slice — real financial modules should store money as
// integer minor units (cents) or use a decimal library to avoid floating-point rounding. Flagged
// here and in the final delivery notes, not silently swept under the rug.

const timestamps = {
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
};

// =========================== CORE PLATFORM =================================

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
});

export const permissions = pgTable(
  "permissions",
  {
    id: serial("id").primaryKey(),
    module: text("module").notNull(),
    action: text("action").notNull(),
  },
  (t) => ({ uniq: uniqueIndex("permissions_module_action_uq").on(t.module, t.action) })
);

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: integer("role_id").notNull().references(() => roles.id),
    permissionId: integer("permission_id").notNull().references(() => permissions.id),
  },
  (t) => ({ pk: primaryKey({ columns: [t.roleId, t.permissionId] }) })
);

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  parentId: integer("parent_id"),
});

export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  employeeCode: text("employee_code").notNull().unique(),
  fullName: text("full_name").notNull(),
  roleTitle: text("role_title"),
  departmentId: integer("department_id").references(() => departments.id),
  managerId: integer("manager_id"),
  email: text("email"),
  location: text("location"),
  costRate: real("cost_rate").default(0),
  capacityHoursPerMonth: real("capacity_hours_per_month").default(160),
  skill: text("skill"),
  status: text("status").notNull().default("Active"),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
  ...timestamps,
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  contactType: text("contact_type").notNull().default("internal"), // internal | client | vendor
  employeeId: integer("employee_id").references(() => employees.id),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const userRoles = pgTable(
  "user_roles",
  {
    userId: integer("user_id").notNull().references(() => users.id),
    roleId: integer("role_id").notNull().references(() => roles.id),
  },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.roleId] }) })
);

export const refreshTokens = pgTable("refresh_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  revokedAt: timestamp("revoked_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const auditLog = pgTable(
  "audit_log",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id),
    entityType: text("entity_type").notNull(),
    entityId: integer("entity_id").notNull(),
    action: text("action").notNull(),
    beforeJson: text("before_json"),
    afterJson: text("after_json"),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({ entityIdx: index("audit_entity_idx").on(t.entityType, t.entityId) })
);

export const attachments = pgTable(
  "attachments",
  {
    id: serial("id").primaryKey(),
    entityType: text("entity_type").notNull(),
    entityId: integer("entity_id").notNull(),
    // Optional link to a specific comment (e.g. a voice note recorded inline in a discussion
    // thread) — null for attachments uploaded against the entity itself, not a single message.
    commentId: integer("comment_id").references(() => comments.id),
    fileName: text("file_name").notNull(),
    filePath: text("file_path").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    uploadedBy: integer("uploaded_by").notNull().references(() => users.id),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({ entityIdx: index("attachments_entity_idx").on(t.entityType, t.entityId), commentIdx: index("attachments_comment_idx").on(t.commentId) })
);

export const comments = pgTable(
  "comments",
  {
    id: serial("id").primaryKey(),
    entityType: text("entity_type").notNull(),
    entityId: integer("entity_id").notNull(),
    userId: integer("user_id").notNull().references(() => users.id),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({ entityIdx: index("comments_entity_idx").on(t.entityType, t.entityId) })
);

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    link: text("link"),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => ({ userIdx: index("notifications_user_idx").on(t.userId, t.isRead) })
);

export const workflowDefinitions = pgTable("workflow_definitions", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  entityType: text("entity_type").notNull(),
  stepsJson: text("steps_json").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const workflowInstances = pgTable(
  "workflow_instances",
  {
    id: serial("id").primaryKey(),
    workflowDefinitionId: integer("workflow_definition_id").notNull().references(() => workflowDefinitions.id),
    entityType: text("entity_type").notNull(),
    entityId: integer("entity_id").notNull(),
    currentStep: integer("current_step").notNull().default(1),
    status: text("status").notNull().default("pending"),
    enteredStepAt: timestamp("entered_step_at", { mode: "date" }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => ({ entityIdx: index("workflow_instances_entity_idx").on(t.entityType, t.entityId) })
);

export const workflowActions = pgTable("workflow_actions", {
  id: serial("id").primaryKey(),
  workflowInstanceId: integer("workflow_instance_id").notNull().references(() => workflowInstances.id),
  step: integer("step").notNull(),
  action: text("action").notNull(),
  actorUserId: integer("actor_user_id").notNull().references(() => users.id),
  comment: text("comment"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const lookupLists = pgTable("lookup_lists", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  label: text("label").notNull(),
});

export const lookupValues = pgTable(
  "lookup_values",
  {
    id: serial("id").primaryKey(),
    lookupListId: integer("lookup_list_id").notNull().references(() => lookupLists.id),
    value: text("value").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => ({ uniq: uniqueIndex("lookup_values_uq").on(t.lookupListId, t.value) })
);
