CREATE TABLE `attachments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` integer NOT NULL,
	`file_name` text NOT NULL,
	`file_path` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`uploaded_by` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `attachments_entity_idx` ON `attachments` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`entity_type` text NOT NULL,
	`entity_id` integer NOT NULL,
	`action` text NOT NULL,
	`before_json` text,
	`after_json` text,
	`ip_address` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `audit_entity_idx` ON `audit_log` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`body` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `comments_entity_idx` ON `comments` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `departments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`parent_id` integer
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`employee_code` text NOT NULL,
	`full_name` text NOT NULL,
	`role_title` text,
	`department_id` integer,
	`manager_id` integer,
	`email` text,
	`location` text,
	`cost_rate` real DEFAULT 0,
	`capacity_hours_per_month` real DEFAULT 160,
	`skill` text,
	`status` text DEFAULT 'Active' NOT NULL,
	`deleted_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `employees_employee_code_unique` ON `employees` (`employee_code`);--> statement-breakpoint
CREATE TABLE `lookup_lists` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`label` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lookup_lists_code_unique` ON `lookup_lists` (`code`);--> statement-breakpoint
CREATE TABLE `lookup_values` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lookup_list_id` integer NOT NULL,
	`value` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`lookup_list_id`) REFERENCES `lookup_lists`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lookup_values_uq` ON `lookup_values` (`lookup_list_id`,`value`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`body` text,
	`link` text,
	`is_read` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `notifications_user_idx` ON `notifications` (`user_id`,`is_read`);--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`module` text NOT NULL,
	`action` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `permissions_module_action_uq` ON `permissions` (`module`,`action`);--> statement-breakpoint
CREATE TABLE `refresh_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`revoked_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`role_id` integer NOT NULL,
	`permission_id` integer NOT NULL,
	PRIMARY KEY(`role_id`, `permission_id`),
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `roles_name_unique` ON `roles` (`name`);--> statement-breakpoint
CREATE TABLE `user_roles` (
	`user_id` integer NOT NULL,
	`role_id` integer NOT NULL,
	PRIMARY KEY(`user_id`, `role_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`contact_type` text DEFAULT 'internal' NOT NULL,
	`employee_id` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`last_login_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `workflow_actions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workflow_instance_id` integer NOT NULL,
	`step` integer NOT NULL,
	`action` text NOT NULL,
	`actor_user_id` integer NOT NULL,
	`comment` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`workflow_instance_id`) REFERENCES `workflow_instances`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `workflow_definitions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`entity_type` text NOT NULL,
	`steps_json` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workflow_definitions_code_unique` ON `workflow_definitions` (`code`);--> statement-breakpoint
CREATE TABLE `workflow_instances` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workflow_definition_id` integer NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` integer NOT NULL,
	`current_step` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`entered_step_at` integer DEFAULT (unixepoch()) NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`workflow_definition_id`) REFERENCES `workflow_definitions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `workflow_instances_entity_idx` ON `workflow_instances` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `action_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`action_code` text NOT NULL,
	`meeting_id` integer,
	`description` text NOT NULL,
	`owner_id` integer,
	`due_date` text,
	`status` text DEFAULT 'Open' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`meeting_id`) REFERENCES `meetings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `action_items_action_code_unique` ON `action_items` (`action_code`);--> statement-breakpoint
CREATE TABLE `budget_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entry_code` text NOT NULL,
	`project_id` integer NOT NULL,
	`cost_category` text NOT NULL,
	`vendor_name` text,
	`po_number` text,
	`invoice_status` text DEFAULT 'Pending' NOT NULL,
	`transaction_date` text NOT NULL,
	`committed_cost` real DEFAULT 0 NOT NULL,
	`actual_cost` real DEFAULT 0 NOT NULL,
	`forecast_cost` real DEFAULT 0 NOT NULL,
	`remarks` text,
	`deleted_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `budget_entries_entry_code_unique` ON `budget_entries` (`entry_code`);--> statement-breakpoint
CREATE INDEX `budget_entries_project_idx` ON `budget_entries` (`project_id`);--> statement-breakpoint
CREATE TABLE `change_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`change_code` text NOT NULL,
	`project_id` integer NOT NULL,
	`description` text NOT NULL,
	`impact` text,
	`approval_status` text DEFAULT 'Pending' NOT NULL,
	`owner_id` integer,
	`approval_date` text,
	`implementation_date` text,
	`status` text DEFAULT 'Under Review' NOT NULL,
	`workflow_instance_id` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `change_requests_change_code_unique` ON `change_requests` (`change_code`);--> statement-breakpoint
