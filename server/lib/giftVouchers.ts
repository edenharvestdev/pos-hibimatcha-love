import { TRPCError } from "@trpc/server";
import { eq, and, sql } from "drizzle-orm";
import { posGiftVouchers } from "../../drizzle/schema";
import type { getDb } from "../db";

type DbLike = NonNullable<Awaited<ReturnType<typeof getDb>>> | Parameters<Parameters<NonNullable<Awaited<ReturnType<typeof getDb>>>["transaction"]>[0]>[0];

export async function lookupGiftVoucherBalance(db: DbLike, code: string, branchId?: number | null): Promise<number> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return 0;

  const [voucher] = await db.select().from(posGiftVouchers)
    .where(and(
      eq(posGiftVouchers.code, normalized),
      eq(posGiftVouchers.isActive, true),
    )).limit(1);

  if (!voucher) return 0;
  if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) return 0;
  if (voucher.branchId && branchId && voucher.branchId !== branchId) return 0;

  return Number(voucher.currentBalance ?? 0);
}

export async function deductGiftVoucherBalance(
  tx: DbLike,
  code: string,
  amount: number,
  branchId?: number | null,
): Promise<void> {
  const normalized = code.trim().toUpperCase();
  const balance = await lookupGiftVoucherBalance(tx, normalized, branchId);
  if (amount > balance) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `Voucher/Gift Card balance insufficient. Available: ฿${balance.toLocaleString()}`,
    });
  }

  await tx.update(posGiftVouchers).set({
    currentBalance: sql`${posGiftVouchers.currentBalance} - ${amount}`,
  }).where(eq(posGiftVouchers.code, normalized));
}
