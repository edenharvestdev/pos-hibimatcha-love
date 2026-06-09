// ============================================
// Members Router — Customer registration + loyalty points
// ============================================
import { TRPCError } from "@trpc/server";
import { eq, and, desc, sql, sum } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import {
  members, memberPoints, branches, pdpaConsents,
} from "../../drizzle/schema";
import { router, publicProcedure, staffProcedure, staffAdminProcedure } from "../_core/trpc";

// ── JWT helpers for member tokens ──────────────────────────────────────────
import { SignJWT, jwtVerify } from "jose";
const MEMBER_JWT_SECRET = new TextEncoder().encode(
  process.env.MEMBER_JWT_SECRET || process.env.JWT_SECRET || "hibi-member-secret-change-me"
);

async function signMemberToken(memberId: number): Promise<string> {
  return await new SignJWT({ memberId, type: "member" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(MEMBER_JWT_SECRET);
}

export async function verifyMemberToken(token: string): Promise<{ memberId: number } | null> {
  try {
    const { payload } = await jwtVerify(token, MEMBER_JWT_SECRET);
    if (payload.type !== "member") return null;
    return { memberId: payload.memberId as number };
  } catch {
    return null;
  }
}

// ── OTP store (in-memory for now, use Redis in production) ─────────────────
const otpStore = new Map<string, { code: string; expiresAt: number; attempts: number }>();

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function storeOtp(phone: string, code: string) {
  otpStore.set(phone, { code, expiresAt: Date.now() + 5 * 60 * 1000, attempts: 0 }); // 5 min expiry
}

function verifyOtp(phone: string, code: string): boolean {
  const entry = otpStore.get(phone);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) { otpStore.delete(phone); return false; }
  entry.attempts++;
  if (entry.attempts > 5) { otpStore.delete(phone); return false; }
  if (entry.code !== code) return false;
  otpStore.delete(phone);
  return true;
}

export const membersRouter = router({
  // ── Request OTP ────────────────────────────────────────────────────────────
  requestOtp: publicProcedure
    .input(z.object({ phone: z.string().min(9) }))
    .mutation(async ({ input }) => {
      const otp = generateOtp();
      storeOtp(input.phone, otp);
      // TODO: Send via SMS (Twilio/PromptPay SMS) — mock in dev
      console.log(`[OTP] Phone: ${input.phone} Code: ${otp}`);
      return { success: true, devOtp: process.env.NODE_ENV === "development" ? otp : undefined };
    }),

  // ── Register or Login with OTP ─────────────────────────────────────────────
  verifyOtpAndLogin: publicProcedure
    .input(z.object({
      phone: z.string().min(9),
      otp: z.string().length(6),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().email().optional(),
      pdpaConsent: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      // In dev mode, allow "000000" as bypass OTP
      const isDevBypass = process.env.NODE_ENV === "development" && input.otp === "000000";
      if (!isDevBypass && !verifyOtp(input.phone, input.otp)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "รหัส OTP ไม่ถูกต้องหรือหมดอายุแล้ว" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Upsert member
      let [member] = await db.select().from(members).where(eq(members.phone, input.phone)).limit(1);
      if (!member) {
        if (!input.pdpaConsent) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "ต้องยินยอม PDPA ก่อนสมัครสมาชิก" });
        }
        const [result] = await db.insert(members).values({
          phone: input.phone,
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          isVerified: true,
          pdpaConsentAt: new Date(),
          pdpaConsentVersion: "1.0",
          status: "active",
        });
        const id = (result as any).insertId as number;

        // Log PDPA consent
        await db.insert(pdpaConsents).values({
          memberId: id,
          consentType: "member_registration",
          consentVersion: "1.0",
          consentGiven: true,
          consentAt: new Date(),
          ipAddress: (ctx.req as any)?.ip || "unknown",
        });

        [member] = await db.select().from(members).where(eq(members.id, id)).limit(1);
      }

      const token = await signMemberToken(member.id);
      return { member, token };
    }),

  // ── Get my profile ──────────────────────────────────────────────────────────
  me: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const payload = await verifyMemberToken(input.token);
      if (!payload) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [member] = await db.select().from(members).where(eq(members.id, payload.memberId)).limit(1);
      if (!member) throw new TRPCError({ code: "NOT_FOUND" });
      return member;
    }),

  // ── Update profile ──────────────────────────────────────────────────────────
  updateProfile: publicProcedure
    .input(z.object({
      token: z.string(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().email().optional(),
      birthDate: z.string().optional(),
      avatarUrl: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const payload = await verifyMemberToken(input.token);
      if (!payload) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { token, ...data } = input;
      await db.update(members).set(data as any).where(eq(members.id, payload.memberId));
      const [updated] = await db.select().from(members).where(eq(members.id, payload.memberId)).limit(1);
      return updated;
    }),

  // ── Get points balance per branch ───────────────────────────────────────────
  getPointsBalance: publicProcedure
    .input(z.object({ token: z.string(), branchId: z.number().int() }))
    .query(async ({ input }) => {
      const payload = await verifyMemberToken(input.token);
      if (!payload) throw new TRPCError({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) return { balance: 0, history: [] };

      const history = await db.select().from(memberPoints)
        .where(and(
          eq(memberPoints.memberId, payload.memberId),
          eq(memberPoints.branchId, input.branchId),
        ))
        .orderBy(desc(memberPoints.createdAt))
        .limit(50);

      // Calculate current balance from history
      const balance = history.reduce((acc, p) => {
        if (p.type === "earn" || p.type === "adjust") return acc + Number(p.points);
        if (p.type === "redeem" || p.type === "expire") return acc - Number(p.points);
        return acc;
      }, 0);

      return { balance: Math.max(0, balance), history };
    }),

  // ── Earn points (called by POS after order complete) ────────────────────────
  earnPoints: staffProcedure
    .input(z.object({
      memberId: z.number().int(),
      branchId: z.number().int(),
      orderId: z.number().int(),
      orderTotal: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Get branch loyalty settings
      const [branch] = await db.select().from(branches).where(eq(branches.id, input.branchId)).limit(1);
      if (!branch?.loyaltyEnabled) return { success: false, message: "Loyalty not enabled for this branch" };

      const pointsPerBaht = Number(branch.loyaltyPointsPerBaht ?? 0.04);
      const minOrder = Number(branch.loyaltyMinOrderForPoints ?? 0);
      if (input.orderTotal < minOrder) return { success: false, message: "ยอดสั่งไม่ถึงขั้นต่ำสะสมแต้ม" };

      const pointsEarned = Math.floor(input.orderTotal * pointsPerBaht);
      if (pointsEarned <= 0) return { success: false, message: "ไม่มีแต้มสะสม" };

      // Calculate current balance
      const existing = await db.select().from(memberPoints)
        .where(and(eq(memberPoints.memberId, input.memberId), eq(memberPoints.branchId, input.branchId)));
      const currentBalance = existing.reduce((acc, p) => {
        if (["earn", "adjust"].includes(p.type)) return acc + Number(p.points);
        return acc - Number(p.points);
      }, 0);

      const expireDays = branch.loyaltyPointExpireDays ?? 365;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expireDays);

      await db.insert(memberPoints).values({
        memberId: input.memberId,
        branchId: input.branchId,
        type: "earn",
        points: String(pointsEarned),
        balanceBefore: String(currentBalance),
        balanceAfter: String(currentBalance + pointsEarned),
        orderId: input.orderId,
        expiresAt,
        notes: `สะสมแต้มจาก order #${input.orderId}`,
        createdByStaffId: ctx.staff.staffId,
      });

      return { success: true, pointsEarned, newBalance: currentBalance + pointsEarned };
    }),

  // ── Redeem points ────────────────────────────────────────────────────────────
  redeemPoints: staffProcedure
    .input(z.object({
      memberId: z.number().int(),
      branchId: z.number().int(),
      points: z.number().positive(),
      orderId: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [branch] = await db.select().from(branches).where(eq(branches.id, input.branchId)).limit(1);
      if (!branch?.loyaltyEnabled) throw new TRPCError({ code: "BAD_REQUEST", message: "ไม่ได้เปิดใช้ Loyalty" });

      // Calculate current balance
      const existing = await db.select().from(memberPoints)
        .where(and(eq(memberPoints.memberId, input.memberId), eq(memberPoints.branchId, input.branchId)));
      const currentBalance = existing.reduce((acc, p) => {
        if (["earn", "adjust"].includes(p.type)) return acc + Number(p.points);
        return acc - Number(p.points);
      }, 0);

      if (currentBalance < input.points) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `แต้มไม่พอ (มี ${currentBalance} แต้ม)` });
      }

      const redeemRate = Number(branch.loyaltyRedeemRate ?? 1);
      const discountValue = input.points * redeemRate;

      await db.insert(memberPoints).values({
        memberId: input.memberId,
        branchId: input.branchId,
        type: "redeem",
        points: String(input.points),
        balanceBefore: String(currentBalance),
        balanceAfter: String(currentBalance - input.points),
        orderId: input.orderId,
        notes: `แลกแต้ม ${input.points} แต้ม = ${discountValue} บาท`,
        createdByStaffId: ctx.staff.staffId,
      });

      return { success: true, pointsRedeemed: input.points, discountValue, newBalance: currentBalance - input.points };
    }),

  // ── Admin: list members ─────────────────────────────────────────────────────
  list: staffAdminProcedure
    .input(z.object({ search: z.string().optional(), status: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      let rows = await db.select().from(members).orderBy(desc(members.createdAt));
      if (input?.status) rows = rows.filter((m) => m.status === input.status);
      if (input?.search) {
        const q = input.search.toLowerCase();
        rows = rows.filter((m) =>
          (m.phone ?? "").includes(q) ||
          (m.firstName ?? "").toLowerCase().includes(q) ||
          (m.lastName ?? "").toLowerCase().includes(q) ||
          (m.email ?? "").toLowerCase().includes(q)
        );
      }
      return rows;
    }),

  // ── Admin: adjust points manually ──────────────────────────────────────────
  adjustPoints: staffAdminProcedure
    .input(z.object({
      memberId: z.number().int(),
      branchId: z.number().int(),
      points: z.number(),
      reason: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const existing = await db.select().from(memberPoints)
        .where(and(eq(memberPoints.memberId, input.memberId), eq(memberPoints.branchId, input.branchId)));
      const currentBalance = existing.reduce((acc, p) => {
        if (["earn", "adjust"].includes(p.type)) return acc + Number(p.points);
        return acc - Number(p.points);
      }, 0);

      await db.insert(memberPoints).values({
        memberId: input.memberId,
        branchId: input.branchId,
        type: "adjust",
        points: String(Math.abs(input.points)),
        balanceBefore: String(currentBalance),
        balanceAfter: String(currentBalance + input.points),
        notes: `Admin adjust: ${input.reason}`,
        createdByStaffId: ctx.staff.staffId,
      });

      return { success: true, newBalance: currentBalance + input.points };
    }),
});
