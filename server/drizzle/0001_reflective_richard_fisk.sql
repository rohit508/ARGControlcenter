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
CREATE UNIQUE INDEX `vendors_vendor_code_unique` ON `vendors` (`vendor_code`);