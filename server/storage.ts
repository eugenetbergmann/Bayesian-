import { users, type User, type InsertUser, type Transaction, type InsertTransaction } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getTransactions(): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransactionStatus(id: number, status: "approved" | "rejected", reviewerId: number): Promise<Transaction>;
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private transactions: Map<number, Transaction>;
  sessionStore: session.Store;
  currentUserId: number;
  currentTransactionId: number;

  constructor() {
    this.users = new Map();
    this.transactions = new Map();
    this.currentUserId = 1;
    this.currentTransactionId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });

    // Add synthetic transactions
    const sampleTransactions: Transaction[] = [
      {
        id: this.currentTransactionId++,
        amount: "1500.00",
        date: new Date("2024-02-10"),
        memo: "HVAC Installation Service",
        source: "plaid",
        sourceId: "pld_1",
        matchProbability: "0.95",
        matchedTransactionId: 2,
        reviewStatus: "approved",
        reviewerId: null,
      },
      {
        id: this.currentTransactionId++,
        amount: "1500.00",
        date: new Date("2024-02-10"),
        memo: "Installation Payment - Invoice #12345",
        source: "quickbooks",
        sourceId: "qb_1",
        matchProbability: "0.95",
        matchedTransactionId: 1,
        reviewStatus: "approved",
        reviewerId: null,
      },
      {
        id: this.currentTransactionId++,
        amount: "750.25",
        date: new Date("2024-02-11"),
        memo: "AC Repair and Maintenance",
        source: "plaid",
        sourceId: "pld_2",
        matchProbability: "0.75",
        matchedTransactionId: 4,
        reviewStatus: "pending",
        reviewerId: null,
      },
      {
        id: this.currentTransactionId++,
        amount: "755.00",
        date: new Date("2024-02-12"),
        memo: "Repair Service - Invoice #12346",
        source: "quickbooks",
        sourceId: "qb_2",
        matchProbability: "0.75",
        matchedTransactionId: 3,
        reviewStatus: "pending",
        reviewerId: null,
      },
      {
        id: this.currentTransactionId++,
        amount: "250.00",
        date: new Date("2024-02-09"),
        memo: "Filter Replacement",
        source: "plaid",
        sourceId: "pld_3",
        matchProbability: "0.45",
        matchedTransactionId: 6,
        reviewStatus: "rejected",
        reviewerId: 1,
      },
      {
        id: this.currentTransactionId++,
        amount: "275.00",
        date: new Date("2024-02-15"),
        memo: "Maintenance - Invoice #12347",
        source: "quickbooks",
        sourceId: "qb_3",
        matchProbability: "0.45",
        matchedTransactionId: 5,
        reviewStatus: "rejected",
        reviewerId: 1,
      },
    ];

    sampleTransactions.forEach(transaction => {
      this.transactions.set(transaction.id, transaction);
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getTransactions(): Promise<Transaction[]> {
    return Array.from(this.transactions.values());
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = this.currentTransactionId++;
    const transaction: Transaction = {
      ...insertTransaction,
      id,
      matchProbability: null,
      matchedTransactionId: null,
      reviewStatus: "pending",
      reviewerId: null,
    };
    this.transactions.set(id, transaction);
    return transaction;
  }

  async updateTransactionStatus(
    id: number,
    status: "approved" | "rejected",
    reviewerId: number
  ): Promise<Transaction> {
    const transaction = this.transactions.get(id);
    if (!transaction) {
      throw new Error("Transaction not found");
    }

    const updated: Transaction = {
      ...transaction,
      reviewStatus: status,
      reviewerId,
    };
    this.transactions.set(id, updated);
    return updated;
  }
}

export const storage = new MemStorage();