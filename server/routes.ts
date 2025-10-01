import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertArticleSchema, insertOrderLineSchema, insertUserSchema, updateArticleInventorySchema, insertInventoryCountSchema, updateInventoryCountSchema } from "@shared/schema";
import multer from "multer";
import { read, utils } from "xlsx";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  // WebSocket connection handling
  wss.on("connection", (ws) => {
    console.log("Client connected to WebSocket");

    ws.on("close", () => {
      console.log("Client disconnected from WebSocket");
    });
  });

  // Broadcast function for real-time updates
  function broadcast(message: any) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  // Users
  app.get("/api/users", async (_req, res) => {
    const users = await storage.getUsers();
    res.json(users);
  });

  app.post("/api/users", async (req, res) => {
    const result = insertUserSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid user data" });
    }
    const user = await storage.createUser(result.data);
    broadcast({ type: "user_created", data: user });
    res.json(user);
  });

  app.post("/api/users/:id/activity", async (req, res) => {
    await storage.updateUserActivity(req.params.id);
    res.json({ success: true });
  });

  app.patch("/api/users/:id", async (req, res) => {
    const result = insertUserSchema.partial().safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid user data" });
    }
    const user = await storage.updateUser(req.params.id, result.data);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    broadcast({ type: "user_updated", data: user });
    res.json(user);
  });

  app.delete("/api/users/:id", async (req, res) => {
    const success = await storage.deleteUser(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "User not found" });
    }
    broadcast({ type: "user_deleted", data: { id: req.params.id } });
    res.json({ success: true });
  });

  // Articles
  app.get("/api/articles", async (_req, res) => {
    const articles = await storage.getArticles();
    res.json(articles);
  });

  app.post("/api/articles", async (req, res) => {
    const result = insertArticleSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid article data" });
    }
    const article = await storage.createArticle(result.data);
    broadcast({ type: "article_created", data: article });
    res.json(article);
  });

  app.post("/api/articles/import", upload.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    try {
      const workbook = read(req.file.buffer);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = utils.sheet_to_json(worksheet);

      const articles = data.map((row: any) => ({
        articleNumber: String(row.Artikelnummer || row.articleNumber || ""),
        description: String(row.Beskrivning || row.description || ""),
        length: String(row.Längd || row.length || ""),
        location: String(row.Lagerplats || row.location || ""),
      }));

      // Clear existing articles
      await storage.deleteAllArticles();

      const created = await storage.createArticles(articles);
      broadcast({ type: "articles_imported", data: created });
      res.json({ count: created.length, articles: created });
    } catch (error) {
      console.error("Import error:", error);
      res.status(500).json({ message: "Failed to import articles" });
    }
  });

  app.patch("/api/articles/:id", async (req, res) => {
    const article = await storage.getArticle(req.params.id);
    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    const updated = await storage.updateArticle(req.params.id, req.body);
    broadcast({ type: "article_updated", data: updated });
    res.json(updated);
  });

  app.post("/api/articles/:id/inventory", async (req, res) => {
    const result = updateArticleInventorySchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid inventory data" });
    }

    const article = await storage.getArticle(req.params.id);
    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    // Create inventory count entry
    const inventoryCount = await storage.createInventoryCount({
      articleId: req.params.id,
      userId: result.data.userId,
      count: result.data.inventoryCount,
      notes: result.data.notes,
    });

    broadcast({ type: "inventory_count_created", data: inventoryCount });
    res.json(inventoryCount);
  });

  // Inventory Counts
  app.get("/api/inventory-counts", async (_req, res) => {
    const inventoryCounts = await storage.getAllInventoryCounts();
    res.json(inventoryCounts);
  });

  app.get("/api/inventory-counts/article/:articleId", async (req, res) => {
    const inventoryCounts = await storage.getInventoryCounts(req.params.articleId);
    res.json(inventoryCounts);
  });

  app.patch("/api/inventory-counts/:id", async (req, res) => {
    const result = updateInventoryCountSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid inventory count data" });
    }
    
    // Filter out undefined values to avoid overwriting existing data
    const updates = Object.fromEntries(
      Object.entries(result.data).filter(([_, v]) => v !== undefined)
    );
    
    const updated = await storage.updateInventoryCount(req.params.id, updates);
    if (!updated) {
      return res.status(404).json({ message: "Inventory count not found" });
    }
    broadcast({ type: "inventory_count_updated", data: updated });
    res.json(updated);
  });

  app.delete("/api/inventory-counts/:id", async (req, res) => {
    // Fetch the inventory count before deletion to get articleId for broadcast
    const inventoryCount = await storage.getAllInventoryCounts().then(counts => 
      counts.find(ic => ic.id === req.params.id)
    );
    if (!inventoryCount) {
      return res.status(404).json({ message: "Inventory count not found" });
    }

    const deleted = await storage.deleteInventoryCount(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Inventory count not found" });
    }
    
    broadcast({ type: "inventory_count_deleted", data: { id: req.params.id, articleId: inventoryCount.articleId } });
    res.json({ success: true });
  });

  // Order Lines
  app.get("/api/order-lines", async (_req, res) => {
    const orderLines = await storage.getOrderLines();
    res.json(orderLines);
  });

  app.post("/api/order-lines", async (req, res) => {
    const result = insertOrderLineSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid order line data" });
    }
    const orderLine = await storage.createOrderLine(result.data);
    broadcast({ type: "order_line_created", data: orderLine });
    res.json(orderLine);
  });

  app.post("/api/order-lines/import", upload.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    try {
      const workbook = read(req.file.buffer);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = utils.sheet_to_json(worksheet);

      const orderLines = data.map((row: any) => ({
        orderNumber: String(row.Ordernummer || row.Ordernr || row.orderNumber || ""),
        articleNumber: String(row["art.nr"] || row.Artikelnummer || row.articleNumber || ""),
        description: String(row.Besk || row.Beskrivning || row.description || ""),
        length: String(row.Längd || row.length || ""),
        position: row.Pos ? String(row.Pos) : undefined,
        quantity: Number(row.Antal || row.quantity || 0),
        pickStatus: String(row.Plockstatt || row.Plockstatus || row.pickStatus || "Ej plockat"),
      }));

      // Clear existing order lines
      await storage.deleteAllOrderLines();

      const created = await storage.createOrderLines(orderLines);
      broadcast({ type: "order_lines_imported", data: created });
      res.json({ count: created.length, orderLines: created });
    } catch (error) {
      console.error("Import error:", error);
      res.status(500).json({ message: "Failed to import order lines" });
    }
  });

  app.post("/api/order-lines/:id/inventory", async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: "User ID required" });
    }

    const orderLine = await storage.getOrderLine(req.params.id);
    if (!orderLine) {
      return res.status(404).json({ message: "Order line not found" });
    }

    // Validate that only "Plockat" order lines can be inventoried
    if (orderLine.pickStatus !== "Plockat") {
      return res.status(400).json({ 
        message: "Endast plockade orderrader kan inventeras",
        pickStatus: orderLine.pickStatus 
      });
    }

    const updated = await storage.updateOrderLine(req.params.id, {
      isInventoried: true,
      inventoriedBy: userId,
      inventoriedAt: new Date().toISOString(),
    });

    broadcast({ type: "order_line_inventoried", data: updated });
    res.json(updated);
  });

  // Export endpoints
  app.get("/api/export/inventory", async (_req, res) => {
    const articles = await storage.getArticles();
    res.json(articles);
  });

  app.get("/api/export/orders", async (_req, res) => {
    const orderLines = await storage.getOrderLines();
    res.json(orderLines);
  });

  app.get("/api/export/discrepancies", async (_req, res) => {
    const articles = await storage.getArticles();
    const discrepancies = articles.filter(a => a.notes && a.notes.length > 0);
    res.json(discrepancies);
  });

  // Admin endpoints
  app.post("/api/admin/verify", async (req, res) => {
    const { password } = req.body;
    if (password === "admin123") {
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, message: "Felaktigt lösenord" });
    }
  });

  app.post("/api/admin/clear-data", async (req, res) => {
    const { password } = req.body;
    if (password !== "admin123") {
      return res.status(401).json({ success: false, message: "Felaktigt lösenord" });
    }

    await storage.clearAllData();
    broadcast({ type: "data_cleared" });
    res.json({ success: true, message: "Databasen har tömts" });
  });

  return httpServer;
}
