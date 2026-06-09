import { TRPCError } from "@trpc/server";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import {
  posOrders, posOrderItems, posOrderPayments,
  posMenuItems, posCategories, posBranchInventoryStock,
  posInventoryItems, auditLogs,
} from "../../drizzle/schema";
import { router, staffProcedure, staffAdminProcedure } from "../_core/trpc";

export const reportsRouter = router({
  getDashboardStats: staffProcedure
    .input(z.object({ branchId: z.number().int().optional(), period: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return {
        todayRevenue: 0, todayOrders: 0, averageOrderValue: 0,
        pendingOrders: 0, lowStockCount: 0,
      };

      const branchId = input?.branchId ?? ctx.staff.currentBranchId;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      let orders = await db.select().from(posOrders);
      if (branchId) orders = orders.filter((o) => o.branchId === branchId);

      const todayOrders = orders.filter((o) =>
        o.createdAt && o.createdAt >= today && o.createdAt < tomorrow &&
        ["completed", "served"].includes(o.status ?? "")
      );
      const todayRevenue = todayOrders.reduce((sum, o) => sum + Number(o.totalAmount ?? 0), 0);
      const averageOrderValue = todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0;
      const pendingOrders = orders.filter((o) => ["pending", "preparing", "ready"].includes(o.status ?? "")).length;

      let lowStockCount = 0;
      if (branchId) {
        const stocks = await db.select().from(posBranchInventoryStock)
          .where(eq(posBranchInventoryStock.branchId, branchId));
        const items = await db.select().from(posInventoryItems);
        const itemMap = new Map(items.map((i) => [i.id, i]));
        lowStockCount = stocks.filter((s) => {
          const item = itemMap.get(s.inventoryItemId);
          const reorderPoint = Number(item?.reorderPoint ?? 0);
          return reorderPoint > 0 && Number(s.currentStock ?? 0) <= reorderPoint;
        }).length;
      }

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayOrders = orders.filter((o) =>
        o.createdAt && o.createdAt >= yesterday && o.createdAt < today &&
        ["completed", "served"].includes(o.status ?? "")
      );
      const yesterdayRevenue = yesterdayOrders.reduce((sum, o) => sum + Number(o.totalAmount ?? 0), 0);
      const revenueChange = yesterdayRevenue > 0
        ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)
        : 0;

      return {
        todayRevenue: Math.round(todayRevenue * 100) / 100,
        todayOrders: todayOrders.length,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        pendingOrders,
        lowStockCount,
        revenueChange,
        yesterdayRevenue: Math.round(yesterdayRevenue * 100) / 100,
      };
    }),

  getRevenueReport: staffAdminProcedure
    .input(z.object({
      branchId: z.number().int().optional(),
      dateFrom: z.string(),
      dateTo: z.string(),
      groupBy: z.enum(["day", "week", "month"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const branchId = input.branchId ?? ctx.staff.currentBranchId;
      const from = new Date(input.dateFrom);
      const to = new Date(input.dateTo);
      to.setHours(23, 59, 59, 999);

      let orders = await db.select().from(posOrders);
      if (branchId) orders = orders.filter((o) => o.branchId === branchId);
      orders = orders.filter((o) =>
        o.createdAt && o.createdAt >= from && o.createdAt <= to &&
        ["completed", "served"].includes(o.status ?? "")
      );

      // Group by day
      const byDay = new Map<string, { revenue: number; orders: number }>();
      for (const order of orders) {
        const dateKey = order.createdAt!.toISOString().split("T")[0];
        const existing = byDay.get(dateKey) ?? { revenue: 0, orders: 0 };
        existing.revenue += Number(order.totalAmount ?? 0);
        existing.orders += 1;
        byDay.set(dateKey, existing);
      }

      return Array.from(byDay.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }),

  getTopItemsReport: staffAdminProcedure
    .input(z.object({
      branchId: z.number().int().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      limit: z.number().int().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const branchId = input.branchId ?? ctx.staff.currentBranchId;
      let orders = await db.select().from(posOrders);
      if (branchId) orders = orders.filter((o) => o.branchId === branchId);

      const completedOrderIds = orders
        .filter((o) => ["completed", "served"].includes(o.status ?? ""))
        .map((o) => o.id);

      if (completedOrderIds.length === 0) return [];

      const items = await db.select().from(posOrderItems);
      const relevantItems = items.filter((i) => completedOrderIds.includes(i.orderId));

      const itemMap = new Map<number, { name: string; qty: number; revenue: number }>();
      for (const item of relevantItems) {
        const key = item.menuItemId ?? 0;
        const existing = itemMap.get(key) ?? { name: item.menuItemName ?? "Unknown", qty: 0, revenue: 0 };
        existing.qty += item.quantity ?? 1;
        existing.revenue += Number(item.totalPrice ?? 0);
        itemMap.set(key, existing);
      }

      return Array.from(itemMap.entries())
        .map(([menuItemId, data]) => ({ menuItemId, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, input.limit ?? 10);
    }),

  getStaffPerformanceReport: staffAdminProcedure
    .input(z.object({ branchId: z.number().int().optional(), period: z.string().optional() }))
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];

      const orders = await db.select().from(posOrders)
        .where(eq(posOrders.branchId, ctx.staff.currentBranchId ?? 0));

      const byStaff = new Map<number, { staffId: number; orders: number; revenue: number }>();
      for (const order of orders.filter((o) => ["completed", "served"].includes(o.status ?? ""))) {
        const key = order.staffId ?? 0;
        const existing = byStaff.get(key) ?? { staffId: key, orders: 0, revenue: 0 };
        existing.orders += 1;
        existing.revenue += Number(order.totalAmount ?? 0);
        byStaff.set(key, existing);
      }

      return Array.from(byStaff.values()).sort((a, b) => b.revenue - a.revenue);
    }),

  getInventoryReport: staffAdminProcedure
    .input(z.object({ branchId: z.number().int().optional(), type: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { totalItems: 0, lowStock: 0, outOfStock: 0, totalValue: 0 };

      const branchId = input.branchId ?? ctx.staff.currentBranchId;
      if (!branchId) return { totalItems: 0, lowStock: 0, outOfStock: 0, totalValue: 0 };

      const stocks = await db.select().from(posBranchInventoryStock)
        .where(eq(posBranchInventoryStock.branchId, branchId));
      const items = await db.select().from(posInventoryItems);
      const itemMap = new Map(items.map((i) => [i.id, i]));

      let lowStock = 0, outOfStock = 0, totalValue = 0;
      for (const stock of stocks) {
        const item = itemMap.get(stock.inventoryItemId);
        const qty = Number(stock.currentStock ?? 0);
        const reorderPoint = Number(item?.reorderPoint ?? 0);
        if (qty === 0) outOfStock++;
        else if (reorderPoint > 0 && qty <= reorderPoint) lowStock++;
        totalValue += qty * Number(item?.costPerUnit ?? 0);
      }

      return { totalItems: stocks.length, lowStock, outOfStock, totalValue: Math.round(totalValue * 100) / 100 };
    }),

  // ── P&L Dashboard per branch ─────────────────────────────────────────────
  getPnL: staffAdminProcedure
    .input(z.object({
      branchId: z.number().int().optional(),
      dateFrom: z.string(),
      dateTo: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { revenue: 0, cogsCost: 0, expenseCost: 0, grossProfit: 0, netProfit: 0, margin: 0 };

      const branchId = input.branchId ?? ctx.staff.currentBranchId;
      const from = new Date(input.dateFrom);
      const to = new Date(input.dateTo);
      to.setHours(23, 59, 59, 999);

      // Revenue from completed orders
      let orders = await db.select().from(posOrders);
      if (branchId) orders = orders.filter((o) => o.branchId === branchId);
      const completedOrders = orders.filter((o) =>
        o.createdAt && o.createdAt >= from && o.createdAt <= to &&
        ["completed", "served"].includes(o.status ?? "")
      );
      const revenue = completedOrders.reduce((sum, o) => sum + Number(o.totalAmount ?? 0), 0);

      // COGS from inventory movements (type: sold)
      const { posInventoryMovements, posInventoryItems: posInvItems, posExpenseReceipts } = await import("../../drizzle/schema");
      let movements = await db.select().from(posInventoryMovements);
      if (branchId) movements = movements.filter((m) => m.branchId === branchId);
      const soldMovements = movements.filter((m) =>
        m.createdAt && m.createdAt >= from && m.createdAt <= to &&
        m.movementType === "sold"
      );
      // Estimate COGS from movements (qty × cost per unit)
      const inventoryItems = await db.select({ id: posInvItems.id, costPerUnit: posInvItems.costPerUnit }).from(posInvItems);
      const costMap = new Map(inventoryItems.map((i) => [i.id, Number(i.costPerUnit ?? 0)]));
      const cogsCost = soldMovements.reduce((sum, m) => {
        const qty = Math.abs(Number(m.quantity ?? 0));
        const cost = Number(m.costPerUnit ?? 0) || costMap.get(m.inventoryItemId) || 0;
        return sum + qty * cost;
      }, 0);

      // Expenses from expense receipts
      let expenses = await db.select().from(posExpenseReceipts);
      if (branchId) expenses = expenses.filter((e) => e.branchId === branchId);
      const periodExpenses = expenses.filter((e) =>
        e.createdAt && e.createdAt >= from && e.createdAt <= to &&
        e.status === "confirmed"
      );
      const expenseCost = periodExpenses.reduce((sum, e) => sum + Number(e.grandTotal ?? 0), 0);

      const grossProfit = revenue - cogsCost;
      const netProfit = grossProfit - expenseCost;
      const margin = revenue > 0 ? Math.round((netProfit / revenue) * 10000) / 100 : 0;

      return {
        revenue: Math.round(revenue * 100) / 100,
        cogsCost: Math.round(cogsCost * 100) / 100,
        expenseCost: Math.round(expenseCost * 100) / 100,
        grossProfit: Math.round(grossProfit * 100) / 100,
        netProfit: Math.round(netProfit * 100) / 100,
        margin,
        orderCount: completedOrders.length,
        period: { from: input.dateFrom, to: input.dateTo },
      };
    }),

  // ── P&L Multi-branch comparison ───────────────────────────────────────────
  getPnLMultiBranch: staffAdminProcedure
    .input(z.object({ dateFrom: z.string(), dateTo: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const from = new Date(input.dateFrom);
      const to = new Date(input.dateTo);
      to.setHours(23, 59, 59, 999);

      const { branches: branchesTable, posExpenseReceipts, posInventoryMovements } = await import("../../drizzle/schema");
      const branchList = await db.select().from(branchesTable).where(eq(branchesTable.status, "active"));
      let allOrders = await db.select().from(posOrders);
      const completedOrders = allOrders.filter((o) =>
        o.createdAt && o.createdAt >= from && o.createdAt <= to &&
        ["completed", "served"].includes(o.status ?? "")
      );

      let allExpenses = await db.select().from(posExpenseReceipts);
      const confirmedExpenses = allExpenses.filter((e) =>
        e.createdAt && e.createdAt >= from && e.createdAt <= to &&
        e.status === "confirmed"
      );

      return branchList.map((branch) => {
        const bOrders = completedOrders.filter((o) => o.branchId === branch.id);
        const revenue = bOrders.reduce((s, o) => s + Number(o.totalAmount ?? 0), 0);
        const expenses = confirmedExpenses
          .filter((e) => e.branchId === branch.id)
          .reduce((s, e) => s + Number(e.grandTotal ?? 0), 0);
        const netProfit = revenue - expenses;
        const royalty = branch.royaltyType === "percentage"
          ? revenue * (Number(branch.royaltyValue ?? 0) / 100)
          : Number(branch.royaltyValue ?? 0);
        return {
          branch: { id: branch.id, name: branch.name, branchCode: branch.branchCode, royaltyType: branch.royaltyType, royaltyValue: branch.royaltyValue },
          revenue: Math.round(revenue * 100) / 100,
          expenses: Math.round(expenses * 100) / 100,
          royalty: Math.round(royalty * 100) / 100,
          netProfit: Math.round(netProfit * 100) / 100,
          orderCount: bOrders.length,
        };
      });
    }),

  // ── Staff KPI ─────────────────────────────────────────────────────────────
  getStaffKpi: staffAdminProcedure
    .input(z.object({
      branchId: z.number().int().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const branchId = input.branchId ?? ctx.staff.currentBranchId;
      const from = input.dateFrom ? new Date(input.dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const to = input.dateTo ? new Date(input.dateTo) : new Date();
      to.setHours(23, 59, 59, 999);

      const { staff: staffTable, branches: branchesTable } = await import("../../drizzle/schema");

      let orders = await db.select().from(posOrders);
      if (branchId) orders = orders.filter((o) => o.branchId === branchId);
      const completedOrders = orders.filter((o) =>
        o.createdAt && o.createdAt >= from && o.createdAt <= to &&
        ["completed", "served"].includes(o.status ?? "")
      );

      const kpiMap = new Map<number, { staffId: number; orders: number; revenue: number; avgTicket: number }>();
      for (const order of completedOrders) {
        const key = order.staffId ?? 0;
        const existing = kpiMap.get(key) ?? { staffId: key, orders: 0, revenue: 0, avgTicket: 0 };
        existing.orders += 1;
        existing.revenue += Number(order.totalAmount ?? 0);
        kpiMap.set(key, existing);
      }

      // Get staff info + commission rate
      const [branch] = branchId
        ? await db.select().from(branchesTable).where(eq(branchesTable.id, branchId)).limit(1)
        : [null];
      const commissionRate = branch?.commissionEnabled ? Number(branch.commissionRate ?? 0) / 100 : 0;
      const commissionType = branch?.commissionType ?? "percentage";

      const staffList = await db.select({
        id: staffTable.id,
        firstName: staffTable.firstName,
        lastName: staffTable.lastName,
        firstNameThai: staffTable.firstNameThai,
        lastNameThai: staffTable.lastNameThai,
        employeeCode: staffTable.employeeCode,
        avatar: staffTable.avatar,
      }).from(staffTable);

      return Array.from(kpiMap.values())
        .map((kpi) => {
          const staffMember = staffList.find((s) => s.id === kpi.staffId);
          const avgTicket = kpi.orders > 0 ? kpi.revenue / kpi.orders : 0;
          const commission = commissionType === "percentage"
            ? kpi.revenue * commissionRate
            : commissionRate * kpi.orders;
          return {
            ...kpi,
            avgTicket: Math.round(avgTicket * 100) / 100,
            revenue: Math.round(kpi.revenue * 100) / 100,
            commission: Math.round(commission * 100) / 100,
            staff: staffMember,
          };
        })
        .filter((k) => k.staff)
        .sort((a, b) => b.revenue - a.revenue);
    }),
});