CREATE INDEX `change_requests_project_idx` ON `change_requests` (`project_id`);--> statement-breakpoint
CREATE TABLE `issues` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`issue_code` text NOT NULL,
	`project_id` integer NOT NULL,
	`description` text NOT NULL,
	`owner_id` integer,
	`severity` text DEFAULT 'Medium' NOT NULL,
	`priority` text DEFAULT 'Medium' NOT NULL,
	`date_raised` text NOT NULL,
	`due_date` text,
	`status` text DEFAULT 'Open' NOT NULL,
	`resolution` text,
	`deleted_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `issues_issue_code_unique` ON `issues` (`issue_code`);--> statement-breakpoint
CREATE INDEX `issues_project_idx` ON `issues` (`project_id`);--> statement-breakpoint
CREATE TABLE `kpi_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer,
	`snapshot_date` text NOT NULL,
	`spi` real NOT NULL,
	`cpi` real NOT NULL,
	`cv` real NOT NULL,
	`sv` real NOT NULL,
	`eac` real NOT NULL,
	`etc` real NOT NULL,
	`vac` real NOT NULL,
	`tcpi` real NOT NULL,
	`progress_pct` real NOT NULL,
	`budget_utilization` real NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `kpi_snapshots_project_idx` ON `kpi_snapshots` (`project_id`,`snapshot_date`);--> statement-breakpoint
CREATE TABLE `lessons_learned` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lesson_code` text NOT NULL,
	`project_id` integer,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`impact` text,
	`recommendation` text,
	`date_logged` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lessons_learned_lesson_code_unique` ON `lessons_learned` (`lesson_code`);--> statement-breakpoint
