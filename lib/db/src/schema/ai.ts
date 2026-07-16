import { pgTable, serial, text, timestamp, integer, varchar, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";

export const aiMessageRoleEnum = pgEnum("ai_message_role", ["user", "assistant"]);

export const aiConversationsTable = pgTable("ai_conversations", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const aiMessagesTable = pgTable("ai_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => aiConversationsTable.id, { onDelete: "cascade" }),
  role: aiMessageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertConversationSchema = createInsertSchema(aiConversationsTable).omit({ id: true, createdAt: true });
export type AiConversation = typeof aiConversationsTable.$inferSelect;
export type AiMessage = typeof aiMessagesTable.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
