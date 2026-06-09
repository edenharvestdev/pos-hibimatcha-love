import { TRPCError } from "@trpc/server";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import { branches, staff, staffBranches, posOrders } from "../../drizzle/schema";
import { logAudit } from "../lib/audit";
import { router, superAdminProcedure, staffAdminProcedure } from "../_core/trpc";

export const franchiseRouter = router({
  listBranches: superAdminProcedure
    .input(z.object({ type: z.string().optional(), status: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      let rows = await db.select().from(branches);
      if (input?.type) rows = rows.filter((b) => b.branchType === input.type);
      if (input?.status) rows = rows.filter((b) => b.status === input.status);
      return rows;
    }),

  getBranchDetail: superAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [branch] = await db.select().from(branches).where(eq(branches.id, input.id)).limit(1);
      if (!branch) throw new TRPCError({ code: "NOT_FOUND" });

      const branchStaffLinks = await db.select({ staffId: staffBranches.staffId })
        .from(staffBranches).where(eq(staffBranches.branchId, input.id));
      const staffCount = branchStaffLinks.length;

      const orders = await db.select().from(posOrders).where(eq(posOrders.branchId, input.id));
      const completedOrders = orders.filter((o) => ["completed", "served"].includes(o.status ?? ""));
      const totalRevenue = completedOrders.reduce((sum, o) => sum + Number(o.totalAmount ?? 0), 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const todayOrders = completedOrders.filter((o) =>
        o.createdAt && o.createdAt >= today && o.createdAt < tomorrow
      );

      return {
        ...branch,
        stats: {
          staffCount,
          totalOrders: completedOrders.length,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          todayOrders: todayOrders.length,
          todayRevenue: Math.round(todayOrders.reduce((s, o) => s + Number(o.totalAmount ?? 0), 0) * 100) / 100,
        },
      };
    }),

  openNewBranch: superAdminProcedure
    .input(z.object({
      name: z.string().min(1),
      branchCode: z.string().optional(),
      branchType: z.enum(["hq", "company-owned", "franchise"]).optional(),
      address: z.string().optional(),
      province: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      contractStartDate: z.string().optional(),
      contractEndDate: z.string().optional(),
      royaltyType: z.enum(["percentage", "fixed", "none"]).optional(),
      royaltyValue: z.string().optional(),
      // Owner info
      ownerFirstName: z.string().optional(),
      ownerLastName: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      
      let franchiseOwnerId = null;

      // Create owner account if owner info provided
      if (input.ownerFirstName && input.phone) {
        const [existing] = await db.select().from(staff).where(eq(staff.phone, input.phone)).limit(1);
        if (existing) {
          franchiseOwnerId = existing.id;
        } else {
          // generate random employee code
          const empCode = "FR" + Math.floor(1000 + Math.random() * 9000);
          const [staffResult] = await db.insert(staff).values({
            employeeCode: empCode,
            firstName: input.ownerFirstName,
            lastName: input.ownerLastName,
            phone: input.phone,
            email: input.email,
            role: "staff_admin",
            employmentType: "contract",
            status: "active",
          });
          franchiseOwnerId = (staffResult as any).insertId as number;
        }
      }

      const [result] = await db.insert(branches).values({
        name: input.name,
        branchCode: input.branchCode,
        branchType: input.branchType || "franchise",
        province: input.province,
        phone: input.phone,
        email: input.email,
        franchiseOwnerId: franchiseOwnerId,
        status: "active",
        contractStartDate: input.contractStartDate as any,
        contractEndDate: input.contractEndDate as any,
        royaltyType: input.royaltyType,
        royaltyValue: input.royaltyValue,
      } as any);
      const id = (result as any).insertId as number;
      
      // Link owner to branch
      if (franchiseOwnerId) {
         const { staffBranches } = await import("../../drizzle/schema");
         await db.insert(staffBranches).values({
           staffId: franchiseOwnerId,
           branchId: id,
           isPrimary: true,
         });
         await db.update(staff).set({ primaryBranchId: id }).where(eq(staff.id, franchiseOwnerId));
      }

      const [created] = await db.select().from(branches).where(eq(branches.id, id)).limit(1);
      await logAudit({ staff: ctx.staff, action: "create", entity: "branches", entityId: id });
      return created;
    }),

  updateContract: superAdminProcedure
    .input(z.object({
      branchId: z.number().int(),
      contractStartDate: z.string().optional(),
      contractEndDate: z.string().optional(),
      royaltyType: z.enum(["percentage", "fixed", "none"]).optional(),
      royaltyValue: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { branchId, ...data } = input;
      await db.update(branches).set(data as any).where(eq(branches.id, branchId));
      const [updated] = await db.select().from(branches).where(eq(branches.id, branchId)).limit(1);
      return updated;
    }),

  getRoyaltyReport: superAdminProcedure
    .input(z.object({
      branchId: z.number().int().optional(),
      period: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      let branchList = await db.select().from(branches)
        .where(eq(branches.branchType, "franchise"));
      if (input.branchId) branchList = branchList.filter((b) => b.id === input.branchId);

      const results = await Promise.all(branchList.map(async (branch) => {
        const orders = await db.select().from(posOrders)
          .where(and(
            eq(posOrders.branchId, branch.id),
          ));
        const completed = orders.filter((o) => ["completed", "served"].includes(o.status ?? ""));
        const revenue = completed.reduce((sum, o) => sum + Number(o.totalAmount ?? 0), 0);
        let royalty = 0;
        if (branch.royaltyType === "percentage") {
          royalty = revenue * (Number(branch.royaltyValue ?? 0) / 100);
        } else if (branch.royaltyType === "fixed") {
          royalty = Number(branch.royaltyValue ?? 0);
        }
        return { branch, revenue, royalty: Math.round(royalty * 100) / 100 };
      }));

      return results;
    }),
});