CREATE TABLE `meeting_attendees` (
	`meeting_id` integer NOT NULL,
	`employee_id` integer NOT NULL,
	FOREIGN KEY (`meeting_id`) REFERENCES `meetings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `meeting_attendees_uq` ON `meeting_attendees` (`meeting_id`,`employee_id`);--> statement-breakpoint
CREATE TABLE `meetings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`meeting_code` text NOT NULL,
	`meeting_date` text NOT NULL,
	`project_id` integer,
	`discussion` text,
	`owner_id` integer,
	`status` text DEFAULT 'Open' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `meetings_meeting_code_unique` ON `meetings` (`meeting_code`);--> statement-breakpoint
CREATE INDEX `meetings_project_idx` ON `meetings` (`project_id`);--> statement-breakpoint
CREATE TABLE `milestones` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`name` text NOT NULL,
	`owner_id` integer,
	`planned_date` text NOT NULL,
	`actual_date` text,
	`status` text DEFAULT 'Pending' NOT NULL,
	`deleted_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `milestones_project_idx` ON `milestones` (`project_id`);--> statement-breakpoint
CREATE TABLE `project_shares` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`show_budget` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_shares_uq` ON `project_shares` (`project_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_code` text NOT NULL,
	`name` text NOT NULL,
	`program` text,
	`portfolio` text,
	`department_id` integer,
	`business_unit` text,
	`project_manager_id` integer,
	`sponsor_id` integer,
	`client` text,
	`priority` text DEFAULT 'Medium' NOT NULL,
	`category` text,
	`status` text DEFAULT 'Not Started' NOT NULL,
	`start_date` text,
	`end_date` text,
	`baseline_start` text,
	`baseline_finish` text,
	`forecast_finish` text,
	`actual_finish` text,
	`budget` real DEFAULT 0 NOT NULL,
	`description` text,
	`remarks` text,
	`actual_cost_cache` real DEFAULT 0 NOT NULL,
	`forecast_cost_cache` real DEFAULT 0 NOT NULL,
	`progress_pct_cache` real DEFAULT 0 NOT NULL,
	`health_cache` text DEFAULT 'Green' NOT NULL,
	`spi_cache` real DEFAULT 1 NOT NULL,
	`cpi_cache` real DEFAULT 1 NOT NULL,
	`risk_score_cache` real DEFAULT 0 NOT NULL,
	`planned_value_cache` real DEFAULT 0 NOT NULL,
	`earned_value_cache` real DEFAULT 0 NOT NULL,
	`recalculated_at` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_manager_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sponsor_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_project_code_unique` ON `projects` (`project_code`);--> statement-breakpoint
CREATE INDEX `projects_dept_idx` ON `projects` (`department_id`);--> statement-breakpoint
CREATE INDEX `projects_pm_idx` ON `projects` (`project_manager_id`);--> statement-breakpoint
CREATE TABLE `risks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`risk_code` text NOT NULL,
	`project_id` integer NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`probability` integer NOT NULL,
	`impact` integer NOT NULL,
	`risk_score_cache` integer DEFAULT 0 NOT NULL,
	`owner_id` integer,
	`mitigation` text,
	`status` text DEFAULT 'Open' NOT NULL,
	`target_date` text,
	`closed_date` text,
	`deleted_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `risks_risk_code_unique` ON `risks` (`risk_code`);--> statement-breakpoint
CREATE INDEX `risks_project_idx` ON `risks` (`project_id`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_code` text NOT NULL,
	`project_id` integer NOT NULL,
	`parent_task_id` integer,
	`name` text NOT NULL,
	`wbs` text,
	`assigned_to` integer,
	`department_id` integer,
	`priority` text DEFAULT 'Medium' NOT NULL,
	`status` text DEFAULT 'Not Started' NOT NULL,
	`start_date` text,
	`finish_date` text,
	`actual_start` text,
	`actual_finish` text,
	`dependency_type` text,
	`successor_task_id` integer,
	`predecessor_task_id` integer,
	`progress_pct` real DEFAULT 0 NOT NULL,
	`baseline_start` text,
	`baseline_finish` text,
	`is_milestone` integer DEFAULT false NOT NULL,
	`comments` text,
	`duration_days_cache` integer,
	`remaining_days_cache` integer,
	`is_critical_cache` integer DEFAULT false NOT NULL,
	`variance_days_cache` integer,
	`health_cache` text DEFAULT 'Green' NOT NULL,
	`deleted_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_to`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tasks_task_code_unique` ON `tasks` (`task_code`);--> statement-breakpoint
CREATE INDEX `tasks_project_idx` ON `tasks` (`project_id`);--> statement-breakpoint
CREATE INDEX `tasks_assignee_idx` ON `tasks` (`assigned_to`);--> statement-breakpoint
CREATE TABLE `attendance_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`employee_id` integer NOT NULL,
	`date` text NOT NULL,
	`status` text DEFAULT 'Present' NOT NULL,
	`check_in` text,
	`check_out` text,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_uq` ON `attendance_records` (`employee_id`,`date`);--> statement-breakpoint
CREATE TABLE `chart_of_accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_code` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`parent_account_id` integer,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chart_of_accounts_account_code_unique` ON `chart_of_accounts` (`account_code`);--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`customer_id` integer,
	`full_name` text NOT NULL,
	`email` text,
	`phone` text,
	`job_title` text,
	`deleted_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `contacts_customer_idx` ON `contacts` (`customer_id`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`customer_code` text NOT NULL,
	`name` text NOT NULL,
	`industry` text,
	`website` text,
	`account_owner_id` integer,
	`status` text DEFAULT 'Active' NOT NULL,
	`deleted_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`account_owner_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_customer_code_unique` ON `customers` (`customer_code`);--> statement-breakpoint
CREATE INDEX `customers_owner_idx` ON `customers` (`account_owner_id`);--> statement-breakpoint
CREATE TABLE `journal_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entry_code` text NOT NULL,
	`entry_date` text NOT NULL,
	`memo` text,
	`project_id` integer,
	`posted_by` integer,
	`status` text DEFAULT 'Posted' NOT NULL,
	`deleted_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`posted_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `journal_entries_entry_code_unique` ON `journal_entries` (`entry_code`);--> statement-breakpoint
CREATE INDEX `journal_entries_date_idx` ON `journal_entries` (`entry_date`);--> statement-breakpoint
CREATE TABLE `journal_lines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`journal_entry_id` integer NOT NULL,
	`account_id` integer NOT NULL,
	`debit` real DEFAULT 0 NOT NULL,
	`credit` real DEFAULT 0 NOT NULL,
	`description` text,
	FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `chart_of_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `journal_lines_entry_idx` ON `journal_lines` (`journal_entry_id`);--> statement-breakpoint
CREATE INDEX `journal_lines_account_idx` ON `journal_lines` (`account_id`);--> statement-breakpoint
CREATE TABLE `leads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lead_code` text NOT NULL,
	`company_name` text NOT NULL,
	`contact_name` text,
	`email` text,
	`phone` text,
	`source` text,
	`status` text DEFAULT 'New' NOT NULL,
	`owner_id` integer,
	`converted_customer_id` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`converted_customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `leads_lead_code_unique` ON `leads` (`lead_code`);--> statement-breakpoint
CREATE INDEX `leads_owner_idx` ON `leads` (`owner_id`);--> statement-breakpoint
CREATE TABLE `leave_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`leave_code` text NOT NULL,
	`employee_id` integer NOT NULL,
	`leave_type` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`status` text DEFAULT 'Pending' NOT NULL,
	`approved_by` integer,
	`reason` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`approved_by`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `leave_requests_leave_code_unique` ON `leave_requests` (`leave_code`);--> statement-breakpoint
CREATE INDEX `leave_employee_idx` ON `leave_requests` (`employee_id`);--> statement-breakpoint
CREATE TABLE `opportunities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`opportunity_code` text NOT NULL,
	`customer_id` integer,
	`name` text NOT NULL,
	`stage` text DEFAULT 'Qualification' NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`probability` integer DEFAULT 20 NOT NULL,
	`expected_close_date` text,
	`owner_id` integer,
	`linked_project_id` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`linked_project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `opportunities_opportunity_code_unique` ON `opportunities` (`opportunity_code`);--> statement-breakpoint
CREATE INDEX `opportunities_customer_idx` ON `opportunities` (`customer_id`);--> statement-breakpoint
CREATE INDEX `opportunities_owner_idx` ON `opportunities` (`owner_id`);--> statement-breakpoint
CREATE TABLE `po_lines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`purchase_order_id` integer NOT NULL,
	`description` text NOT NULL,
	`quantity` real DEFAULT 1 NOT NULL,
	`unit_price` real DEFAULT 0 NOT NULL,
	`line_total` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `purchase_orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`po_number` text NOT NULL,
	`vendor_id` integer NOT NULL,
	`project_id` integer,
	`status` text DEFAULT 'Draft' NOT NULL,
	`total_amount` real DEFAULT 0 NOT NULL,
	`order_date` text NOT NULL,
	`expected_date` text,
	`workflow_instance_id` integer,
	`requested_by` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`requested_by`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `purchase_orders_po_number_unique` ON `purchase_orders` (`po_number`);--> statement-breakpoint
CREATE INDEX `po_vendor_idx` ON `purchase_orders` (`vendor_id`);--> statement-breakpoint
CREATE INDEX `po_project_idx` ON `purchase_orders` (`project_id`);--> statement-breakpoint
CREATE TABLE `vendors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`vendor_code` text NOT NULL,
	`name` text NOT NULL,
	`category` text,
	`contact_email` text,
	`contact_phone` text,
	`status` text DEFAULT 'Active' NOT NULL,
	`rating` real,
	`deleted_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vendors_vendor_code_unique` ON `vendors` (`vendor_code`);--> statement-breakpoint
CREATE TABLE `assets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`asset_code` text NOT NULL,
	`name` text NOT NULL,
	`category` text,
	`purchase_date` text NOT NULL,
	`purchase_cost` real NOT NULL,
	`useful_life_years` real DEFAULT 5 NOT NULL,
	`salvage_value` real DEFAULT 0 NOT NULL,
	`location` text,
	`assigned_to` integer,
	`project_id` integer,
	`status` text DEFAULT 'Active' NOT NULL,
	`deleted_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`assigned_to`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assets_asset_code_unique` ON `assets` (`asset_code`);--> statement-breakpoint
CREATE INDEX `assets_assigned_idx` ON `assets` (`assigned_to`);--> statement-breakpoint
CREATE TABLE `bom_lines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bom_id` integer NOT NULL,
	`component_item_id` integer NOT NULL,
	`quantity_per_output` real NOT NULL,
	FOREIGN KEY (`bom_id`) REFERENCES `boms`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`component_item_id`) REFERENCES `stock_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `boms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bom_code` text NOT NULL,
	`output_item_id` integer NOT NULL,
	`output_quantity` real DEFAULT 1 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`output_item_id`) REFERENCES `stock_items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `boms_bom_code_unique` ON `boms` (`bom_code`);--> statement-breakpoint
CREATE TABLE `kb_articles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`category` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `maintenance_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`asset_id` integer NOT NULL,
	`scheduled_date` text NOT NULL,
	`completed_date` text,
	`type` text DEFAULT 'Preventive' NOT NULL,
	`cost` real DEFAULT 0 NOT NULL,
	`notes` text,
	`status` text DEFAULT 'Scheduled' NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `maintenance_asset_idx` ON `maintenance_logs` (`asset_id`);--> statement-breakpoint
CREATE TABLE `production_orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_code` text NOT NULL,
	`bom_id` integer NOT NULL,
	`quantity_planned` real NOT NULL,
	`quantity_completed` real DEFAULT 0 NOT NULL,
	`warehouse_id` integer NOT NULL,
	`work_center_id` integer,
	`status` text DEFAULT 'Planned' NOT NULL,
	`scheduled_start` text,
	`scheduled_end` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`bom_id`) REFERENCES `boms`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`work_center_id`) REFERENCES `work_centers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `production_orders_order_code_unique` ON `production_orders` (`order_code`);--> statement-breakpoint
CREATE INDEX `po_mfg_bom_idx` ON `production_orders` (`bom_id`);--> statement-breakpoint
CREATE TABLE `stock_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sku` text NOT NULL,
	`name` text NOT NULL,
	`category` text,
	`unit_of_measure` text DEFAULT 'ea' NOT NULL,
	`reorder_point` real DEFAULT 0 NOT NULL,
	`standard_cost` real DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stock_items_sku_unique` ON `stock_items` (`sku`);--> statement-breakpoint
