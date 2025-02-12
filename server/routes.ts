import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertTransactionSchema } from "@shared/schema";
import { HousecallAPI } from "./housecallApi";

// Initialize HousecallAPI with the API key from environment
const housecallApi = new HousecallAPI(process.env.HOUSECALL_API_KEY!);

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Transaction routes
  app.get("/api/transactions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const transactions = await storage.getTransactions();
    res.json(transactions);
  });

  app.post("/api/transactions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const parsed = insertTransactionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }
    const transaction = await storage.createTransaction(parsed.data);
    res.status(201).json(transaction);
  });

  app.post("/api/transactions/:id/review", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "approver") {
      return res.sendStatus(401);
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const transaction = await storage.updateTransactionStatus(
      parseInt(id),
      status,
      req.user.id
    );

    res.json(transaction);
  });

  // Housecall Pro Paid Invoices Routes
  app.post("/api/housecall/sync-invoices", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const perPage = req.query.per_page ? parseInt(req.query.per_page as string) : undefined;
      await housecallApi.getInvoices(perPage);
      res.json({ message: "Successfully synced paid invoices from Housecall Pro" });
    } catch (error) {
      console.error('Error syncing Housecall Pro invoices:', error);
      if (error instanceof Error) {
        res.status(500).json({ message: error.message });
      } else {
        res.status(500).json({ message: "An unknown error occurred while syncing invoices" });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}