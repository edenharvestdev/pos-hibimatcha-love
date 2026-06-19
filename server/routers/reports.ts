import { TRPCError } from "@trpc/server";
import { eq, and, gte, lte, desc, sql, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import {
  posOrders, posOrderItems, posOrderItemOptions, posOrderPayments,
  posMenuItems, posCategories, posBranchInventoryStock,
  posInventoryItems, auditLogs, posOrderRecipeSnapshots,
  posRecipeIngredients, posExpenseReceipts,
  masterPaymentMethods, posPaymentMethods, staff,
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

      // Calculate AOV history for the last 7 days (ending today)
      const aovLast7Days: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const dStart = new Date(today);
        dStart.setDate(today.getDate() - i);
        const dEnd = new Date(dStart);
        dEnd.setDate(dEnd.getDate() + 1);

        const dayOrders = orders.filter((o) =>
          o.createdAt && o.createdAt >= dStart && o.createdAt < dEnd &&
          ["completed", "served"].includes(o.status ?? "")
        );
        const dayRevenue = dayOrders.reduce((sum, o) => sum + Number(o.totalAmount ?? 0), 0);
        const dayAOV = dayOrders.length > 0 ? dayRevenue / dayOrders.length : 0;
        aovLast7Days.push(Math.round(dayAOV));
      }

      const hourlyRevenue = Array.from({ length: 24 }, () => 0);
      const ordersByHour = Array.from({ length: 24 }, () => 0);
      for (const o of todayOrders) {
        if (!o.createdAt) continue;
        const hour = o.createdAt.getHours();
        hourlyRevenue[hour] += Number(o.totalAmount ?? 0);
        ordersByHour[hour]++;
      }

      return {
        todayRevenue: Math.round(todayRevenue * 100) / 100,
        todayOrders: todayOrders.length,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        pendingOrders,
        lowStockCount,
        revenueChange,
        yesterdayRevenue: Math.round(yesterdayRevenue * 100) / 100,
        aovLast7Days,
        hourlyRevenue: hourlyRevenue.map((v) => Math.round(v)),
        ordersByHour,
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

      // Calculate COGS using posOrderRecipeSnapshots with backward compatibility fallback
      let cogsCost = 0;
      const completedOrderIds = completedOrders.map((o) => o.id);
      if (completedOrderIds.length > 0) {
        const orderItems = await db.select({ id: posOrderItems.id, menuItemId: posOrderItems.menuItemId, quantity: posOrderItems.quantity })
          .from(posOrderItems)
          .where(inArray(posOrderItems.orderId, completedOrderIds));

        if (orderItems.length > 0) {
          const orderItemIds = orderItems.map((oi) => oi.id);

          // Load snapshots
          const snapshots = await db.select({ orderItemId: posOrderRecipeSnapshots.orderItemId, totalCostSnapshot: posOrderRecipeSnapshots.totalCostSnapshot })
            .from(posOrderRecipeSnapshots)
            .where(inArray(posOrderRecipeSnapshots.orderItemId, orderItemIds));

          const snapshotCostMap = new Map<number, number>();
          for (const snap of snapshots) {
            const current = snapshotCostMap.get(snap.orderItemId) ?? 0;
            snapshotCostMap.set(snap.orderItemId, current + Number(snap.totalCostSnapshot ?? 0));
          }

          // Load fallback data for old items (base recipes + option cost adjustments)
          const menuIds = Array.from(new Set(orderItems.map(oi => oi.menuItemId).filter((id): id is number => id !== null)));
          const baseRecipes = menuIds.length > 0 ? await db.select().from(posRecipeIngredients).where(inArray(posRecipeIngredients.menuItemId, menuIds)) : [];
          const inventoryItems = await db.select({ id: posInventoryItems.id, costPerUnit: posInventoryItems.costPerUnit }).from(posInventoryItems);
          const itemCostMap = new Map(inventoryItems.map((i) => [i.id, Number(i.costPerUnit ?? 0)]));

          const itemOptions = await db.select({ orderItemId: posOrderItemOptions.orderItemId, costAdjustment: posOrderItemOptions.costAdjustment })
            .from(posOrderItemOptions)
            .where(inArray(posOrderItemOptions.orderItemId, orderItemIds));

          const optionsCostMap = new Map<number, number>();
          for (const opt of itemOptions) {
            const current = optionsCostMap.get(opt.orderItemId) ?? 0;
            optionsCostMap.set(opt.orderItemId, current + Number(opt.costAdjustment ?? 0));
          }

          for (const oi of orderItems) {
            if (snapshotCostMap.has(oi.id)) {
              cogsCost += snapshotCostMap.get(oi.id)!;
            } else {
              // Fallback calculation for old order item
              const qty = Number(oi.quantity ?? 1);
              const recipeItems = baseRecipes.filter(r => r.menuItemId === oi.menuItemId);
              const recipeCost = recipeItems.reduce((sum, r) => sum + Number(r.quantity ?? 0) * (itemCostMap.get(r.inventoryItemId) ?? 0), 0);
              const optCost = optionsCostMap.get(oi.id) ?? 0;
              cogsCost += qty * (recipeCost + optCost);
            }
          }
        }
      }

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
          : branch.royaltyType === "hybrid"
          ? (revenue * (Number(branch.royaltyValue ?? 0) / 100)) + 5000
          : branch.royaltyType === "fixed"
          ? Number(branch.royaltyValue ?? 0)
          : 0;
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

  getEndOfDayReport: staffAdminProcedure
    .input(z.object({
      branchId: z.number().int().optional(),
      date: z.string().optional(), // YYYY-MM-DD, defaults to today
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const branchId = input.branchId ?? ctx.staff.currentBranchId;
      const dateStr = input.date ?? new Date().toISOString().slice(0, 10);
      const dayStart = new Date(dateStr + "T00:00:00.000Z");
      const dayEnd = new Date(dateStr + "T23:59:59.999Z");

      const allOrders = await db.select().from(posOrders);
      const dayOrders = allOrders.filter((o) => {
        if (branchId && o.branchId !== branchId) return false;
        return o.createdAt && o.createdAt >= dayStart && o.createdAt <= dayEnd;
      });

      const completed = dayOrders.filter((o) => ["completed", "served"].includes(o.status ?? ""));
      const cancelled = dayOrders.filter((o) => ["cancelled", "refunded"].includes(o.status ?? ""));

      const totalRevenue = completed.reduce((s, o) => s + Number(o.totalAmount ?? 0), 0);
      const totalDiscount = completed.reduce((s, o) => s + Number(o.discountAmount ?? 0), 0);
      const totalTax = completed.reduce((s, o) => s + Number(o.taxAmount ?? 0), 0);

      // Payment method breakdown
      const completedOrderIds = completed.map((o) => o.id);
      const payments = completedOrderIds.length
        ? await db.select().from(posOrderPayments).where(inArray(posOrderPayments.orderId, completedOrderIds))
        : [];

      const [masterMethods, branchMethods] = await Promise.all([
        db.select().from(masterPaymentMethods),
        db.select().from(posPaymentMethods),
      ]);
      const methodName = (id: number | null | undefined) => {
        if (!id) return "ไม่ระบุ";
        return masterMethods.find((m) => m.id === id)?.name
          || branchMethods.find((m) => m.id === id)?.name
          || `Method ${id}`;
      };

      const paymentBreakdown: Record<string, number> = {};
      for (const p of payments) {
        const name = methodName(p.paymentMethodId);
        paymentBreakdown[name] = (paymentBreakdown[name] ?? 0) + Number(p.amount ?? 0);
      }

      // Top items
      const orderItems = completedOrderIds.length
        ? await db.select().from(posOrderItems).where(inArray(posOrderItems.orderId, completedOrderIds))
        : [];

      const itemMap: Record<number, { name: string; qty: number; revenue: number }> = {};
      for (const it of orderItems) {
        if (!it.menuItemId) continue;
        if (!itemMap[it.menuItemId]) {
          itemMap[it.menuItemId] = { name: it.menuItemName ?? `Item ${it.menuItemId}`, qty: 0, revenue: 0 };
        }
        itemMap[it.menuItemId].qty += Number(it.quantity ?? 0);
        itemMap[it.menuItemId].revenue += Number(it.totalPrice ?? 0);
      }
      const topItems = Object.values(itemMap)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 10);

      // Staff breakdown
      const staffList = await db.select().from(staff);
      const staffMap: Record<number, { name: string; orders: number; revenue: number }> = {};
      for (const o of completed) {
        const sid = o.staffId ?? 0;
        if (!staffMap[sid]) {
          const s = staffList.find((x) => x.id === sid);
          staffMap[sid] = { name: s ? `${s.firstName ?? ""} ${s.lastName ?? ""}`.trim() || s.employeeCode || `Staff ${sid}` : "ไม่ระบุ", orders: 0, revenue: 0 };
        }
        staffMap[sid].orders++;
        staffMap[sid].revenue += Number(o.totalAmount ?? 0);
      }
      const staffBreakdown = Object.values(staffMap).sort((a, b) => b.revenue - a.revenue);

      return {
        date: dateStr,
        totalOrders: completed.length,
        cancelledOrders: cancelled.length,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalDiscount: Math.round(totalDiscount * 100) / 100,
        totalTax: Math.round(totalTax * 100) / 100,
        avgOrderValue: completed.length > 0 ? Math.round((totalRevenue / completed.length) * 100) / 100 : 0,
        paymentBreakdown,
        topItems,
        staffBreakdown,
      };
    }),
});

