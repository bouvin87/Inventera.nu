import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull().default("Lagerarbetare"),
  email: text("email"),
  isActive: integer("is_active", { mode: 'boolean' }).notNull().default(true),
  lastActive: text("last_active"),
});

export const articles = sqliteTable("articles", {
  id: text("id").primaryKey(),
  articleNumber: text("article_number").notNull().unique(),
  description: text("description").notNull(),
  length: text("length").notNull(),
  location: text("location").notNull(),
  inventoryCount: integer("inventory_count"),
  notes: text("notes"),
  isInventoried: integer("is_inventoried", { mode: 'boolean' }).notNull().default(false),
  lastInventoriedBy: text("last_inventoried_by").references(() => users.id),
  lastInventoriedAt: text("last_inventoried_at"),
  createdAt: text("created_at"),
});

export const orderLines = sqliteTable("order_lines", {
  id: text("id").primaryKey(),
  orderNumber: text("order_number").notNull(),
  articleNumber: text("article_number").notNull(),
  description: text("description").notNull(),
  length: text("length").notNull(),
  quantity: integer("quantity").notNull(),
  pickStatus: text("pick_status").notNull().default("Ej plockat"),
  isInventoried: integer("is_inventoried", { mode: 'boolean' }).notNull().default(false),
  inventoriedBy: text("inventoried_by").references(() => users.id),
  inventoriedAt: text("inventoried_at"),
  createdAt: text("created_at"),
});

export const inventoryCounts = sqliteTable("inventory_counts", {
  id: text("id").primaryKey(),
  articleId: text("article_id").notNull().references(() => articles.id, { onDelete: 'cascade' }),
  userId: text("user_id").notNull().references(() => users.id),
  count: integer("count").notNull(),
  notes: text("notes"),
  createdAt: text("created_at"),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  lastActive: true,
});

export const insertArticleSchema = createInsertSchema(articles).omit({
  id: true,
  createdAt: true,
  lastInventoriedAt: true,
});

export const insertOrderLineSchema = createInsertSchema(orderLines).omit({
  id: true,
  createdAt: true,
  inventoriedAt: true,
});

export const insertInventoryCountSchema = createInsertSchema(inventoryCounts).omit({
  id: true,
  createdAt: true,
});

export const updateArticleInventorySchema = z.object({
  inventoryCount: z.number().int().min(0),
  notes: z.string().optional(),
  userId: z.string(),
});

export const updateInventoryCountSchema = z.object({
  count: z.number().int().min(0).optional(),
  notes: z.string().nullable().optional(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Article = typeof articles.$inferSelect;
export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type OrderLine = typeof orderLines.$inferSelect;
export type InsertOrderLine = z.infer<typeof insertOrderLineSchema>;
export type InventoryCount = typeof inventoryCounts.$inferSelect;
export type InsertInventoryCount = z.infer<typeof insertInventoryCountSchema>;
