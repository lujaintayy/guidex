import { pgTable, serial, text, timestamp, integer, varchar, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const orgRoleEnum = pgEnum("org_role", ["engineer", "reviewer", "admin"]);

export const organizationsTable = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orgMembersTable = pgTable("org_members", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  role: orgRoleEnum("role").notNull().default("engineer"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const insertOrganizationSchema = createInsertSchema(organizationsTable).omit({ id: true, createdAt: true });
export const insertOrgMemberSchema = createInsertSchema(orgMembersTable).omit({ id: true, joinedAt: true });
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizationsTable.$inferSelect;
export type OrgMember = typeof orgMembersTable.$inferSelect;
