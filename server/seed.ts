import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export async function seedDatabase() {
  const allUsers = await db.select().from(users);
  
  if (allUsers.length === 0) {
    const defaultPassword = "Euro2025!";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    
    await db.insert(users).values({
      id: crypto.randomUUID(),
      name: "Admin",
      role: "Administratör",
      email: "admin@example.com",
      password: hashedPassword,
      isActive: true,
      lastActive: new Date().toISOString()
    });
    console.log("Created default admin user");
  }
}
