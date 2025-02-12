import { pgTable, text, serial, integer, boolean, decimal, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User management
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["approver", "analyst", "developer"] }).notNull().default("analyst"),
});

// Raw data tables for each source
export const plaidTransactions = pgTable("plaid_transactions", {
  id: serial("id").primaryKey(),
  plaidId: text("plaid_id").notNull().unique(),
  rawData: jsonb("raw_data").notNull(),
  processedAt: timestamp("processed_at").defaultNow(),
  normalizedTransactionId: integer("normalized_transaction_id").references(() => transactions.id),
});

export const quickbooksTransactions = pgTable("quickbooks_transactions", {
  id: serial("id").primaryKey(),
  quickbooksId: text("quickbooks_id").notNull().unique(),
  rawData: jsonb("raw_data").notNull(),
  processedAt: timestamp("processed_at").defaultNow(),
  normalizedTransactionId: integer("normalized_transaction_id").references(() => transactions.id),
});

export const housecallTransactions = pgTable("housecall_transactions", {
  id: serial("id").primaryKey(),
  housecallId: text("housecall_id").notNull().unique(),
  rawData: jsonb("raw_data").notNull(),
  processedAt: timestamp("processed_at").defaultNow(),
  normalizedTransactionId: integer("normalized_transaction_id").references(() => transactions.id),
});

// Normalized transaction table
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  memo: text("memo"),
  source: text("source", { enum: ["plaid", "quickbooks", "housecall"] }).notNull(),
  sourceId: text("source_id").notNull(),
  sourceType: text("source_type"), // e.g., payment, invoice, deposit
  status: text("status"), // e.g., pending, completed, cancelled
  category: text("category"), // normalized business category
  matchProbability: decimal("match_probability", { precision: 5, scale: 4 }),
  matchedTransactionId: integer("matched_transaction_id").references(() => transactions.id),
  reviewStatus: text("review_status", { enum: ["pending", "approved", "rejected"] }).default("pending"),
  reviewerId: integer("reviewer_id").references(() => users.id),
  metadata: jsonb("metadata"), // Additional normalized fields
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
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
  createdAt: true,
  updatedAt: true,
});

// Raw data insert schemas
export const insertPlaidTransactionSchema = createInsertSchema(plaidTransactions).omit({
  id: true,
  processedAt: true,
  normalizedTransactionId: true,
});

export const insertQuickbooksTransactionSchema = createInsertSchema(quickbooksTransactions).omit({
  id: true,
  processedAt: true,
  normalizedTransactionId: true,
});

export const insertHousecallTransactionSchema = createInsertSchema(housecallTransactions).omit({
  id: true,
  processedAt: true,
  normalizedTransactionId: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type PlaidTransaction = typeof plaidTransactions.$inferSelect;
export type InsertPlaidTransaction = z.infer<typeof insertPlaidTransactionSchema>;
export type QuickbooksTransaction = typeof quickbooksTransactions.$inferSelect;
export type InsertQuickbooksTransaction = z.infer<typeof insertQuickbooksTransactionSchema>;
export type HousecallTransaction = typeof housecallTransactions.$inferSelect;
export type InsertHousecallTransaction = z.infer<typeof insertHousecallTransactionSchema>;