import { pgTable, serial, text, timestamp, integer, varchar, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { serversTable } from "./servers";
import { templatesTable } from "./templates";
import { usersTable } from "./users";

export const deploymentStatusEnum = pgEnum("deployment_status", [
  "pending", "planning", "planned", "awaiting_approval", "approved",
  "rejected", "running", "completed", "failed", "rolling_back", "rolled_back"
]);

export const deploymentLogLevelEnum = pgEnum("deployment_log_level", [
  "info", "warn", "error", "success", "debug"
]);

export const deploymentStepStatusEnum = pgEnum("deployment_step_status", [
  "pending", "running", "completed", "failed", "skipped"
]);

export const deploymentsTable = pgTable("deployments", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  serverId: integer("server_id").notNull().references(() => serversTable.id, { onDelete: "cascade" }),
  templateId: integer("template_id").notNull().references(() => templatesTable.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  status: deploymentStatusEnum("status").notNull().default("pending"),
  createdById: integer("created_by_id").notNull().references(() => usersTable.id),
  approvedById: integer("approved_by_id").references(() => usersTable.id),
  approvalComment: text("approval_comment"),
  plan: jsonb("plan").$type<Record<string, unknown>>(),
  configOverrides: jsonb("config_overrides").$type<Record<string, string>>().default({}),
  scheduledAt: timestamp("scheduled_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  duration: integer("duration"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const deploymentLogsTable = pgTable("deployment_logs", {
  id: serial("id").primaryKey(),
  deploymentId: integer("deployment_id").notNull().references(() => deploymentsTable.id, { onDelete: "cascade" }),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  level: deploymentLogLevelEnum("level").notNull().default("info"),
  message: text("message").notNull(),
  stepName: varchar("step_name", { length: 255 }),
  output: text("output"),
});

export const deploymentStepsTable = pgTable("deployment_steps", {
  id: serial("id").primaryKey(),
  deploymentId: integer("deployment_id").notNull().references(() => deploymentsTable.id, { onDelete: "cascade" }),
  order: integer("order").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  command: text("command"),
  status: deploymentStepStatusEnum("status").notNull().default("pending"),
  output: text("output"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  duration: integer("duration"),
});

export const insertDeploymentSchema = createInsertSchema(deploymentsTable).omit({ id: true, createdAt: true, status: true });
export type InsertDeployment = z.infer<typeof insertDeploymentSchema>;
export type Deployment = typeof deploymentsTable.$inferSelect;
export type DeploymentLog = typeof deploymentLogsTable.$inferSelect;
export type DeploymentStep = typeof deploymentStepsTable.$inferSelect;
