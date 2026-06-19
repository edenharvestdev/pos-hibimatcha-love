import { TRPCError } from "@trpc/server";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import { staff, branches, staffBranches } from "../../drizzle/schema";
import {
  hashPassword, verifyPassword, hashPin, verifyPin,
  signStaffToken,
} from "../lib/auth";
import { generateEmployeeCode } from "../lib/audit";
import { isDefaultPassword, isDefaultPin, DEFAULT_PASSWORDS } from "../lib/defaultCredentials";
import { createTotpSecret, getTotpUri, verifyTotpCode } from "../lib/totp";
import { publicProcedure, router, staffProcedure } from "../_core/trpc";

// ─── Rate Limiting for PIN login ────────────────────────────────────────────
const pinAttempts = new Map<string, { count: number; firstAttempt: number }>();
const PIN_MAX_ATTEMPTS = 5;
const PIN_WINDOW_MS = 60_000; // 1 minute

function checkPinRateLimit(branchId: number, pin: string): void {
  const key = `${branchId}`; // Rate limit per branch
  const now = Date.now();
  const record = pinAttempts.get(key);
  if (record) {
    // Reset if window expired
    if (now - record.firstAttempt > PIN_WINDOW_MS) {
      pinAttempts.set(key, { count: 1, firstAttempt: now });
      return;
    }
    if (record.count >= PIN_MAX_ATTEMPTS) {
      const remainingSec = Math.ceil((PIN_WINDOW_MS - (now - record.firstAttempt)) / 1000);
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Too many failed attempts. Please wait ${remainingSec} seconds.`,
      });
    }
    record.count++;
  } else {
    pinAttempts.set(key, { count: 1, firstAttempt: now });
  }
}

function resetPinRateLimit(branchId: number): void {
  pinAttempts.delete(`${branchId}`);
}

function staffUsesDefaultPassword(passwordHash: string | null | undefined): boolean {
  if (!passwordHash) return false;
  for (const pw of DEFAULT_PASSWORDS) {
    if (verifyPassword(pw, passwordHash)) return true;
  }
  return false;
}

export const authRouter = router({
  loginWithEmployeeCode: publicProcedure
    .input(z.object({
      employeeCode: z.string().min(1),
      password: z.string().min(1),
      totpCode: z.string().length(6).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [member] = await db.select().from(staff)
        .where(and(eq(staff.employeeCode, input.employeeCode), eq(staff.status, "active")))
        .limit(1);

      if (!member || !member.passwordHash)
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });

      if (!verifyPassword(input.password, member.passwordHash))
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });

      if (member.totpEnabled && member.totpSecret) {
        if (!input.totpCode) {
          return {
            requiresTotp: true as const,
            token: null,
            mustChangePassword: isDefaultPassword(input.password),
            staff: {
              id: member.id,
              employeeCode: member.employeeCode,
              firstName: member.firstName,
              lastName: member.lastName,
              role: member.role,
              primaryBranchId: member.primaryBranchId,
            },
          };
        }
        if (!await verifyTotpCode(member.totpSecret, input.totpCode)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid authenticator code" });
        }
      }

      // Re-hash with bcrypt if still using legacy format
      if (member.passwordHash.includes(":") && !member.passwordHash.startsWith("$2")) {
        const newHash = hashPassword(input.password);
        await db.update(staff).set({ passwordHash: newHash }).where(eq(staff.id, member.id));
      }

      await db.update(staff).set({ lastLoginAt: new Date() }).where(eq(staff.id, member.id));

      const token = await signStaffToken({
        staffId: member.id,
        role: member.role as "super_admin" | "staff_admin" | "staff",
        primaryBranchId: member.primaryBranchId,
        currentBranchId: member.primaryBranchId,
        employeeCode: member.employeeCode,
      });

      return {
        requiresTotp: false as const,
        token,
        mustChangePassword: isDefaultPassword(input.password),
        staff: {
          id: member.id,
          employeeCode: member.employeeCode,
          firstName: member.firstName,
          lastName: member.lastName,
          role: member.role,
          primaryBranchId: member.primaryBranchId,
        },
      };
    }),

  loginWithPin: publicProcedure
    .input(z.object({ branchId: z.number().int(), pin: z.string().length(4) }))
    .mutation(async ({ input }) => {
      // Rate limit check
      checkPinRateLimit(input.branchId, input.pin);

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Find all staff with a pin who are assigned to this branch
      const branchStaff = await db.select({ staffId: staffBranches.staffId })
        .from(staffBranches)
        .where(eq(staffBranches.branchId, input.branchId));

      const staffIds = branchStaff.map((s) => s.staffId);
      if (staffIds.length === 0) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });

      const allStaff = await db.select().from(staff)
        .where(eq(staff.status, "active"));

      const branchStaffList = allStaff.filter(
        (s) => staffIds.includes(s.id) && s.pinHash
      );

      const matched = branchStaffList.find((s) => verifyPin(input.pin, s.pinHash!));
      if (!matched) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });

      // Reset rate limit on success
      resetPinRateLimit(input.branchId);

      // Re-hash with bcrypt if still using legacy format
      if (matched.pinHash && matched.pinHash.includes(":") && !matched.pinHash.startsWith("$2")) {
        const newHash = hashPin(input.pin);
        await db.update(staff).set({ pinHash: newHash }).where(eq(staff.id, matched.id));
      }

      await db.update(staff).set({ lastLoginAt: new Date() }).where(eq(staff.id, matched.id));

      const token = await signStaffToken({
        staffId: matched.id,
        role: matched.role as "super_admin" | "staff_admin" | "staff",
        primaryBranchId: matched.primaryBranchId,
        currentBranchId: input.branchId,
        employeeCode: matched.employeeCode,
      });

      return {
        token,
        mustChangePin: isDefaultPin(input.pin),
        staff: {
          id: matched.id,
          employeeCode: matched.employeeCode,
          firstName: matched.firstName,
          lastName: matched.lastName,
          role: matched.role,
          primaryBranchId: matched.primaryBranchId,
          currentBranchId: input.branchId,
        },
      };
    }),

  me: staffProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const [member] = await db.select().from(staff)
      .where(eq(staff.id, ctx.staff.staffId)).limit(1);
    if (!member) throw new TRPCError({ code: "NOT_FOUND" });

    const myBranches = await db.select({ branchId: staffBranches.branchId })
      .from(staffBranches).where(eq(staffBranches.staffId, member.id));

    return {
      id: member.id,
      employeeCode: member.employeeCode,
      firstName: member.firstName,
      lastName: member.lastName,
      firstNameThai: member.firstNameThai,
      lastNameThai: member.lastNameThai,
      email: member.email,
      phone: member.phone,
      role: member.role,
      primaryBranchId: member.primaryBranchId,
      currentBranchId: ctx.staff.currentBranchId,
      branchIds: myBranches.map((b) => b.branchId),
      hasPin: !!member.pinHash,
      mustChangePassword: staffUsesDefaultPassword(member.passwordHash),
      totpEnabled: !!member.totpEnabled,
    };
  }),

  beginTotpSetup: staffProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const secret = createTotpSecret();
    await db.update(staff).set({ totpSecret: secret, totpEnabled: false })
      .where(eq(staff.id, ctx.staff.staffId));
    const [member] = await db.select().from(staff).where(eq(staff.id, ctx.staff.staffId)).limit(1);
    if (!member) throw new TRPCError({ code: "NOT_FOUND" });
    return {
      secret,
      uri: getTotpUri(member.employeeCode, secret),
    };
  }),

  enableTotp: staffProcedure
    .input(z.object({ code: z.string().length(6) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [member] = await db.select().from(staff).where(eq(staff.id, ctx.staff.staffId)).limit(1);
      if (!member?.totpSecret) throw new TRPCError({ code: "BAD_REQUEST", message: "Run setup first" });
      if (!await verifyTotpCode(member.totpSecret, input.code)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid code" });
      }
      await db.update(staff).set({ totpEnabled: true }).where(eq(staff.id, member.id));
      return { success: true };
    }),

  disableTotp: staffProcedure
    .input(z.object({ code: z.string().length(6) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [member] = await db.select().from(staff).where(eq(staff.id, ctx.staff.staffId)).limit(1);
      if (!member?.totpSecret || !member.totpEnabled) return { success: true };
      if (!await verifyTotpCode(member.totpSecret, input.code)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid code" });
      }
      await db.update(staff).set({ totpEnabled: false, totpSecret: null }).where(eq(staff.id, member.id));
      return { success: true };
    }),

  updateMyProfile: staffProcedure
    .input(z.object({
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      firstNameThai: z.string().optional(),
      lastNameThai: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(staff).set(input as any).where(eq(staff.id, ctx.staff.staffId));
      const [updated] = await db.select().from(staff).where(eq(staff.id, ctx.staff.staffId)).limit(1);
      return updated;
    }),

  changePassword: staffProcedure
    .input(z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(6) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [member] = await db.select().from(staff)
        .where(eq(staff.id, ctx.staff.staffId)).limit(1);
      if (!member?.passwordHash)
        throw new TRPCError({ code: "UNAUTHORIZED", message: "No password set" });
      if (!verifyPassword(input.currentPassword, member.passwordHash))
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password is incorrect" });

      await db.update(staff)
        .set({ passwordHash: hashPassword(input.newPassword) })
        .where(eq(staff.id, member.id));
      return { success: true };
    }),

  changePin: staffProcedure
    .input(z.object({ currentPin: z.string().length(4), newPin: z.string().length(4) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [member] = await db.select().from(staff)
        .where(eq(staff.id, ctx.staff.staffId)).limit(1);
      if (member?.pinHash && !verifyPin(input.currentPin, member.pinHash))
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Current PIN is incorrect" });

      await db.update(staff)
        .set({ pinHash: hashPin(input.newPin) })
        .where(eq(staff.id, ctx.staff.staffId));
      return { success: true };
    }),

  switchBranch: staffProcedure
    .input(z.object({ branchId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verify access - super_admin and staff_admin can access all branches
      if (ctx.staff.role !== "super_admin" && ctx.staff.role !== "staff_admin") {
        const [access] = await db.select().from(staffBranches)
          .where(and(
            eq(staffBranches.staffId, ctx.staff.staffId),
            eq(staffBranches.branchId, input.branchId)
          )).limit(1);
        if (!access) throw new TRPCError({ code: "FORBIDDEN", message: "No access to this branch" });
      }

      const token = await signStaffToken({ ...ctx.staff, currentBranchId: input.branchId });
      const [branch] = await db.select().from(branches)
        .where(eq(branches.id, input.branchId)).limit(1);
      return { token, branch };
    }),

  // Check whether bootstrap is needed (no staff exist yet)
  needsBootstrap: publicProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return { needsBootstrap: false, dbReady: false };
      try {
        const existing = await db.select().from(staff).limit(1);
        return { needsBootstrap: existing.length === 0, dbReady: true };
      } catch {
        return { needsBootstrap: false, dbReady: false };
      }
    }),

  // Bootstrap: create the first super admin when no staff exist
  bootstrap: publicProcedure
    .input(z.object({
      employeeCode: z.string().optional(),
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: z.string().email(),
      password: z.string().min(6),
      pin: z.string().length(4).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const existing = await db.select().from(staff).limit(1);
      if (existing.length > 0)
        throw new TRPCError({ code: "FORBIDDEN", message: "System already bootstrapped" });

      const code = input.employeeCode || "HMC-0001";
      const [created] = await db.insert(staff).values({
        employeeCode: code,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        passwordHash: hashPassword(input.password),
        pinHash: input.pin ? hashPin(input.pin) : undefined,
        role: "super_admin",
        status: "active",
      });

      return { success: true, employeeCode: code };
    }),
});