CREATE TABLE `stock_levels` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`stock_item_id` integer NOT NULL,
	`warehouse_id` integer NOT NULL,
	`quantity_on_hand` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`stock_item_id`) REFERENCES `stock_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stock_levels_uq` ON `stock_levels` (`stock_item_id`,`warehouse_id`);--> statement-breakpoint
CREATE TABLE `stock_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`stock_item_id` integer NOT NULL,
	`warehouse_id` integer NOT NULL,
	`type` text NOT NULL,
	`quantity` real NOT NULL,
	`reference` text,
	`performed_by` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`stock_item_id`) REFERENCES `stock_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`performed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `stock_txn_item_idx` ON `stock_transactions` (`stock_item_id`,`warehouse_id`);--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ticket_code` text NOT NULL,
	`subject` text NOT NULL,
	`description` text,
	`customer_id` integer,
	`raised_by` integer,
	`assigned_to` integer,
	`priority` text DEFAULT 'Medium' NOT NULL,
	`status` text DEFAULT 'Open' NOT NULL,
	`sla_hours` integer DEFAULT 48 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`resolved_at` integer,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`raised_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_to`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tickets_ticket_code_unique` ON `tickets` (`ticket_code`);--> statement-breakpoint
CREATE INDEX `tickets_status_idx` ON `tickets` (`status`);--> statement-breakpoint
CREATE INDEX `tickets_assigned_idx` ON `tickets` (`assigned_to`);--> statement-breakpoint
CREATE TABLE `warehouses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`location` text,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `warehouses_code_unique` ON `warehouses` (`code`);--> statement-breakpoint
CREATE TABLE `work_centers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`capacity_hours_per_day` real DEFAULT 8 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `work_centers_code_unique` ON `work_centers` (`code`);--> statement-breakpoint
CREATE TABLE `employee_task_assignments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_id` integer NOT NULL,
	`employee_id` integer NOT NULL,
	`status` text DEFAULT 'Pending' NOT NULL,
	`not_done_reason` text,
	`progress_notes` text,
	`started_at` integer,
	`completed_at` integer,
	`duration_ms` integer,
	`deleted_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `employee_tasks`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `employee_task_assignments_uq` ON `employee_task_assignments` (`task_id`,`employee_id`);--> statement-breakpoint
CREATE INDEX `employee_task_assignments_employee_idx` ON `employee_task_assignments` (`employee_id`);--> statement-breakpoint
CREATE INDEX `employee_task_assignments_task_idx` ON `employee_task_assignments` (`task_id`);--> statement-breakpoint
CREATE TABLE `employee_tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_code` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`priority` text DEFAULT 'Medium' NOT NULL,
	`due_date` text,
	`due_time` text,
	`department_id` integer,
	`created_by` integer NOT NULL,
	`deleted_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `employee_tasks_task_code_unique` ON `employee_tasks` (`task_code`);--> statement-breakpoint
CREATE INDEX `employee_tasks_due_date_idx` ON `employee_tasks` (`due_date`);