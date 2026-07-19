import { pgTable, serial, text, timestamp, integer, varchar, pgEnum, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";

export const templateCategoryEnum = pgEnum("template_category", [
  "webserver", "database", "container", "language", "messaging", "security", "monitoring", "other"
]);

export const templatesTable = pgTable("templates", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").references(() => organizationsTable.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  scriptContent: text("script_content"),
  category: templateCategoryEnum("category").notNull().default("other"),
  software: varchar("software", { length: 100 }).notNull().default(""),
  version: varchar("version", { length: 50 }).notNull().default("1.0.0"),
  osRequirements: jsonb("os_requirements").$type<string[]>().default([]),
  steps: jsonb("steps").$type<Array<{
    order: number;
    name: string;
    description?: string;
    command: string;
    expectedOutput?: string;
    continueOnError?: boolean;
    estimatedSeconds?: number;
  }>>().default([]),
  configValues: jsonb("config_values").$type<Record<string, string>>().default({}),
  envVars: jsonb("env_vars").$type<Record<string, string>>().default({}),
  postInstallActions: jsonb("post_install_actions").$type<string[]>().default([]),
  isBuiltIn: boolean("is_built_in").notNull().default(false),
  usageCount: integer("usage_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTemplateSchema = createInsertSchema(templatesTable).omit({ id: true, createdAt: true, usageCount: true });
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Template = typeof templatesTable.$inferSelect;
