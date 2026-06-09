// server/routes/auth.ts
import { publicProcedure, router, staffProcedure } from "../_core/trpc";
import { z } from "zod";
import { signStaffToken, verifyPassword, hashPassword, verifyPin, hashPin } from "../lib/auth";
import { getDb } from "../db";
import { staff, staffBranches } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

export const authRouter = router({
  // Staff login with employee code & password
  login: publicProcedure
    .input(z.object({ employeeCode: z.string(), password: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const [member] = await db.select().from(staff).where(and(eq(staff.employeeCode, input.employeeCode), eq(staff.status, "active"))).limit(1);
      if (!member || !member.passwordHash) throw new Error("Invalid credentials");
      if (!verifyPassword(input.password, member.passwordHash)) throw new Error("Invalid credentials");
      const token = await signStaffToken({
        staffId: member.id,
        role: member.role as any,
        primaryBranchId: member.primaryBranchId,
        currentBranchId: member.primaryBranchId,
        employeeCode: member.employeeCode,
      });
      return { token, staff: member };
    }),

  // PIN login (branch specific)
  loginWithPin: publicProcedure
    .input(z.object({ branchId: z.number(), pin: z.string().length(4) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const branchStaff = await db.select({ staffId: staffBranches.staffId }).from(staffBranches).where(eq(staffBranches.branchId, input.branchId));
      const staffIds = branchStaff.map(s => s.staffId);
      const allStaff = await db.select().from(staff).where(eq(staff.status, "active"));
      const matched = allStaff.find(s => staffIds.includes(s.id) && s.pinHash && verifyPin(input.pin, s.pinHash));
      if (!matched) throw new Error("Invalid credentials");
      const token = await signStaffToken({
        staffId: matched.id,
        role: matched.role as any,
        primaryBranchId: matched.primaryBranchId,
        currentBranchId: input.branchId,
        employeeCode: matched.employeeCode,
      });
      return { token, staff: matched };
    }),

  // Token refresh (public, expects bearer token)
  refresh: publicProcedure.input(z.object({})).mutation(async ({ ctx }) => {
    // token verification already done in middleware, just re‑issue
    if (!ctx.staff) throw new Error("Unauthenticated");
    const newToken = await signStaffToken({
      staffId: ctx.staff.staffId,
      role: ctx.staff.role as any,
      primaryBranchId: ctx.staff.primaryBranchId,
      currentBranchId: ctx.staff.currentBranchId,
      employeeCode: ctx.staff.employeeCode,
    });
    return { token: newToken };
  }),

  // Logout (client can simply discard token)
  logout: publicProcedure.mutation(() => {
    return { success: true };
  }),
});
