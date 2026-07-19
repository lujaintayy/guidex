import { pgTable, serial, text, timestamp, integer, varchar, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";

export const serverOsEnum = pgEnum("server_os", ["ubuntu", "debian", "rhel", "centos", "windows", "other"]);
export const serverStatusEnum = pgEnum("server_status", ["online", "offline", "unknown", "maintenance"]);

export const serverGroupsTable = pgTable("server_groups", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const serversTable = pgTable("servers", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  groupId: integer("group_id").references(() => serverGroupsTable.id, { onDelete: "set null" }),
  // Identity
  name: varchar("name", { length: 255 }).notNull(),
  clientName: varchar("client_name", { length: 255 }),
  host: varchar("host", { length: 255 }).notNull(),
  sshPort: integer("ssh_port").notNull().default(22),
  sshUsername: varchar("ssh_username", { length: 100 }).notNull(),
  // Auth — 'password' | 'key' | 'none'
  sshAuthMethod: varchar("ssh_auth_method", { length: 20 }).default("password"),
  sshPassword: text("ssh_password"),
  os: serverOsEnum("os").notNull(),
  osVersion: varchar("os_version", { length: 100 }),
  status: serverStatusEnum("status").notNull().default("unknown"),
  tags: jsonb("tags").$type<string[]>().default([]),
  description: text("description"),
  // Live metrics (updated by scan / health poll)
  cpuUsage: integer("cpu_usage"),
  memUsage: integer("mem_usage"),
  diskUsage: integer("disk_usage"),
  // Full scan result payload (JSON)
  scanData: jsonb("scan_data").$type<Record<string, unknown>>(),
  lastSeen: timestamp("last_seen"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertServerSchema = createInsertSchema(serversTable).omit({ id: true, createdAt: true, status: true, lastSeen: true });
export const insertServerGroupSchema = createInsertSchema(serverGroupsTable).omit({ id: true, createdAt: true });
export type InsertServer = z.infer<typeof insertServerSchema>;
export type Server = typeof serversTable.$inferSelect;
export type ServerGroup = typeof serverGroupsTable.$inferSelect;
