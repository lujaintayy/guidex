import { pgTable, pgEnum, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userStatusEnum = pgEnum("user_status", [
  "pending_verification",
  "pending_approval",
  "active",
  "declined",
]);

export const userRoleEnum = pgEnum("user_role", ["engineer", "reviewer", "admin"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  avatarUrl: text("avatar_url"),
  status: userStatusEnum("status").notNull().default("pending_verification"),
  role: userRoleEnum("role"),
  emailVerificationCode: text("email_verification_code"),
  emailVerificationExpiry: timestamp("email_verification_expiry"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
