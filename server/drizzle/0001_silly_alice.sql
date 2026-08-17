ALTER TABLE `attachments` ADD `comment_id` integer REFERENCES comments(id);--> statement-breakpoint
CREATE INDEX `attachments_comment_idx` ON `attachments` (`comment_id`);