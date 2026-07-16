import { pgTable, serial, text, timestamp, integer, varchar, pgEnum, boolean, real } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { serversTable } from "./servers";

export const alertTypeEnum = pgEnum("alert_type", [
  "cpu_high", "memory_high", "disk_high", "service_down", "ssl_expiring", "unreachable", "custom"
]);

export const alertSeverityEnum = pgEnum("alert_severity", ["info", "warning", "critical"]);

export const monitoringAlertsTable = pgTable("monitoring_alerts", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  serverId: integer("server_id").notNull().references(() => serversTable.id, { onDelete: "cascade" }),
  type: alertTypeEnum("type").notNull(),
  severity: alertSeverityEnum("severity").notNull(),
  message: text("message").notNull(),
  resolved: boolean("resolved").notNull().default(false),
  triggeredAt: timestamp("triggered_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

export const serverMetricsTable = pgTable("server_metrics", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull().references(() => serversTable.id, { onDelete: "cascade" }),
  cpuUsage: real("cpu_usage"),
  memUsage: real("mem_usage"),
  diskUsage: real("disk_usage"),
  networkIn: real("network_in"),
  networkOut: real("network_out"),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
});

export type MonitoringAlert = typeof monitoringAlertsTable.$inferSelect;
export type ServerMetric = typeof serverMetricsTable.$inferSelect;
