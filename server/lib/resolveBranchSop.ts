import { eq, and } from "drizzle-orm";
import { posSops } from "../../drizzle/schema";
import type { getDb } from "../db";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

const SOP_FIELDS = {
  id: posSops.id,
  title: posSops.title,
  titleThai: posSops.titleThai,
  subtitle: posSops.subtitle,
  content: posSops.content,
  status: posSops.status,
  masterSopId: posSops.masterSopId,
  branchId: posSops.branchId,
  version: posSops.version,
};

/** Resolve branch SOP override when a menu item links to a master SOP. */
export async function resolveBranchSop(
  db: Db,
  masterSopId: number | null | undefined,
  branchId?: number | null,
) {
  if (!masterSopId) return null;

  if (branchId) {
    const [override] = await db.select(SOP_FIELDS).from(posSops)
      .where(and(
        eq(posSops.masterSopId, masterSopId),
        eq(posSops.branchId, branchId),
        eq(posSops.status, "published"),
      )).limit(1);
    if (override) return override;
  }

  const [master] = await db.select(SOP_FIELDS).from(posSops)
    .where(eq(posSops.id, masterSopId)).limit(1);
  return master ?? null;
}
