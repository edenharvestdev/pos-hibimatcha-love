import { TRPCError } from "@trpc/server";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import {
  branches, staff, staffBranches,
  posMenuItems, posBranchMenuItems,
  posInventoryItems, posBranchInventoryStock, posInventoryMovements,
  posSops, posCategories,
} from "../../drizzle/schema";
import { sql } from "drizzle-orm";
import { logAudit } from "../lib/audit";
import { publicProcedure, router, staffProcedure, staffAdminProcedure, superAdminProcedure } from "../_core/trpc";
import { hashPassword, hashPin } from "../lib/auth";

const BranchInput = z.object({
  name: z.string().min(1),
  branchCode: z.string().optional(),
  branchType: z.enum(["hq", "company-owned", "franchise"]).optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  province: z.string().optional(),
  district: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  timezone: z.string().optional(),
  taxRate: z.string().optional(),
  taxInclusive: z.boolean().optional(),
  operatingHours: z.record(z.string(), z.unknown()).optional(),
  openingDate: z.string().optional(),
  contractStartDate: z.string().optional(),
  contractEndDate: z.string().optional(),
  royaltyType: z.enum(["percentage", "fixed", "hybrid", "none"]).optional(),
  royaltyValue: z.string().optional(),
  franchiseOwnerId: z.number().optional(),
  accessCode: z.string().max(20).optional(),
  status: z.enum(["active", "inactive", "closed"]).optional(),
  businessModel: z.string().optional(),
  ownershipType: z.string().optional(),
  ownerName: z.string().optional(),
  ownerPhone: z.string().optional(),
  ownerEmail: z.string().optional(),
  ownerAddress: z.string().optional(),
  ownerTaxId: z.string().optional(),
  ownerCitizenId: z.string().optional(),
  ownerPassword: z.string().min(6).optional(),
  ownerPin: z.string().length(4).optional(),
});

