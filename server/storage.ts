import { users, transactions, plaidTransactions, quickbooksTransactions, housecallTransactions } from "@shared/schema";
import type { User, InsertUser, Transaction, InsertTransaction } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getTransactions(): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransactionStatus(id: number, status: "approved" | "rejected", reviewerId: number): Promise<Transaction>;
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getTransactions(): Promise<Transaction[]> {
    return db.select().from(transactions);
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db.insert(transactions).values(insertTransaction).returning();
    return transaction;
  }

  async updateTransactionStatus(
    id: number,
    status: "approved" | "rejected",
    reviewerId: number
  ): Promise<Transaction> {
    const [transaction] = await db
      .update(transactions)
      .set({
        reviewStatus: status,
        reviewerId,
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, id))
      .returning();

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    return transaction;
  }

  // New methods for handling raw data
  async createPlaidTransaction(rawData: any, plaidId: string): Promise<Transaction> {
    // Start a transaction
    return await db.transaction(async (tx) => {
      // Insert raw data
      const [plaidTx] = await tx
        .insert(plaidTransactions)
        .values({
          plaidId,
          rawData,
        })
        .returning();

      // Normalize and insert into transactions
      const normalized = this.normalizePlaidTransaction(rawData);
      const [transaction] = await tx
        .insert(transactions)
        .values({
          ...normalized,
          source: "plaid",
          sourceId: plaidId,
        })
        .returning();

      // Update the reference
      await tx
        .update(plaidTransactions)
        .set({ normalizedTransactionId: transaction.id })
        .where(eq(plaidTransactions.id, plaidTx.id));

      return transaction;
    });
  }

  private normalizePlaidTransaction(rawData: any): InsertTransaction {
    // Implement Plaid-specific normalization logic
    return {
      amount: rawData.amount,
      date: new Date(rawData.date),
      memo: rawData.description,
      sourceType: rawData.type,
      status: rawData.status,
      category: rawData.category?.[0] || null,
      metadata: {
        merchantName: rawData.merchant_name,
        paymentChannel: rawData.payment_channel,
      },
    };
  }

  // Similar methods for QuickBooks and Housecall Pro
  // Add normalization logic specific to each source
  async createQuickbooksTransaction(rawData: any, quickbooksId: string): Promise<Transaction> {
    return await db.transaction(async (tx) => {
      // Insert raw data
      const [quickbooksTx] = await tx
        .insert(quickbooksTransactions)
        .values({
          quickbooksId,
          rawData,
        })
        .returning();

      // Normalize and insert into transactions
      const normalized = this.normalizeQuickbooksTransaction(rawData);
      const [transaction] = await tx
        .insert(transactions)
        .values({
          ...normalized,
          source: "quickbooks",
          sourceId: quickbooksId,
        })
        .returning();

      // Update the reference
      await tx
        .update(quickbooksTransactions)
        .set({ normalizedTransactionId: transaction.id })
        .where(eq(quickbooksTransactions.id, quickbooksTx.id));

      return transaction;
    });
  }

  async createHousecallTransaction(rawData: any, housecallId: string): Promise<Transaction> {
    return await db.transaction(async (tx) => {
      // Insert raw data
      const [housecallTx] = await tx
        .insert(housecallTransactions)
        .values({
          housecallId,
          rawData,
        })
        .returning();

      // Normalize and insert into transactions
      const normalized = this.normalizeHousecallTransaction(rawData);
      const [transaction] = await tx
        .insert(transactions)
        .values({
          ...normalized,
          source: "housecall",
          sourceId: housecallId,
        })
        .returning();

      // Update the reference
      await tx
        .update(housecallTransactions)
        .set({ normalizedTransactionId: transaction.id })
        .where(eq(housecallTransactions.id, housecallTx.id));

      return transaction;
    });
  }

  private normalizeQuickbooksTransaction(rawData: any): InsertTransaction {
    // QuickBooks-specific normalization logic
    return {
      amount: rawData.TotalAmt?.toString() || rawData.Amount?.toString(),
      date: new Date(rawData.TxnDate || rawData.MetaData?.CreateTime),
      memo: rawData.PrivateNote || rawData.Description,
      sourceType: rawData.Type || rawData.TxnType,
      status: this.mapQuickbooksStatus(rawData.Status),
      category: rawData.AccountRef?.name || null,
      metadata: {
        docNumber: rawData.DocNumber,
        customerRef: rawData.CustomerRef?.name,
        paymentMethod: rawData.PaymentMethodRef?.name,
      },
    };
  }

  private normalizeHousecallTransaction(rawData: any): InsertTransaction {
    // Housecall Pro-specific normalization logic
    return {
      amount: rawData.total?.toString() || rawData.amount?.toString(),
      date: new Date(rawData.created_at || rawData.transaction_date),
      memo: rawData.description || rawData.notes,
      sourceType: rawData.type || rawData.transaction_type,
      status: this.mapHousecallStatus(rawData.status),
      category: rawData.category || rawData.service_type,
      metadata: {
        jobId: rawData.job_id,
        customerId: rawData.customer_id,
        technician: rawData.technician_name,
        location: rawData.service_location,
      },
    };
  }

  private mapQuickbooksStatus(status: string | null): string {
    if (!status) return "pending";
    const statusMap: Record<string, string> = {
      "Pending": "pending",
      "Completed": "completed",
      "Voided": "cancelled",
      "Deleted": "cancelled",
    };
    return statusMap[status] || "pending";
  }

  private mapHousecallStatus(status: string | null): string {
    if (!status) return "pending";
    const statusMap: Record<string, string> = {
      "pending": "pending",
      "completed": "completed",
      "cancelled": "cancelled",
      "in_progress": "pending",
    };
    return statusMap[status] || "pending";
  }
}

export const storage = new DatabaseStorage();