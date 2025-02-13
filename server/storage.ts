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
    if (!rawData) {
      throw new Error("No data provided for Plaid transaction normalization");
    }

    if (!rawData.amount || !rawData.date) {
      throw new Error("Missing required fields (amount or date) in Plaid transaction");
    }

    // Normalize amount to always be positive, use metadata to track if it's a credit/debit
    const amount = Math.abs(parseFloat(rawData.amount));
    const isCredit = parseFloat(rawData.amount) > 0;

    return {
      amount,
      date: new Date(rawData.date),
      memo: rawData.description || rawData.name || null,
      sourceType: rawData.type || "transaction",
      status: rawData.pending ? "pending" : "completed",
      category: rawData.category?.[0] || null,
      metadata: {
        merchantName: rawData.merchant_name || null,
        paymentChannel: rawData.payment_channel || null,
        isCredit,
        location: rawData.location ? {
          address: rawData.location.address,
          city: rawData.location.city,
          region: rawData.location.region,
          postalCode: rawData.location.postal_code,
          country: rawData.location.country
        } : null,
        categoryHierarchy: rawData.category || [],
        transactionCode: rawData.transaction_code,
        transactionId: rawData.transaction_id,
        authorizedDate: rawData.authorized_date,
        paymentMethod: rawData.payment_method,
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
    if (!rawData) {
      throw new Error("No data provided for QuickBooks transaction normalization");
    }

    const amount = rawData.TotalAmt || rawData.Amount;
    if (!amount || !rawData.TxnDate) {
      throw new Error("Missing required fields (amount or date) in QuickBooks transaction");
    }

    return {
      amount: parseFloat(amount.toString()),
      date: new Date(rawData.TxnDate || rawData.MetaData?.CreateTime),
      memo: rawData.PrivateNote || rawData.Description || null,
      sourceType: rawData.Type || rawData.TxnType || "transaction",
      status: this.mapQuickbooksStatus(rawData.Status),
      category: rawData.AccountRef?.name || null,
      metadata: {
        docNumber: rawData.DocNumber || null,
        customerRef: rawData.CustomerRef ? {
          id: rawData.CustomerRef.value,
          name: rawData.CustomerRef.name
        } : null,
        paymentMethod: rawData.PaymentMethodRef ? {
          id: rawData.PaymentMethodRef.value,
          name: rawData.PaymentMethodRef.name
        } : null,
        departmentRef: rawData.DepartmentRef ? {
          id: rawData.DepartmentRef.value,
          name: rawData.DepartmentRef.name
        } : null,
        billEmail: rawData.BillEmail?.Address,
        currency: rawData.CurrencyRef?.value || "USD",
        exchangeRate: rawData.ExchangeRate || 1.0,
        globalTaxCalculation: rawData.GlobalTaxCalculation,
        taxInclusiveAmt: rawData.TaxInclusiveAmt,
      },
    };
  }

  private normalizeHousecallTransaction(rawData: any): InsertTransaction {
    console.log('🔄 Starting Housecall transaction normalization');
    console.log('Raw data:', JSON.stringify(rawData, null, 2));
    
    if (!rawData) {
      throw new Error("No data provided for Housecall transaction normalization");
    }

    const amount = rawData.total || rawData.amount;
    if (!amount || !rawData.created_at) {
      throw new Error("Missing required fields (amount or date) in Housecall transaction");
    }

    return {
      amount: parseFloat(amount.toString()),
      date: new Date(rawData.created_at || rawData.transaction_date),
      memo: rawData.description || rawData.notes || null,
      sourceType: rawData.type || rawData.transaction_type || "transaction",
      status: this.mapHousecallStatus(rawData.status),
      category: rawData.category || rawData.service_type || null,
      metadata: {
        jobId: rawData.job_id || null,
        customerId: rawData.customer_id || null,
        technician: {
          id: rawData.technician_id,
          name: rawData.technician_name
        },
        location: rawData.service_location ? {
          address: rawData.service_location.address,
          city: rawData.service_location.city,
          state: rawData.service_location.state,
          zip: rawData.service_location.zip
        } : null,
        invoice: rawData.invoice ? {
          id: rawData.invoice.id,
          number: rawData.invoice.number,
          dueDate: rawData.invoice.due_date
        } : null,
        paymentMethod: rawData.payment_method,
        taxAmount: rawData.tax_amount,
        discountAmount: rawData.discount_amount,
        lineItems: Array.isArray(rawData.line_items) ? 
          rawData.line_items.map((item: any) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            total: item.total
          })) : [],
      },
    };
  }

  private mapQuickbooksStatus(status: string | null): string {
    if (!status) return "pending";
    const statusMap: Record<string, string> = {
      "Pending": "pending",
      "Completed": "completed",
      "Paid": "completed",
      "Voided": "cancelled",
      "Deleted": "cancelled",
      "Draft": "pending",
      "Submitted": "pending",
      "Accepted": "completed",
      "Rejected": "cancelled",
      "In Progress": "pending"
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
      "paid": "completed",
      "refunded": "cancelled",
      "partially_paid": "pending",
      "overdue": "pending",
      "void": "cancelled"
    };
    return statusMap[status] || "pending";
  }
}

export const storage = new DatabaseStorage();