export const branchesRouter = router({
  list: staffProcedure
    .input(z.object({ status: z.string().optional(), branchType: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      let rows = await db.select().from(branches);

      if (input?.status) rows = rows.filter((b) => b.status === input.status);
      if (input?.branchType) rows = rows.filter((b) => b.branchType === input.branchType);

      if (ctx.staff.role !== "super_admin" && ctx.staff.role !== "staff_admin") {
        const myBranchIds = await db.select({ branchId: staffBranches.branchId })
          .from(staffBranches).where(eq(staffBranches.staffId, ctx.staff.staffId));
        const ids = myBranchIds.map((b) => b.branchId);
        rows = rows.filter((b) => ids.includes(b.id));
      }

      return rows;
    }),

  listPublic: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select({
      id: branches.id,
      name: branches.name,
      branchCode: branches.branchCode,
      branchType: branches.branchType,
      status: branches.status,
      province: branches.province,
    }).from(branches).where(eq(branches.status, "active"));
  }),

  getById: staffProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [row] = await db.select().from(branches).where(eq(branches.id, input.id)).limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  create: staffAdminProcedure
    .input(BranchInput)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { ownerPassword, ownerPin, ...branchData } = input;

      let franchiseOwnerId = null;
      let empCode = null;

      // Automatically create a staff_admin account for the franchise owner if franchise & owner info provided
      if (input.branchType === "franchise" && input.ownerName && input.ownerPhone) {
        const [existing] = await db.select().from(staff).where(eq(staff.phone, input.ownerPhone)).limit(1);
        if (existing) {
          franchiseOwnerId = existing.id;
          empCode = existing.employeeCode;
        } else {
          empCode = "FR" + Math.floor(1000 + Math.random() * 9000);
          const names = input.ownerName.trim().split(/\s+/);
          const firstName = names[0] || "Owner";
          const lastName = names.slice(1).join(" ") || "Franchise";
          const [staffResult] = await db.insert(staff).values({
            employeeCode: empCode,
            firstName,
            lastName,
            phone: input.ownerPhone,
            email: input.ownerEmail,
            role: "staff_admin",
            employmentType: "contract",
            status: "active",
            passwordHash: ownerPassword ? hashPassword(ownerPassword) : undefined,
            pinHash: ownerPin ? hashPin(ownerPin) : undefined,
          });
          franchiseOwnerId = (staffResult as any).insertId as number;
        }
      }

      const [result] = await db.insert(branches).values({
        ...branchData,
        franchiseOwnerId: franchiseOwnerId || branchData.franchiseOwnerId,
      } as any);
      const id = (result as any).insertId as number;

      // Auto-link all active menu items to this new branch so the POS works immediately
      const activeMenuItems = await db.select().from(posMenuItems)
        .where(eq(posMenuItems.isArchived, false));
      if (activeMenuItems.length > 0) {
        for (const item of activeMenuItems) {
          await db.insert(posBranchMenuItems).values({
            branchId: id,
            menuItemId: item.id,
            isAvailable: true,
          }).onDuplicateKeyUpdate({ set: { isAvailable: true } });
        }
      }

      // Auto-link all active inventory items to the new branch with 0 stock
      const activeInventoryItems = await db.select().from(posInventoryItems)
        .where(eq(posInventoryItems.isActive, true));
      if (activeInventoryItems.length > 0) {
        for (const item of activeInventoryItems) {
          await db.insert(posBranchInventoryStock).values({
            branchId: id,
            inventoryItemId: item.id,
            currentStock: "0",
            reservedStock: "0",
          }).onDuplicateKeyUpdate({ set: { currentStock: "0" } });
        }
      }

      // Link owner to branch
      if (franchiseOwnerId) {
         await db.insert(staffBranches).values({
           staffId: franchiseOwnerId,
           branchId: id,
           isPrimary: true,
         });
         await db.update(staff).set({ primaryBranchId: id }).where(eq(staff.id, franchiseOwnerId));
      }

      const [created] = await db.select().from(branches).where(eq(branches.id, id)).limit(1);
      await logAudit({ staff: ctx.staff, action: "create", entity: "branches", entityId: id, afterData: created });
      return {
        ...created,
        ownerEmployeeCode: empCode,
      };
    }),

  update: staffAdminProcedure
    .input(z.object({ id: z.number().int() }).merge(BranchInput.partial()))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(branches).set(data as any).where(eq(branches.id, id));
      const [updated] = await db.select().from(branches).where(eq(branches.id, id)).limit(1);
      await logAudit({ staff: ctx.staff, action: "update", entity: "branches", entityId: id, afterData: updated });
      return updated;
    }),

  updateOperatingHours: staffAdminProcedure
    .input(z.object({ id: z.number().int(), hours: z.record(z.string(), z.unknown()) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(branches).set({ operatingHours: input.hours }).where(eq(branches.id, input.id));
      const [updated] = await db.select().from(branches).where(eq(branches.id, input.id)).limit(1);
      return updated;
    }),

  archive: superAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(branches).set({ status: "inactive" }).where(eq(branches.id, input.id));
      await logAudit({ staff: ctx.staff, action: "archive", entity: "branches", entityId: input.id });
      return { success: true };
    }),

  restore: superAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(branches).set({ status: "active" }).where(eq(branches.id, input.id));
      return { success: true };
    }),

  getMyBranches: staffProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    // Super admin and staff admin can see ALL branches
    if (ctx.staff.role === "super_admin" || ctx.staff.role === "staff_admin") {
      return db.select().from(branches);
    }
    const myBranchIds = await db.select({ branchId: staffBranches.branchId })
      .from(staffBranches).where(eq(staffBranches.staffId, ctx.staff.staffId));
    if (myBranchIds.length === 0) return [];
    return db.select().from(branches)
      .where(inArray(branches.id, myBranchIds.map((b) => b.branchId)));
  }),

  // ─── Universal "Distribute" — one entry point, multiple entity types ──
  // Used by the Distribute Center page + the inline "Send to branches" buttons
  // across Menu / Inventory / SOP pages. From HQ → target branches.
  distribute: superAdminProcedure
    .input(z.object({
      entityType: z.enum(["menu_items", "stock_items", "sops"]),
      entityIds: z.array(z.number().int()).min(1),
      branchIds: z.array(z.number().int()).min(1),
      // For stock_items only: how much to transfer (per item, single quantity for now)
      transferQuantity: z.string().optional(),
      transferUnit: z.string().optional(),
      note: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Sanity: must be HQ super admin distributing from HQ
      const [hq] = await db.select().from(branches).where(eq(branches.branchType, "hq")).limit(1);
      if (!hq) throw new TRPCError({ code: "BAD_REQUEST", message: "No HQ branch defined" });
      if (input.branchIds.includes(hq.id))
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot distribute to HQ itself" });

      let totalRows = 0;

      // ── MENU ITEMS — mark available at target branches ──
      if (input.entityType === "menu_items") {
        for (const menuId of input.entityIds) {
          for (const branchId of input.branchIds) {
            await db.insert(posBranchMenuItems).values({
              branchId, menuItemId: menuId, isAvailable: true,
            }).onDuplicateKeyUpdate({ set: { isAvailable: true } });
            totalRows++;
          }
        }
      }

      // ── STOCK — move qty from HQ to each target branch (HQ stock decreases) ──
      if (input.entityType === "stock_items") {
        const qty = Number(input.transferQuantity || "0");
        if (qty <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Quantity must be > 0" });
        const unit = (input.transferUnit || "piece") as any;

        for (const itemId of input.entityIds) {
          // Check HQ stock once per item
          const [hqStock] = await db.select().from(posBranchInventoryStock)
            .where(and(
              eq(posBranchInventoryStock.branchId, hq.id),
              eq(posBranchInventoryStock.inventoryItemId, itemId),
            )).limit(1);
          const available = Number(hqStock?.currentStock ?? 0);
          const totalNeeded = qty * input.branchIds.length;
          if (available < totalNeeded) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Item #${itemId}: HQ has ${available}, need ${totalNeeded} for ${input.branchIds.length} branch(es)`,
            });
          }

          for (const branchId of input.branchIds) {
            // Deduct HQ
            await db.update(posBranchInventoryStock).set({
              currentStock: sql`${posBranchInventoryStock.currentStock} - ${qty}`,
            }).where(and(
              eq(posBranchInventoryStock.branchId, hq.id),
              eq(posBranchInventoryStock.inventoryItemId, itemId),
            ));

            // Add to destination
            await db.insert(posBranchInventoryStock).values({
              branchId, inventoryItemId: itemId,
              currentStock: input.transferQuantity!, reservedStock: "0",
            }).onDuplicateKeyUpdate({ set: {
              currentStock: sql`${posBranchInventoryStock.currentStock} + ${qty}`,
            } });

            // Record both movement rows
            await db.insert(posInventoryMovements).values({
              branchId: hq.id, inventoryItemId: itemId,
              movementType: "transferred_out",
              quantity: String(-qty), unitOfMeasure: unit,
              referenceType: "transfer",
              notes: input.note ?? `distribute_to_branch_${branchId}`,
              performedByStaffId: ctx.staff.staffId,
            });
            await db.insert(posInventoryMovements).values({
              branchId, inventoryItemId: itemId,
              movementType: "transferred_in",
              quantity: input.transferQuantity!, unitOfMeasure: unit,
              referenceType: "transfer",
              notes: input.note ?? `distribute_from_branch_${hq.id}`,
              performedByStaffId: ctx.staff.staffId,
            });
            totalRows++;
          }
        }
      }

      // ── SOPs — mark visible to target branches via tags (or do nothing — SOPs are global) ──
      // For SOP, the "distribute" concept means: mark which branches must follow this SOP.
      // We use the existing acknowledgment system — no DB change needed beyond audit.
      if (input.entityType === "sops") {
        totalRows = input.entityIds.length * input.branchIds.length;
      }

      await logAudit({
        staff: ctx.staff,
        action: "distribute",
        entity: input.entityType,
        entityId: undefined,
        afterData: {
          entityType: input.entityType,
          entityIds: input.entityIds,
          branchIds: input.branchIds,
          quantity: input.transferQuantity,
          note: input.note,
          rowsAffected: totalRows,
        } as any,
      });

      return { success: true, rowsAffected: totalRows };
    }),

  delete: superAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Remove staff-branch links first
      await db.delete(staffBranches).where(eq(staffBranches.branchId, input.id));
      await db.delete(branches).where(eq(branches.id, input.id));
      await logAudit({ staff: ctx.staff, action: "delete", entity: "branches", entityId: input.id });
      return { success: true };
    }),
});
