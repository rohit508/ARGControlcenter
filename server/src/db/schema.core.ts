import { sqliteTable, text, integer, real, primaryKey, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// NOTE ON MONEY FIELDS: stored as `real` (float) for this build. This is a known, intentional
// simplification for the initial vertical slice — real financial modules should store money as
// integer minor units (cents) or use a decimal library to avoid floating-point rounding. Flagged
// here and in the final delivery notes, not silently swept under the rug.

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
};

// =========================== CORE PLATFORM =================================

export const roles = sqliteTable("roles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  description: text("description"),
});

export const permissions = sqliteTable(
  "permissions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    module: text("module").notNull(),
    action: text("action").notNull(),
  },
  (t) => ({ uniq: uniqueIndex("permissions_module_action_uq").on(t.module, t.action) })
);

export const rolePermissions = sqliteTable(
  "role_permissions",
  {
    roleId: integer("role_id").notNull().references(() => roles.id),
    permissionId: integer("permission_id").notNull().references(() => permissions.id),
  },
  (t) => ({ pk: primaryKey({ columns: [t.roleId, t.permissionId] }) })
);

export const departments = sqliteTable("departments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  parentId: integer("parent_id"),
});

export const employees = sqliteTable("employees", {
  id: integer("id").primaryKey({ autoIncrement: true }),
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
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
  ...timestamps,
});

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  contactType: text("contact_type").notNull().default("internal"), // internal | client | vendor
  employeeId: integer("employee_id").references(() => employees.id),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  lastLoginAt: integer("last_login_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const userRoles = sqliteTable(
  "user_roles",
  {
    userId: integer("user_id").notNull().references(() => users.id),
    roleId: integer("role_id").notNull().references(() => roles.id),
  },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.roleId] }) })
);

export const refreshTokens = sqliteTable("refresh_tokens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  tokenHash: text("token_hash").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  revokedAt: integer("revoked_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const auditLog = sqliteTable(
  "audit_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").references(() => users.id),
    entityType: text("entity_type").notNull(),
    entityId: integer("entity_id").notNull(),
    action: text("action").notNull(),
    beforeJson: text("before_json"),
    afterJson: text("after_json"),
    ipAddress: text("ip_address"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({ entityIdx: index("audit_entity_idx").on(t.entityType, t.entityId) })
);

export const attachments = sqliteTable(
  "attachments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({ entityIdx: index("attachments_entity_idx").on(t.entityType, t.entityId), commentIdx: index("attachments_comment_idx").on(t.commentId) })
);

export const comments = sqliteTable(
  "comments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    entityType: text("entity_type").notNull(),
    entityId: integer("entity_id").notNull(),
    userId: integer("user_id").notNull().references(() => users.id),
    body: text("body").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({ entityIdx: index("comments_entity_idx").on(t.entityType, t.entityId) })
);

export const notifications = sqliteTable(
  "notifications",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull().references(() => users.id),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    link: text("link"),
    isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({ userIdx: index("notifications_user_idx").on(t.userId, t.isRead) })
);

export const workflowDefinitions = sqliteTable("workflow_definitions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  entityType: text("entity_type").notNull(),
  stepsJson: text("steps_json").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const workflowInstances = sqliteTable(
  "workflow_instances",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workflowDefinitionId: integer("workflow_definition_id").notNull().references(() => workflowDefinitions.id),
    entityType: text("entity_type").notNull(),
    entityId: integer("entity_id").notNull(),
    currentStep: integer("current_step").notNull().default(1),
    status: text("status").notNull().default("pending"),
    enteredStepAt: integer("entered_step_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    ...timestamps,
  },
  (t) => ({ entityIdx: index("workflow_instances_entity_idx").on(t.entityType, t.entityId) })
);

export const workflowActions = sqliteTable("workflow_actions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workflowInstanceId: integer("workflow_instance_id").notNull().references(() => workflowInstances.id),
  step: integer("step").notNull(),
  action: text("action").notNull(),
  actorUserId: integer("actor_user_id").notNull().references(() => users.id),
  comment: text("comment"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const lookupLists = sqliteTable("lookup_lists", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  label: text("label").notNull(),
});

export const lookupValues = sqliteTable(
  "lookup_values",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    lookupListId: integer("lookup_list_id").notNull().references(() => lookupLists.id),
    value: text("value").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  },
  (t) => ({ uniq: uniqueIndex("lookup_values_uq").on(t.lookupListId, t.value) })
);
