import { pgTable, serial, text, timestamp, integer, varchar, boolean, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const notificationTypeEnum = pgEnum("notification_type", [
  "deployment_started", "deployment_completed", "deployment_failed",
  "approval_required", "server_alert", "system"
]);

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  link: varchar("link", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Notification = typeof notificationsTable.$inferSelect;
