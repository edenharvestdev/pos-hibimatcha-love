import { router, staffAdminProcedure, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { branches, staff } from "../../drizzle/schema";

export const adminRouter = router({
  // Example: List all branches (admin only)
  listBranches: staffAdminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(branches);
  }),

  // Example: Create a new branch
  createBranch: staffAdminProcedure.input(z.object({
    name: z.string().min(1),
    address: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const [created] = await db.insert(branches).values({
      name: input.name,
      address: input.address,
    }).returning();
    return created;
  }),

  // Example: List all staff (admin only)
  listStaff: staffAdminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(staff);
  }),

  // Example: Create staff (admin only)
  createStaff: staffAdminProcedure.input(z.object({
    employeeCode: z.string().min(1),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email().optional(),
    role: z.enum(["super_admin", "staff_admin", "staff"]),
    primaryBranchId: z.number().int().optional(),
    password: z.string().min(6).optional(),
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");
    const passwordHash = input.password ? await import("../lib/auth").then(m => m.hashPassword(input.password!)) : undefined;
    const [created] = await db.insert(staff).values({
      employeeCode: input.employeeCode,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      role: input.role,
      primaryBranchId: input.primaryBranchId,
      passwordHash,
    }).returning();
    return created;
  }),
});
