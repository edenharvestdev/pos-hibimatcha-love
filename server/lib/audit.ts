import { getDb } from "../db";
import { auditLogs } from "../../drizzle/schema";
import type { StaffTokenPayload } from "./auth";

export async function logAudit(params: {
  staff: StaffTokenPayload | null;
  action: string;
  entity: string;
  entityId?: number;
  details?: string;
  beforeData?: unknown;
  afterData?: unknown;
  ipAddress?: string;
}): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    await db.insert(auditLogs).values({
      actorType: params.staff ? "staff" : "system",
      actorId: params.staff?.staffId ?? undefined,
      actorName: params.staff?.employeeCode ?? undefined,
      branchId: params.staff?.currentBranchId ?? undefined,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      details: params.details,
      beforeData: params.beforeData as object ?? undefined,
      afterData: params.afterData as object ?? undefined,
      ipAddress: params.ipAddress,
    });
  } catch {
    // Audit log failures are non-fatal
  }
}

export function generateOrderNumber(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return `ORD-${y}${m}${d}-${rand}`;
}

export function generatePoNumber(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return `PO-${y}${m}${d}-${rand}`;
}

export function generateTicketNumber(date: Date = new Date()): string {
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 900) + 100);
  return `T${h}${min}-${rand}`;
}

export function generateEmployeeCode(existingCount: number): string {
  return `HMC-${String(existingCount + 1).padStart(4, "0")}`;
}
