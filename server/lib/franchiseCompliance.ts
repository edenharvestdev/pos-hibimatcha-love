import { eq, and, gte, lte } from "drizzle-orm";
import {
  posSops,
  posSopAcknowledgments,
  staff,
  staffBranches,
  posWasteRecords,
  posOrders,
  posInventoryCountSessions,
  posInventoryLots,
  franchiseRoyalties,
} from "../../drizzle/schema";
import type { getDb } from "../db";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

function monthBounds(month: string) {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0, 23, 59, 59, 999);
  return { start, end };
}

export async function calculateFranchiseComplianceScores(
  db: Db,
  branchId: number,
  month: string,
) {
  const { start, end } = monthBounds(month);

  // ── SOP compliance (ack rate for published ack-required SOPs) ──
  let sops = await db.select().from(posSops)
    .where(and(eq(posSops.status, "published"), eq(posSops.requiresAcknowledgment, true)));

  const branchOverrides = sops.filter((s) => s.branchId === branchId && s.masterSopId !== null);
  const overriddenMasterIds = new Set(branchOverrides.map((s) => s.masterSopId));
  sops = sops.filter((s) => {
    if (s.branchId === branchId) return true;
    if (s.branchId === null && !overriddenMasterIds.has(s.id)) return true;
    return false;
  });

  const branchStaffIds = await db.select({ staffId: staffBranches.staffId })
    .from(staffBranches).where(eq(staffBranches.branchId, branchId));
  const staffIds = new Set(branchStaffIds.map((b) => b.staffId));
  const activeStaff = await db.select({ id: staff.id }).from(staff)
    .where(eq(staff.status, "active"));
  const relevantStaff = activeStaff.filter((s) => staffIds.has(s.id));

  const acks = await db.select().from(posSopAcknowledgments);
  const sopIds = new Set(sops.map((s) => s.id));
  const filteredAcks = acks.filter((a) => sopIds.has(a.sopId) && staffIds.has(a.staffId));

  const totalRequired = sops.length * Math.max(relevantStaff.length, 1);
  const sopCompliance = totalRequired > 0
    ? Math.min(100, (filteredAcks.length / totalRequired) * 100)
    : 100;

  // ── Waste rate (waste cost / revenue %) ──
  const wasteRows = await db.select().from(posWasteRecords)
    .where(and(
      eq(posWasteRecords.branchId, branchId),
      gte(posWasteRecords.createdAt, start),
      lte(posWasteRecords.createdAt, end),
    ));
  const wasteCost = wasteRows.reduce((sum, w) => sum + Number(w.totalCost ?? 0), 0);

  const orderRows = await db.select({ totalAmount: posOrders.totalAmount }).from(posOrders)
    .where(and(
      eq(posOrders.branchId, branchId),
      eq(posOrders.status, "completed"),
      gte(posOrders.completedAt, start),
      lte(posOrders.completedAt, end),
    ));
  const revenue = orderRows.reduce((sum, o) => sum + Number(o.totalAmount ?? 0), 0);
  const wasteRate = revenue > 0 ? Math.min(100, (wasteCost / revenue) * 100) : 0;

  // ── Stock count completion ──
  const countSessions = await db.select().from(posInventoryCountSessions)
    .where(and(
      eq(posInventoryCountSessions.branchId, branchId),
      gte(posInventoryCountSessions.createdAt, start),
      lte(posInventoryCountSessions.createdAt, end),
    ));
  const completedCounts = countSessions.filter((s) => s.status === "completed" || s.status === "closed").length;
  const stockCountCompletion = countSessions.length > 0
    ? (completedCounts / countSessions.length) * 100
    : 100;

  // ── Expiry compliance (% lots not expired at month end) ──
  const lots = await db.select().from(posInventoryLots)
    .where(eq(posInventoryLots.branchId, branchId));
  const activeLots = lots.filter((l) => Number(l.remainingQty ?? 0) > 0);
  const nonExpired = activeLots.filter((l) => !l.expiryDate || new Date(l.expiryDate) >= end).length;
  const expiryCompliance = activeLots.length > 0
    ? (nonExpired / activeLots.length) * 100
    : 100;

  // ── Revenue compliance (vs royalty record target if exists) ──
  const [royalty] = await db.select().from(franchiseRoyalties)
    .where(and(eq(franchiseRoyalties.branchId, branchId), eq(franchiseRoyalties.month, month))).limit(1);
  const targetRevenue = royalty ? Number(royalty.revenue) : revenue;
  const revenueCompliance = targetRevenue > 0
    ? Math.min(100, (revenue / targetRevenue) * 100)
    : 100;

  const overallScore = (
    sopCompliance * 0.3 +
    (100 - wasteRate) * 0.15 +
    stockCountCompletion * 0.2 +
    expiryCompliance * 0.15 +
    revenueCompliance * 0.2
  );

  return {
    sopCompliance: Math.round(sopCompliance * 100) / 100,
    wasteRate: Math.round(wasteRate * 100) / 100,
    stockCountCompletion: Math.round(stockCountCompletion * 100) / 100,
    expiryCompliance: Math.round(expiryCompliance * 100) / 100,
    revenueCompliance: Math.round(revenueCompliance * 100) / 100,
    overallScore: Math.round(overallScore * 100) / 100,
  };
}
