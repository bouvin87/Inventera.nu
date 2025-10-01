import {
  type User,
  type InsertUser,
  type Article,
  type InsertArticle,
  type OrderLine,
  type InsertOrderLine,
  type InventoryCount,
  type InsertInventoryCount,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  getUserByName(name: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserActivity(id: string): Promise<void>;

  // Articles
  getArticles(): Promise<Article[]>;
  getArticle(id: string): Promise<Article | undefined>;
  createArticle(article: InsertArticle): Promise<Article>;
  createArticles(articles: InsertArticle[]): Promise<Article[]>;
  updateArticle(id: string, article: Partial<Article>): Promise<Article | undefined>;
  deleteAllArticles(): Promise<void>;

  // Order Lines
  getOrderLines(): Promise<OrderLine[]>;
  getOrderLine(id: string): Promise<OrderLine | undefined>;
  createOrderLine(orderLine: InsertOrderLine): Promise<OrderLine>;
  createOrderLines(orderLines: InsertOrderLine[]): Promise<OrderLine[]>;
  updateOrderLine(id: string, orderLine: Partial<OrderLine>): Promise<OrderLine | undefined>;
  deleteAllOrderLines(): Promise<void>;

  // Inventory Counts
  getInventoryCounts(articleId: string): Promise<InventoryCount[]>;
  getAllInventoryCounts(): Promise<InventoryCount[]>;
  createInventoryCount(inventoryCount: InsertInventoryCount): Promise<InventoryCount>;
  updateInventoryCount(id: string, updates: Partial<InventoryCount>): Promise<InventoryCount | undefined>;
  deleteInventoryCount(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private articles: Map<string, Article>;
  private orderLines: Map<string, OrderLine>;
  private inventoryCounts: Map<string, InventoryCount>;

  constructor() {
    this.users = new Map();
    this.articles = new Map();
    this.orderLines = new Map();
    this.inventoryCounts = new Map();

    // Initialize with default users
    const defaultUsers: InsertUser[] = [
      { name: "Anna Andersson", role: "Lagerarbetare", email: "anna.a@example.com", isActive: true },
      { name: "Erik Eriksson", role: "Lagerarbetare", email: "erik.e@example.com", isActive: true },
      { name: "Maria Nilsson", role: "Lagerchef", email: "maria.n@example.com", isActive: false },
      { name: "Admin", role: "Administratör", email: "admin@example.com", isActive: true },
    ];

    defaultUsers.forEach(user => {
      const id = randomUUID();
      this.users.set(id, { 
        ...user, 
        id, 
        role: user.role || "Lagerarbetare",
        email: user.email || null,
        isActive: user.isActive ?? true,
        lastActive: new Date() 
      });
    });
  }

  // Users
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByName(name: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.name === name);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id, 
      role: insertUser.role || "Lagerarbetare",
      email: insertUser.email || null,
      isActive: insertUser.isActive ?? true,
      lastActive: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserActivity(id: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.lastActive = new Date();
      user.isActive = true;
    }
  }

  // Articles
  async getArticles(): Promise<Article[]> {
    return Array.from(this.articles.values());
  }

  async getArticle(id: string): Promise<Article | undefined> {
    return this.articles.get(id);
  }

  async createArticle(insertArticle: InsertArticle): Promise<Article> {
    const id = randomUUID();
    const article: Article = {
      ...insertArticle,
      id,
      inventoryCount: insertArticle.inventoryCount ?? null,
      notes: insertArticle.notes ?? null,
      isInventoried: insertArticle.isInventoried ?? false,
      lastInventoriedBy: insertArticle.lastInventoriedBy ?? null,
      lastInventoriedAt: null,
      createdAt: new Date(),
    };
    this.articles.set(id, article);
    return article;
  }

  async createArticles(insertArticles: InsertArticle[]): Promise<Article[]> {
    const articles = await Promise.all(
      insertArticles.map(article => this.createArticle(article))
    );
    return articles;
  }

  async updateArticle(id: string, updates: Partial<Article>): Promise<Article | undefined> {
    const article = this.articles.get(id);
    if (!article) return undefined;

    const updated = { ...article, ...updates };
    this.articles.set(id, updated);
    return updated;
  }

  async deleteAllArticles(): Promise<void> {
    this.articles.clear();
  }

  // Order Lines
  async getOrderLines(): Promise<OrderLine[]> {
    return Array.from(this.orderLines.values());
  }

  async getOrderLine(id: string): Promise<OrderLine | undefined> {
    return this.orderLines.get(id);
  }

  async createOrderLine(insertOrderLine: InsertOrderLine): Promise<OrderLine> {
    const id = randomUUID();
    const orderLine: OrderLine = {
      ...insertOrderLine,
      id,
      pickStatus: insertOrderLine.pickStatus || "Ej plockat",
      isInventoried: insertOrderLine.isInventoried ?? false,
      inventoriedBy: insertOrderLine.inventoriedBy ?? null,
      inventoriedAt: null,
      createdAt: new Date(),
    };
    this.orderLines.set(id, orderLine);
    return orderLine;
  }

  async createOrderLines(insertOrderLines: InsertOrderLine[]): Promise<OrderLine[]> {
    const orderLines = await Promise.all(
      insertOrderLines.map(orderLine => this.createOrderLine(orderLine))
    );
    return orderLines;
  }

  async updateOrderLine(id: string, updates: Partial<OrderLine>): Promise<OrderLine | undefined> {
    const orderLine = this.orderLines.get(id);
    if (!orderLine) return undefined;

    const updated = { ...orderLine, ...updates };
    this.orderLines.set(id, updated);
    return updated;
  }

  async deleteAllOrderLines(): Promise<void> {
    this.orderLines.clear();
  }

  // Inventory Counts
  async getInventoryCounts(articleId: string): Promise<InventoryCount[]> {
    return Array.from(this.inventoryCounts.values()).filter(ic => ic.articleId === articleId);
  }

  async getAllInventoryCounts(): Promise<InventoryCount[]> {
    return Array.from(this.inventoryCounts.values());
  }

  async createInventoryCount(insertInventoryCount: InsertInventoryCount): Promise<InventoryCount> {
    const id = randomUUID();
    const inventoryCount: InventoryCount = {
      ...insertInventoryCount,
      id,
      notes: insertInventoryCount.notes ?? null,
      createdAt: new Date(),
    };
    this.inventoryCounts.set(id, inventoryCount);
    return inventoryCount;
  }

  async updateInventoryCount(id: string, updates: Partial<InventoryCount>): Promise<InventoryCount | undefined> {
    const inventoryCount = this.inventoryCounts.get(id);
    if (!inventoryCount) return undefined;

    const updated = { ...inventoryCount, ...updates };
    this.inventoryCounts.set(id, updated);
    return updated;
  }

  async deleteInventoryCount(id: string): Promise<boolean> {
    return this.inventoryCounts.delete(id);
  }
}

export const storage = new MemStorage();
