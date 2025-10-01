import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export async function seedDatabase() {
  const defaultPassword = "Euro2025!";
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);
  
  const defaultUsers = [
    { name: "Anna Andersson", role: "Lagerarbetare", email: "anna.a@example.com", isActive: true },
    { name: "Erik Eriksson", role: "Lagerarbetare", email: "erik.e@example.com", isActive: true },
    { name: "Maria Nilsson", role: "Lagerchef", email: "maria.n@example.com", isActive: false },
    { name: "Admin", role: "Administratör", email: "admin@example.com", isActive: true },
  ];

  for (const user of defaultUsers) {
    const existing = await db.select().from(users).where(eq(users.name, user.name));
    
    if (existing.length === 0) {
      await db.insert(users).values({
        ...user,
        id: crypto.randomUUID(),
        password: hashedPassword,
        lastActive: new Date().toISOString()
      });
      console.log(`Created user: ${user.name}`);
    }
  }
}
