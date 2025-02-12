import { pgTable, text, serial, integer, boolean, decimal, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User management table remains unchanged
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["approver", "analyst", "developer"] }).notNull().default("analyst"),
});

// Enhanced transactions table with additional invoice-specific fields
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  memo: text("memo"),
  source: text("source", { enum: ["plaid", "quickbooks", "housecall"] }).notNull(),
  sourceId: text("source_id").notNull(),
  sourceType: text("source_type"), // e.g., payment, invoice, deposit
  status: text("status"), // e.g., pending, completed, cancelled, paid
  category: text("category"), // normalized business category
  matchProbability: decimal("match_probability", { precision: 5, scale: 4 }),
  matchedTransactionId: integer("matched_transaction_id").references(() => transactions.id, { onDelete: "set null" }),
  reviewStatus: text("review_status", { enum: ["pending", "approved", "rejected"] }).default("pending"),
  reviewerId: integer("reviewer_id").references(() => users.id),
  metadata: jsonb("metadata"), // Enhanced to include invoice-specific fields
  bayesianScore: decimal("bayesian_score", { precision: 5, scale: 4 }),
  monteCarloIterations: integer("monte_carlo_iterations"),
  matchConfidence: decimal("match_confidence", { precision: 5, scale: 4 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // Invoice-specific fields
  invoiceNumber: text("invoice_number"),
  serviceDate: timestamp("service_date"),
  paidDate: timestamp("paid_date"),
  dueDate: timestamp("due_date"),
  dueAmount: decimal("due_amount", { precision: 10, scale: 2 }),
  jobId: text("job_id"),
  customerName: text("customer_name"),
});

// Raw data tables remain unchanged for plaid and quickbooks
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

// Enhanced housecall transactions table
export const housecallTransactions = pgTable("housecall_transactions", {
  id: serial("id").primaryKey(),
  housecallId: text("housecall_id").notNull().unique(),
  rawData: jsonb("raw_data").notNull(),
  processedAt: timestamp("processed_at").defaultNow(),
  normalizedTransactionId: integer("normalized_transaction_id").references(() => transactions.id),
});

// Insert schemas remain mostly unchanged
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
});

// Enhanced transaction insert schema
export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  matchProbability: true,
  matchedTransactionId: true,
  reviewStatus: true,
  reviewerId: true,
  bayesianScore: true,
  monteCarloIterations: true,
  matchConfidence: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // Add validation for invoice-specific fields
  invoiceNumber: z.string().optional(),
  serviceDate: z.date().optional(),
  paidDate: z.date().optional(),
  dueDate: z.date().optional(),
  dueAmount: z.number().optional(),
  jobId: z.string().optional(),
  customerName: z.string().optional(),
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

// Enhanced Housecall transaction insert schema
export const insertHousecallTransactionSchema = createInsertSchema(housecallTransactions).omit({
  id: true,
  processedAt: true,
  normalizedTransactionId: true,
}).extend({
  rawData: z.object({
    invoice_number: z.string(),
    customer_name: z.string(),
    invoice_date: z.string(),
    service_date: z.string(),
    paid_at: z.string(),
    amount: z.number(),
    due_amount: z.number(),
    status: z.enum(["paid"]),
    due_at: z.string(),
    job_id: z.string(),
  }),
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