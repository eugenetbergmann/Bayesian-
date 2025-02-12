import { pgTable, text, serial, integer, boolean, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["approver", "analyst", "developer"] }).notNull().default("analyst"),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  memo: text("memo"),
  source: text("source", { enum: ["plaid", "quickbooks"] }).notNull(),
  sourceId: text("source_id").notNull(),
  matchProbability: decimal("match_probability", { precision: 5, scale: 4 }),
  matchedTransactionId: integer("matched_transaction_id").references(() => transactions.id),
  reviewStatus: text("review_status", { enum: ["pending", "approved", "rejected"] }).default("pending"),
  reviewerId: integer("reviewer_id").references(() => users.id),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  matchProbability: true,
  matchedTransactionId: true,
  reviewStatus: true,
  reviewerId: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
