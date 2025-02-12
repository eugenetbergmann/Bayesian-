import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertTransactionSchema } from "@shared/schema";

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

  const httpServer = createServer(app);
  return httpServer;
}
