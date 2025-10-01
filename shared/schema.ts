import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  role: text("role").notNull().default("Lagerarbetare"),
  email: text("email"),
  isActive: boolean("is_active").notNull().default(true),
  lastActive: timestamp("last_active").default(sql`now()`),
});

export const articles = pgTable("articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  articleNumber: text("article_number").notNull().unique(),
  description: text("description").notNull(),
  length: text("length").notNull(),
  location: text("location").notNull(),
  inventoryCount: integer("inventory_count"),
  notes: text("notes"),
  isInventoried: boolean("is_inventoried").notNull().default(false),
  lastInventoriedBy: varchar("last_inventoried_by").references(() => users.id),
  lastInventoriedAt: timestamp("last_inventoried_at"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const orderLines = pgTable("order_lines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderNumber: text("order_number").notNull(),
  articleNumber: text("article_number").notNull(),
  description: text("description").notNull(),
  length: text("length").notNull(),
  quantity: integer("quantity").notNull(),
  pickStatus: text("pick_status").notNull().default("Ej plockat"),
  isInventoried: boolean("is_inventoried").notNull().default(false),
  inventoriedBy: varchar("inventoried_by").references(() => users.id),
  inventoriedAt: timestamp("inventoried_at"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const inventoryCounts = pgTable("inventory_counts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  articleId: varchar("article_id").notNull().references(() => articles.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id),
  count: integer("count").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`now()`),
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
