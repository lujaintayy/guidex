import { pgTable, serial, text, timestamp, integer, varchar, pgEnum } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";

export const documentTypeEnum = pgEnum("document_type", [
  "deployment_report", "installation_report", "architecture_doc", "sop",
  "rollback_doc", "troubleshooting_report", "audit_summary", "srs"
]);

export const documentFormatEnum = pgEnum("document_format", ["markdown", "html", "text"]);

export const documentsTable = pgTable("documents", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  type: documentTypeEnum("type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  format: documentFormatEnum("format").notNull().default("markdown"),
  relatedDeploymentId: integer("related_deployment_id"),
  relatedServerId: integer("related_server_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reportsTable = pgTable("reports", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  summary: text("summary").notNull(),
  data: text("data").notNull().default("{}"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Document = typeof documentsTable.$inferSelect;
export type Report = typeof reportsTable.$inferSelect;
