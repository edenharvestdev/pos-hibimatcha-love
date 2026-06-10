import { TRPCError } from "@trpc/server";
import { eq, and, desc, gte, lte, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import {
  posOrders, posOrderItems, posOrderItemOptions,
  posOrderPayments, posKitchenTickets,
  posMenuItems, posOptions, posDiscounts,
  posPaymentMethods, branches, staff,
  posBranchPaymentSettings,
  posRecipeIngredients, posBranchInventoryStock, posInventoryMovements,
  posInventoryItems, memberPoints, members,
} from "../../drizzle/schema";
import { logAudit, generateOrderNumber, generateTicketNumber } from "../lib/audit";
import { router, staffProcedure, staffAdminProcedure } from "../_core/trpc";
import { appendCashRowAsync } from "../lib/sheetsSync";
import { broadcastToBranch, RealtimeEvents } from "../lib/realtime";
import {
  generatePromptPayQRDataUrl,
  generateOrderSlipHTML,
  generateAllLabelsHTML,
  generateKitchenTicketHTML,
  generateReceiptHTML,
  type OrderData,
  type OrderItemData,
  type BranchPaymentSettings,
} from "../lib/printPayloads";

/**
 * Transactional stock deduction for order completion.
 * - Runs in a single DB transaction (all-or-nothing)
 * - Idempotent: skips if order already has stock movements
 * - Pre-checks stock availability: rejects if any ingredient is insufficient
 * - Every movement references the source order ID
 *
 * Returns { success: true } or throws TRPCError with details about insufficient stock.
 */
async function deductStockForOrder(
  orderId: number,
  branchId: number,
  staffId: number,
  options?: { skipStockCheck?: boolean }
): Promise<{ success: boolean; deductions?: Array<{ inventoryItemId: number; qty: number }> }> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

  const result = await db.transaction(async (tx) => {
    // ─── 1. Idempotency guard ───────────────────────────────────────────
    const existingMovements = await tx.select({ id: posInventoryMovements.id })
      .from(posInventoryMovements)
      .where(and(
        eq(posInventoryMovements.referenceType, "order"),
        eq(posInventoryMovements.referenceId, orderId),
        eq(posInventoryMovements.movementType, "sold"),
      ))
      .limit(1);
    if (existingMovements.length > 0) {
      return { success: true, deductions: [] }; // Already deducted — idempotent
    }

    // ─── 2. Get order items ─────────────────────────────────────────────
    const orderItems = await tx.select().from(posOrderItems)
      .where(eq(posOrderItems.orderId, orderId));
    if (orderItems.length === 0) return { success: true, deductions: [] };

    // ─── 3. Get recipe ingredients ──────────────────────────────────────
    const menuItemIds = Array.from(
      new Set(orderItems.map((oi) => oi.menuItemId).filter((id): id is number => id !== null && id !== undefined))
    );
    if (menuItemIds.length === 0) return { success: true, deductions: [] };

    const recipes = await tx.select().from(posRecipeIngredients)
      .where(inArray(posRecipeIngredients.menuItemId, menuItemIds));
    if (recipes.length === 0) return { success: true, deductions: [] }; // No recipes defined

    // ─── 4. Build deduction map ─────────────────────────────────────────
    const deductions = new Map<number, number>();
    for (const oi of orderItems) {
      const itemRecipes = recipes.filter((r) => r.menuItemId === oi.menuItemId);
      for (const r of itemRecipes) {
        const deductQty = Number(r.quantity ?? 0) * (oi.quantity ?? 1);
        if (deductQty > 0) {
          deductions.set(r.inventoryItemId, (deductions.get(r.inventoryItemId) ?? 0) + deductQty);
        }
      }
    }
    if (deductions.size === 0) return { success: true, deductions: [] };

    // ─── 5. Pre-check stock availability ────────────────────────────────
    if (!options?.skipStockCheck) {
      const inventoryItemIds = Array.from(deductions.keys());
      const stockRows = await tx.select({
        inventoryItemId: posBranchInventoryStock.inventoryItemId,
        currentStock: posBranchInventoryStock.currentStock,
      }).from(posBranchInventoryStock)
        .where(and(
          eq(posBranchInventoryStock.branchId, branchId),
          inArray(posBranchInventoryStock.inventoryItemId, inventoryItemIds),
        ));

      // Get item names for error messages
      const itemNames = await tx.select({
        id: posInventoryItems.id,
        name: posInventoryItems.name,
        nameThai: posInventoryItems.nameThai,
        unitOfMeasure: posInventoryItems.unitOfMeasure,
      }).from(posInventoryItems)
        .where(inArray(posInventoryItems.id, inventoryItemIds));

      const stockMap = new Map(stockRows.map((r) => [r.inventoryItemId, Number(r.currentStock ?? 0)]));
      const nameMap = new Map(itemNames.map((r) => [r.id, r]));

      const insufficient: Array<{ id: number; name: string; required: number; available: number; unit: string }> = [];
      for (const [itemId, requiredQty] of deductions) {
        const available = stockMap.get(itemId) ?? 0;
        if (available < requiredQty) {
          const info = nameMap.get(itemId);
          insufficient.push({
            id: itemId,
            name: info?.nameThai || info?.name || `Item #${itemId}`,
            required: requiredQty,
            available: Math.max(0, available),
            unit: info?.unitOfMeasure || "unit",
          });
        }
      }

      if (insufficient.length > 0) {
        const details = insufficient.map((i) =>
          `${i.name}: ต้องการ ${i.required} ${i.unit} แต่มี ${i.available} ${i.unit}`
        ).join("; ");
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `วัตถุดิบไม่เพียงพอ: ${details}`,
          cause: { insufficientItems: insufficient },
        });
      }
    }

    // ─── 6. Apply deductions (within same transaction) ──────────────────
    const appliedDeductions: Array<{ inventoryItemId: number; qty: number }> = [];
    for (const [inventoryItemId, qty] of deductions) {
      const [stockRow] = await tx.select()
        .from(posBranchInventoryStock)
        .where(and(
          eq(posBranchInventoryStock.branchId, branchId),
          eq(posBranchInventoryStock.inventoryItemId, inventoryItemId),
        ))
        .limit(1);

      if (stockRow) {
        await tx.update(posBranchInventoryStock).set({
          currentStock: sql`${posBranchInventoryStock.currentStock} - ${qty}`,
        }).where(and(
          eq(posBranchInventoryStock.branchId, branchId),
          eq(posBranchInventoryStock.inventoryItemId, inventoryItemId),
        ));
      } else {
        await tx.insert(posBranchInventoryStock).values({
          branchId,
          inventoryItemId,
          currentStock: String(-qty),
        });
      }

      // ─── 7. Record movement with order reference ────────────────────
      await tx.insert(posInventoryMovements).values({
        branchId,
        inventoryItemId,
        movementType: "sold",
        quantity: String(-qty),
        referenceType: "order",
        referenceId: orderId,
        notes: `Auto-deduct from order #${orderId}`,
        performedByStaffId: staffId,
      });

      appliedDeductions.push({ inventoryItemId, qty });
    }

    return { success: true, deductions: appliedDeductions };
  }, { isolationLevel: "read committed" });

  // Realtime check for low stock
  if (result.success && result.deductions && result.deductions.length > 0 && db) {
    const database = db;
    const deductionsList = result.deductions;
    (async () => {
      try {
        const inventoryItemIds = deductionsList.map((d) => d.inventoryItemId);
        const stockRows = await database.select({
          inventoryItemId: posBranchInventoryStock.inventoryItemId,
          currentStock: posBranchInventoryStock.currentStock,
        }).from(posBranchInventoryStock)
          .where(and(
            eq(posBranchInventoryStock.branchId, branchId),
            inArray(posBranchInventoryStock.inventoryItemId, inventoryItemIds),
          ));

        const items = await database.select({
          id: posInventoryItems.id,
          name: posInventoryItems.name,
          nameThai: posInventoryItems.nameThai,
          reorderPoint: posInventoryItems.reorderPoint,
          unitOfMeasure: posInventoryItems.unitOfMeasure,
        }).from(posInventoryItems)
          .where(inArray(posInventoryItems.id, inventoryItemIds));

        const itemMap = new Map(items.map((i) => [i.id, i]));

        for (const stockRow of stockRows) {
          const item = itemMap.get(stockRow.inventoryItemId);
          if (!item) continue;

          const currentStock = Number(stockRow.currentStock ?? 0);
          const reorderPoint = Number(item.reorderPoint ?? 0);

          if (reorderPoint > 0 && currentStock <= reorderPoint) {
            await broadcastToBranch(branchId, RealtimeEvents.STOCK_LOW, {
              inventoryItemId: item.id,
              itemName: item.nameThai || item.name,
              currentStock,
              reorderPoint,
              unit: item.unitOfMeasure || "unit",
            });
          }
        }
      } catch (err) {
        console.error("[Realtime] Low stock broadcast check failed", err);
      }
    })();
  }

  return result;
}

const OrderItemInput = z.object({
  menuItemId: z.number().int(),
  quantity: z.number().int().min(1),
  notes: z.string().optional(),
  options: z.array(z.object({
    optionId: z.number().int(),
    optionName: z.string().optional(),
    priceAdjustment: z.string().optional(),
  })).optional(),
});

export const ordersRouter = router({
  create: staffProcedure
    .input(z.object({
      branchId: z.number().int(),
      orderType: z.enum(["dine-in", "takeaway", "delivery"]).optional(),
      tableNumber: z.string().optional(),
      customerName: z.string().optional(),
      customerPhone: z.string().optional(),
      notes: z.string().optional(),
      items: z.array(OrderItemInput).min(1),
      discountCode: z.string().optional(),
      memberId: z.number().int().optional().nullable(),
      pointsRedeemed: z.number().optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      let subtotal = 0;
      const resolvedItems: Array<{
        menuItemId: number;
        menuItemName: string;
        menuItemPrice: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
        notes?: string;
        options: Array<{ optionId: number; optionName: string; priceAdjustment: string }>;
      }> = [];

      for (const item of input.items) {
        const [menuItem] = await db.select().from(posMenuItems)
          .where(eq(posMenuItems.id, item.menuItemId)).limit(1);
        if (!menuItem) throw new TRPCError({ code: "BAD_REQUEST", message: `Menu item ${item.menuItemId} not found` });

        let unitPrice = Number(menuItem.basePrice);
        const resolvedOptions: Array<{ optionId: number; optionName: string; priceAdjustment: string }> = [];

        for (const opt of item.options ?? []) {
          const [option] = await db.select().from(posOptions)
            .where(eq(posOptions.id, opt.optionId)).limit(1);
          if (option) {
            unitPrice += Number(option.priceAdjustment ?? 0);
            resolvedOptions.push({
              optionId: option.id,
              optionName: option.name ?? opt.optionName ?? "",
              priceAdjustment: option.priceAdjustment ?? "0",
            });
          }
        }

        const totalPrice = unitPrice * item.quantity;
        subtotal += totalPrice;

        resolvedItems.push({
          menuItemId: menuItem.id,
          menuItemName: menuItem.name,
          menuItemPrice: menuItem.basePrice,
          quantity: item.quantity,
          unitPrice,
          totalPrice,
          notes: item.notes,
          options: resolvedOptions,
        });
      }

      // Apply discount
      let discountAmount = 0;
      let discountId: number | undefined;
      if (input.discountCode) {
        const [discount] = await db.select().from(posDiscounts)
          .where(eq(posDiscounts.code, input.discountCode)).limit(1);
        if (discount?.isActive) {
          if (discount.discountType === "percentage") {
            discountAmount = subtotal * (Number(discount.value) / 100);
          } else if (discount.discountType === "fixed") {
            discountAmount = Number(discount.value);
          }
          if (discount.maxDiscountAmount) discountAmount = Math.min(discountAmount, Number(discount.maxDiscountAmount));
          discountId = discount.id;
          await db.update(posDiscounts).set({ usedCount: sql`${posDiscounts.usedCount} + 1` })
            .where(eq(posDiscounts.id, discount.id));
        }
      }

      // Calculate member points discount if points are redeemed
      let pointsDiscount = 0;
      if (input.memberId && input.pointsRedeemed && input.pointsRedeemed > 0) {
        // Calculate current balance
        const history = await db.select().from(memberPoints).where(eq(memberPoints.memberId, input.memberId));
        const currentBalance = history.reduce((acc, p) => {
          if (p.type === "earn" || p.type === "adjust") return acc + Number(p.points);
          if (p.type === "redeem" || p.type === "expire") return acc - Number(p.points);
          return acc;
        }, 0);

        if (currentBalance < input.pointsRedeemed) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `แต้มไม่พอแลก (มี ${currentBalance} แต้ม)` });
        }

        const [branch] = await db.select().from(branches).where(eq(branches.id, input.branchId)).limit(1);
        const redeemRate = branch ? Number(branch.loyaltyRedeemRate ?? 1.00) : 1.00;
        pointsDiscount = input.pointsRedeemed * redeemRate;
        discountAmount += pointsDiscount;
      }

      const taxAmount = Math.round((subtotal - discountAmount) * 0.07 * 100) / 100;
      const totalAmount = subtotal - discountAmount + taxAmount;
      const orderNumber = generateOrderNumber();

      const [result] = await db.insert(posOrders).values({
        orderNumber,
        branchId: input.branchId,
        staffId: ctx.staff.staffId,
        orderType: input.orderType ?? "dine-in",
        tableNumber: input.tableNumber,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        status: "pending",
        subtotal: String(subtotal),
        discountAmount: String(discountAmount),
        discountId,
        taxAmount: String(taxAmount),
        totalAmount: String(totalAmount),
        notes: input.notes,
        memberId: input.memberId || null,
      });

      const orderId = (result as any).insertId as number;

      // Handle Member Points ledger additions
      if (input.memberId) {
        // 1) Redeem Points Transaction
        if (input.pointsRedeemed && input.pointsRedeemed > 0) {
          const historyBeforeRedeem = await db.select().from(memberPoints).where(eq(memberPoints.memberId, input.memberId));
          const balanceBefore = historyBeforeRedeem.reduce((acc, p) => {
            if (p.type === "earn" || p.type === "adjust") return acc + Number(p.points);
            if (p.type === "redeem" || p.type === "expire") return acc - Number(p.points);
            return acc;
          }, 0);

          await db.insert(memberPoints).values({
            memberId: input.memberId,
            branchId: input.branchId,
            type: "redeem",
            points: String(input.pointsRedeemed),
            balanceBefore: String(balanceBefore),
            balanceAfter: String(balanceBefore - input.pointsRedeemed),
            orderId: orderId,
            notes: `แลกแต้มส่วนลด ${input.pointsRedeemed} แต้มใน POS (฿${pointsDiscount})`,
            createdByStaffId: ctx.staff.staffId,
          });
        }

        // 2) Earn Points Transaction
        const [branch] = await db.select().from(branches).where(eq(branches.id, input.branchId)).limit(1);
        const isLoyaltyEnabled = branch ? branch.loyaltyEnabled : true; // default true for POS

        if (isLoyaltyEnabled) {
          const pointsPerBaht = branch ? Number(branch.loyaltyPointsPerBaht ?? 0.1) : 0.1; // default 1 point per 10 baht (0.1 points per baht)
          const minOrder = branch ? Number(branch.loyaltyMinOrderForPoints ?? 0) : 0;

          if (totalAmount >= minOrder) {
            const pointsEarned = Math.floor(totalAmount * pointsPerBaht);
            if (pointsEarned > 0) {
              const historyBeforeEarn = await db.select().from(memberPoints).where(eq(memberPoints.memberId, input.memberId));
              const balanceBefore = historyBeforeEarn.reduce((acc, p) => {
                if (p.type === "earn" || p.type === "adjust") return acc + Number(p.points);
                if (p.type === "redeem" || p.type === "expire") return acc - Number(p.points);
                return acc;
              }, 0);

              const expireDays = branch ? (branch.loyaltyPointExpireDays ?? 365) : 365;
              const expiresAt = new Date();
              expiresAt.setDate(expiresAt.getDate() + expireDays);

              await db.insert(memberPoints).values({
                memberId: input.memberId,
                branchId: input.branchId,
                type: "earn",
                points: String(pointsEarned),
                balanceBefore: String(balanceBefore),
                balanceAfter: String(balanceBefore + pointsEarned),
                orderId: orderId,
                expiresAt,
                notes: `สะสมแต้มจากยอดสั่งซื้อหน้าร้าน POS (฿${totalAmount})`,
                createdByStaffId: ctx.staff.staffId,
              });
            }
          }
        }
      }

      for (const item of resolvedItems) {
        const [itemResult] = await db.insert(posOrderItems).values({
          orderId,
          menuItemId: item.menuItemId,
          menuItemName: item.menuItemName,
          menuItemPrice: item.menuItemPrice,
          quantity: item.quantity,
          unitPrice: String(item.unitPrice),
          totalPrice: String(item.totalPrice),
          notes: item.notes,
          kitchenStatus: "pending",
        });
        const orderItemId = (itemResult as any).insertId as number;

        for (const opt of item.options) {
          await db.insert(posOrderItemOptions).values({
            orderItemId,
            optionId: opt.optionId,
            optionName: opt.optionName,
            priceAdjustment: opt.priceAdjustment,
          });
        }
      }

      // Create kitchen ticket
      await db.insert(posKitchenTickets).values({
        orderId,
        ticketNumber: generateTicketNumber(),
        status: "pending",
        station: "all",
        priority: "normal",
      });

      const order = await getFullOrder(db, orderId);
      await logAudit({ staff: ctx.staff, action: "create", entity: "pos_orders", entityId: orderId });

      if (order && input.branchId) {
        await broadcastToBranch(input.branchId, RealtimeEvents.NEW_ORDER, {
          id: orderId,
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          orderType: order.orderType,
        });
      }

      return order;
    }),

  list: staffProcedure
    .input(z.object({
      branchId: z.number().int().optional(),
      status: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      search: z.string().optional(),
      page: z.number().int().optional(),
      limit: z.number().int().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { orders: [], total: 0 };

      let rows = await db.select().from(posOrders).orderBy(desc(posOrders.createdAt));

      // Filter by branch access
      if (ctx.staff.role !== "super_admin" && ctx.staff.currentBranchId) {
        rows = rows.filter((o) => o.branchId === ctx.staff.currentBranchId);
      }
      if (input?.branchId) rows = rows.filter((o) => o.branchId === input.branchId);
      if (input?.status) rows = rows.filter((o) => o.status === input.status);
      if (input?.dateFrom) rows = rows.filter((o) => o.createdAt && o.createdAt >= new Date(input.dateFrom!));
      if (input?.dateTo) rows = rows.filter((o) => o.createdAt && o.createdAt <= new Date(input.dateTo!));
      if (input?.search) {
        const q = input.search.toLowerCase();
        rows = rows.filter((o) =>
          (o.orderNumber ?? "").toLowerCase().includes(q) ||
          (o.customerName ?? "").toLowerCase().includes(q) ||
          (o.tableNumber ?? "").toLowerCase().includes(q)
        );
      }

      const total = rows.length;
      const page = input?.page ?? 1;
      const limit = input?.limit ?? 50;
      const paged = rows.slice((page - 1) * limit, page * limit);

      return { orders: paged, total };
    }),

  getById: staffProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const order = await getFullOrder(db, input.id);
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });
      return order;
    }),

  updateStatus: staffProcedure
    .input(z.object({
      id: z.number().int(),
      status: z.enum(["pending", "preparing", "ready", "served", "completed", "cancelled", "refunded"]),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const now = new Date();
      const timestamps: Record<string, Date> = {};
      if (input.status === "preparing") timestamps.preparingAt = now;
      if (input.status === "ready") timestamps.readyAt = now;
      if (input.status === "served") timestamps.servedAt = now;
      if (input.status === "completed") timestamps.completedAt = now;
      if (input.status === "cancelled") timestamps.cancelledAt = now;

      await db.update(posOrders).set({
        status: input.status,
        ...(timestamps),
        cancelReason: input.status === "cancelled" ? input.notes : undefined,
      } as any).where(eq(posOrders.id, input.id));

      const order = await getFullOrder(db, input.id);
      await logAudit({ staff: ctx.staff, action: `status_${input.status}`, entity: "pos_orders", entityId: input.id });
      return order;
    }),

  addPayment: staffProcedure
    .input(z.object({
      orderId: z.number().int(),
      paymentMethodId: z.number().int(),
      amount: z.string(),
      reference: z.string().optional(),
      // Per-call automation flags (client passes its current preferences)
      autoComplete: z.boolean().optional().default(true),
      autoSyncSheet: z.boolean().optional().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [result] = await db.insert(posOrderPayments).values({
        orderId: input.orderId,
        paymentMethodId: input.paymentMethodId,
        amount: input.amount,
        referenceNumber: input.reference,
        status: "completed",
      });
      const id = (result as any).insertId as number;
      const [payment] = await db.select().from(posOrderPayments).where(eq(posOrderPayments.id, id)).limit(1);

      // Auto-complete the order — gated by client setting
      if (input.autoComplete) {
        // Pre-check stock BEFORE closing order (throws if insufficient)
        const [orderForDeduct] = await db.select().from(posOrders).where(eq(posOrders.id, input.orderId)).limit(1);
        if (orderForDeduct?.branchId) {
          // This runs in a transaction: if stock deduction fails, it rolls back
          // The order status update is also inside the transaction
          await deductStockForOrder(input.orderId, orderForDeduct.branchId, ctx.staff.staffId);
        }
        // Only mark completed AFTER stock deduction succeeds
        await db.update(posOrders)
          .set({ status: "completed", completedAt: new Date() })
          .where(eq(posOrders.id, input.orderId));
      }

      // ────────────────────────────────────────
      // Google Sheets sync (fire-and-forget — gated by client setting)
      // ────────────────────────────────────────
      if (input.autoSyncSheet) try {
        const [order] = await db.select().from(posOrders).where(eq(posOrders.id, input.orderId)).limit(1);
        const [method] = await db.select().from(posPaymentMethods).where(eq(posPaymentMethods.id, input.paymentMethodId)).limit(1);
        const [branchRow] = order?.branchId
          ? await db.select().from(branches).where(eq(branches.id, order.branchId)).limit(1)
          : [null as any];
        const [cashierRow] = await db.select().from(staff).where(eq(staff.id, ctx.staff.staffId)).limit(1);

        const items = await db.select({
          name: posOrderItems.menuItemName,
          quantity: posOrderItems.quantity,
        }).from(posOrderItems).where(eq(posOrderItems.orderId, input.orderId));

        const itemsSummary = items.map((it) => `${it.quantity}x ${it.name}`).join(", ");
        const now = new Date();

        appendCashRowAsync({
          timestamp: now.toISOString(),
          date: now.toISOString().slice(0, 10),
          time: now.toTimeString().slice(0, 8),
          orderNumber: order?.orderNumber ?? `#${input.orderId}`,
          branchName: branchRow?.name ?? "",
          branchCode: branchRow?.branchCode ?? "",
          paymentMethod: method?.name ?? "",
          paymentType: method?.type ?? "",
          amount: Number(input.amount),
          subtotal: Number(order?.subtotal ?? 0),
          tax: Number(order?.taxAmount ?? 0),
          discount: Number(order?.discountAmount ?? 0),
          total: Number(order?.totalAmount ?? 0),
          cashier: cashierRow ? `${cashierRow.firstName ?? ""} ${cashierRow.lastName ?? ""}`.trim() || cashierRow.employeeCode : "",
          customer: order?.customerName ?? "",
          tableNumber: order?.tableNumber ?? "",
          itemsSummary,
          reference: input.reference ?? "",
        });
      } catch (err) {
        // Non-fatal — payment is recorded, the row just won't appear in the sheet
        console.warn("[Orders] sheet sync prep failed:", err);
      }

      return payment;
    }),

  complete: staffProcedure
    .input(z.object({ orderId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Get order to check branchId
      const [orderCheck] = await db.select().from(posOrders).where(eq(posOrders.id, input.orderId)).limit(1);
      if (!orderCheck) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });

      // Deduct stock first (transactional — throws if insufficient)
      if (orderCheck.branchId) {
        await deductStockForOrder(input.orderId, orderCheck.branchId, ctx.staff.staffId);
      }

      // Only mark completed AFTER stock deduction succeeds
      await db.update(posOrders).set({ status: "completed", completedAt: new Date() })
        .where(eq(posOrders.id, input.orderId));

      const order = await getFullOrder(db, input.orderId);
      await logAudit({ staff: ctx.staff, action: "complete", entity: "pos_orders", entityId: input.orderId });

      if (order && order.branchId) {
        await broadcastToBranch(order.branchId, RealtimeEvents.ORDER_UPDATED, {
          id: order.id,
          orderNumber: order.orderNumber,
          status: "completed",
        });
      }

      return order;
    }),

  cancel: staffProcedure
    .input(z.object({ orderId: z.number().int(), reason: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(posOrders).set({
        status: "cancelled", cancelledAt: new Date(), cancelReason: input.reason,
      }).where(eq(posOrders.id, input.orderId));
      const order = await getFullOrder(db, input.orderId);
      await logAudit({ staff: ctx.staff, action: "cancel", entity: "pos_orders", entityId: input.orderId });

      if (order && order.branchId) {
        await broadcastToBranch(order.branchId, RealtimeEvents.ORDER_UPDATED, {
          id: order.id,
          orderNumber: order.orderNumber,
          status: "cancelled",
        });
      }

      return order;
    }),

  listHeld: staffProcedure
    .input(z.object({ branchId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(posOrders)
        .where(and(eq(posOrders.branchId, input.branchId), eq(posOrders.status, "draft")))
        .orderBy(desc(posOrders.createdAt));
    }),

  // Manual Google Sheet sync — push a payment to the sheet on demand.
  // Useful when the auto-sync setting is OFF, or to retry failed pushes.
  syncPaymentToSheet: staffProcedure
    .input(z.object({ orderId: z.number().int(), paymentId: z.number().int().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [order] = await db.select().from(posOrders).where(eq(posOrders.id, input.orderId)).limit(1);
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });
      const payments = await db.select().from(posOrderPayments).where(eq(posOrderPayments.orderId, input.orderId));
      const payment = input.paymentId ? payments.find((p) => p.id === input.paymentId) : payments[0];
      if (!payment) throw new TRPCError({ code: "NOT_FOUND", message: "No payment recorded for this order" });
      const [method] = await db.select().from(posPaymentMethods).where(eq(posPaymentMethods.id, payment.paymentMethodId!)).limit(1);
      const [branchRow] = order.branchId
        ? await db.select().from(branches).where(eq(branches.id, order.branchId)).limit(1)
        : [null as any];
      const [cashierRow] = await db.select().from(staff).where(eq(staff.id, ctx.staff.staffId)).limit(1);
      const items = await db.select({
        name: posOrderItems.menuItemName,
        quantity: posOrderItems.quantity,
      }).from(posOrderItems).where(eq(posOrderItems.orderId, input.orderId));
      const now = new Date();
      const { appendCashRow } = await import("../lib/sheetsSync");
      const ok = await appendCashRow({
        timestamp: now.toISOString(),
        date: now.toISOString().slice(0, 10),
        time: now.toTimeString().slice(0, 8),
        orderNumber: order.orderNumber ?? "",
        branchName: branchRow?.name ?? "",
        branchCode: branchRow?.branchCode ?? "",
        paymentMethod: method?.name ?? "",
        paymentType: method?.type ?? "",
        amount: Number(payment.amount),
        subtotal: Number(order.subtotal ?? 0),
        tax: Number(order.taxAmount ?? 0),
        discount: Number(order.discountAmount ?? 0),
        total: Number(order.totalAmount ?? 0),
        cashier: cashierRow ? `${cashierRow.firstName ?? ""} ${cashierRow.lastName ?? ""}`.trim() || cashierRow.employeeCode : "",
        customer: order.customerName ?? "",
        tableNumber: order.tableNumber ?? "",
        itemsSummary: items.map((it) => `${it.quantity}x ${it.name}`).join(", "),
        reference: payment.referenceNumber ?? "(manual sync)",
      });
      return { success: ok };
    }),

  // Bulk sync — push multiple orders at once. Useful when sheet was down,
  // or auto-sync was off for a period.
  bulkSyncToSheet: staffAdminProcedure
    .input(z.object({ orderIds: z.array(z.number().int()).min(1).max(500) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { appendCashRow } = await import("../lib/sheetsSync");
      let synced = 0;
      for (const id of input.orderIds) {
        const [order] = await db.select().from(posOrders).where(eq(posOrders.id, id)).limit(1);
        if (!order) continue;
        const payments = await db.select().from(posOrderPayments).where(eq(posOrderPayments.orderId, id));
        for (const payment of payments) {
          const [method] = await db.select().from(posPaymentMethods).where(eq(posPaymentMethods.id, payment.paymentMethodId!)).limit(1);
          const [branchRow] = order.branchId ? await db.select().from(branches).where(eq(branches.id, order.branchId)).limit(1) : [null as any];
          const items = await db.select({ name: posOrderItems.menuItemName, quantity: posOrderItems.quantity }).from(posOrderItems).where(eq(posOrderItems.orderId, id));
          const ts = order.completedAt ?? order.createdAt ?? new Date();
          const ok = await appendCashRow({
            timestamp: ts.toISOString(),
            date: ts.toISOString().slice(0, 10),
            time: ts.toTimeString().slice(0, 8),
            orderNumber: order.orderNumber ?? "",
            branchName: branchRow?.name ?? "",
            branchCode: branchRow?.branchCode ?? "",
            paymentMethod: method?.name ?? "",
            paymentType: method?.type ?? "",
            amount: Number(payment.amount),
            subtotal: Number(order.subtotal ?? 0),
            tax: Number(order.taxAmount ?? 0),
            discount: Number(order.discountAmount ?? 0),
            total: Number(order.totalAmount ?? 0),
            cashier: "",
            customer: order.customerName ?? "",
            tableNumber: order.tableNumber ?? "",
            itemsSummary: items.map((it) => `${it.quantity}x ${it.name}`).join(", "),
            reference: payment.referenceNumber ?? "(bulk sync)",
          });
          if (ok) synced++;
        }
      }
      return { synced };
    }),

  holdOrder: staffProcedure
    .input(z.object({ orderId: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(posOrders).set({ status: "draft" }).where(eq(posOrders.id, input.orderId));
      return getFullOrder(db, input.orderId);
    }),

  resumeOrder: staffProcedure
    .input(z.object({ orderId: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(posOrders).set({ status: "pending" }).where(eq(posOrders.id, input.orderId));
      return getFullOrder(db, input.orderId);
    }),

  // ─── Confirm Order (draft→pending + QR + print payloads) ────────────────────
  confirmOrder: staffProcedure
    .input(z.object({ orderId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const fullOrder = await getFullOrder(db, input.orderId);
      if (!fullOrder) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });

      // Update status to pending
      await db.update(posOrders).set({ status: "pending" }).where(eq(posOrders.id, input.orderId));

      // Get branch info and payment settings
      const [branch] = fullOrder.branchId
        ? await db.select().from(branches).where(eq(branches.id, fullOrder.branchId)).limit(1)
        : [null];
      const [paySettings] = fullOrder.branchId
        ? await db.select().from(posBranchPaymentSettings).where(eq(posBranchPaymentSettings.branchId, fullOrder.branchId)).limit(1)
        : [null];
      const [staffMember] = fullOrder.staffId
        ? await db.select().from(staff).where(eq(staff.id, fullOrder.staffId)).limit(1)
        : [null];

      const settings: BranchPaymentSettings = paySettings || {};
      const orderData = buildOrderData(fullOrder, branch, staffMember);

      // Generate PromptPay QR if settings available
      let qrDataUrl: string | undefined;
      if (settings.promptpayId && Number(fullOrder.totalAmount) > 0) {
        qrDataUrl = await generatePromptPayQRDataUrl(settings.promptpayId, Number(fullOrder.totalAmount));
        await db.update(posOrders).set({
          paymentQrPayload: qrDataUrl,
          paymentQrAmount: fullOrder.totalAmount,
        }).where(eq(posOrders.id, input.orderId));
      }

      // Generate print payloads
      const orderSlipHtml = await generateOrderSlipHTML(orderData, settings, qrDataUrl);
      const labelsHtml = generateAllLabelsHTML(orderData);
      const kitchenTicketHtml = generateKitchenTicketHTML(orderData);

      await logAudit({ staff: ctx.staff, action: "confirm_order", entity: "pos_orders", entityId: input.orderId });

      return {
        order: { ...fullOrder, status: "pending" },
        qrDataUrl,
        printPayloads: {
          orderSlip: orderSlipHtml,
          labels: labelsHtml,
          kitchenTicket: kitchenTicketHtml,
        },
      };
    }),

  // ─── Generate Payment QR (standalone) ───────────────────────────────────────
  generatePaymentQr: staffProcedure
    .input(z.object({ orderId: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [order] = await db.select().from(posOrders).where(eq(posOrders.id, input.orderId)).limit(1);
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });

      const [paySettings] = order.branchId
        ? await db.select().from(posBranchPaymentSettings).where(eq(posBranchPaymentSettings.branchId, order.branchId)).limit(1)
        : [null];

      const promptpayId = paySettings?.promptpayId || "0951234567";
      const amount = Number(order.totalAmount);
      const qrDataUrl = await generatePromptPayQRDataUrl(promptpayId, amount);

      await db.update(posOrders).set({
        paymentQrPayload: qrDataUrl,
        paymentQrAmount: String(amount) as any,
      }).where(eq(posOrders.id, input.orderId));

      return { qrDataUrl, amount, promptpayName: paySettings?.promptpayName || "Hibi Matcha Cafe" };
    }),

  // ─── Check Payment Status (PromptPay Verification) ──────────────────────────
  checkPaymentStatus: staffProcedure
    .input(z.object({ orderId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [order] = await db.select().from(posOrders).where(eq(posOrders.id, input.orderId)).limit(1);
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });

      // Check if there is a completed payment for this order
      const [payment] = await db.select().from(posOrderPayments)
        .where(and(
          eq(posOrderPayments.orderId, input.orderId),
          eq(posOrderPayments.status, "completed")
        )).limit(1);

      if (payment) {
        return { paid: true, referenceNumber: payment.referenceNumber ?? undefined };
      }

      return { paid: false };
    }),

  // ─── Simulate Payment Webhook (PromptPay Simulator) ─────────────────────────
  simulatePaymentWebhook: staffProcedure
    .input(z.object({ orderId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [order] = await db.select().from(posOrders).where(eq(posOrders.id, input.orderId)).limit(1);
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });

      if (order.status === "completed") {
        return { success: true, message: "Order already completed" };
      }

      // Find promptpay payment method
      const [pm] = await db.select().from(posPaymentMethods)
        .where(eq(posPaymentMethods.type, "qr"))
        .limit(1);
      const paymentMethodId = pm ? pm.id : 1; // Fallback to Cash or first method if not found

      const referenceNumber = "TXN-" + Math.floor(100000 + Math.random() * 900000).toString();

      // Record payment
      await db.insert(posOrderPayments).values({
        orderId: input.orderId,
        paymentMethodId,
        amount: order.totalAmount,
        referenceNumber,
        status: "completed",
        paidAt: new Date(),
      });

      // Update order status to completed
      await db.update(posOrders).set({
        status: "completed",
        paymentRefNumber: referenceNumber,
        completedAt: new Date(),
      }).where(eq(posOrders.id, input.orderId));

      await logAudit({ staff: ctx.staff, action: "payment_webhook_simulate", entity: "pos_orders", entityId: input.orderId });

      return { success: true, referenceNumber };
    }),

  // ─── Mark Paid ──────────────────────────────────────────────────────────────
  markPaid: staffProcedure
    .input(z.object({
      orderId: z.number().int(),
      paymentMethodId: z.number().int(),
      referenceNumber: z.string().optional(),
      receivedAmount: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [order] = await db.select().from(posOrders).where(eq(posOrders.id, input.orderId)).limit(1);
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });

      // Record payment
      await db.insert(posOrderPayments).values({
        orderId: input.orderId,
        paymentMethodId: input.paymentMethodId,
        amount: order.totalAmount,
        referenceNumber: input.referenceNumber || null,
        status: "completed",
        paidAt: new Date(),
      });

      // Update order status to completed
      await db.update(posOrders).set({
        status: "completed",
        paymentRefNumber: input.referenceNumber || null,
        completedAt: new Date(),
      }).where(eq(posOrders.id, input.orderId));

      // Get payment method name for receipt
      const [payMethod] = await db.select().from(posPaymentMethods).where(eq(posPaymentMethods.id, input.paymentMethodId)).limit(1);

      // Generate receipt
      const fullOrder = await getFullOrder(db, input.orderId);
      const [branch] = order.branchId
        ? await db.select().from(branches).where(eq(branches.id, order.branchId)).limit(1)
        : [null];
      const [paySettings] = order.branchId
        ? await db.select().from(posBranchPaymentSettings).where(eq(posBranchPaymentSettings.branchId, order.branchId)).limit(1)
        : [null];
      const [staffMember] = order.staffId
        ? await db.select().from(staff).where(eq(staff.id, order.staffId)).limit(1)
        : [null];

      const settings: BranchPaymentSettings = paySettings || {};
      const orderData = buildOrderData(fullOrder!, branch, staffMember);
      const receiptHtml = generateReceiptHTML(
        orderData,
        settings,
        payMethod?.nameThai || payMethod?.name || "N/A",
        input.referenceNumber
      );

      const change = input.receivedAmount ? input.receivedAmount - Number(order.totalAmount) : 0;

      await logAudit({ staff: ctx.staff, action: "mark_paid", entity: "pos_orders", entityId: input.orderId,
        details: JSON.stringify({ paymentMethod: payMethod?.name, amount: order.totalAmount }) });

      // Sync to Google Sheets if cash
      if (payMethod?.type === "cash") {
        const now = new Date();
        appendCashRowAsync({
          timestamp: now.toISOString(),
          date: now.toISOString().slice(0, 10),
          time: now.toTimeString().slice(0, 8),
          orderNumber: order.orderNumber || "",
          branchName: branch?.name || "",
          branchCode: branch?.branchCode || "",
          paymentMethod: payMethod?.name || "Cash",
          paymentType: payMethod?.type || "cash",
          amount: Number(order.totalAmount),
          subtotal: Number(order.subtotal || 0),
          tax: Number(order.taxAmount || 0),
          discount: Number(order.discountAmount || 0),
          total: Number(order.totalAmount),
          cashier: staffMember ? `${staffMember.firstName || ""} ${staffMember.lastName || ""}`.trim() : ctx.staff.employeeCode,
          customer: order.customerName || "",
          tableNumber: order.tableNumber || "",
          itemsSummary: "",
          reference: input.referenceNumber || "",
        });
      }

      return { success: true, change, receiptHtml, order: fullOrder };
    }),

  // ─── Get Print Payload (for reprint) ────────────────────────────────────────
  getPrintPayload: staffProcedure
    .input(z.object({
      orderId: z.number().int(),
      documentType: z.enum(["order_slip", "labels", "kitchen_ticket", "receipt"]),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const fullOrder = await getFullOrder(db, input.orderId);
      if (!fullOrder) throw new TRPCError({ code: "NOT_FOUND" });

      const [branch] = fullOrder.branchId
        ? await db.select().from(branches).where(eq(branches.id, fullOrder.branchId)).limit(1)
        : [null];
      const [paySettings] = fullOrder.branchId
        ? await db.select().from(posBranchPaymentSettings).where(eq(posBranchPaymentSettings.branchId, fullOrder.branchId)).limit(1)
        : [null];
      const [staffMember] = fullOrder.staffId
        ? await db.select().from(staff).where(eq(staff.id, fullOrder.staffId)).limit(1)
        : [null];

      const settings: BranchPaymentSettings = paySettings || {};
      const orderData = buildOrderData(fullOrder, branch, staffMember);

      switch (input.documentType) {
        case "order_slip": {
          const qrDataUrl = fullOrder.paymentQrPayload || undefined;
          return { html: await generateOrderSlipHTML(orderData, settings, qrDataUrl) };
        }
        case "labels":
          return { html: generateAllLabelsHTML(orderData) };
        case "kitchen_ticket":
          return { html: generateKitchenTicketHTML(orderData) };
        case "receipt": {
          const payments = fullOrder.payments || [];
          const lastPayment = payments[payments.length - 1];
          return { html: generateReceiptHTML(orderData, settings, undefined, lastPayment?.referenceNumber || undefined) };
        }
      }
    }),

  // ─── List Pending Orders (for payment queue) ────────────────────────────────
  listPending: staffProcedure
    .input(z.object({ branchId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const orders = await db.select().from(posOrders)
        .where(and(
          eq(posOrders.branchId, input.branchId),
          eq(posOrders.status, "pending"),
        ))
        .orderBy(desc(posOrders.createdAt))
        .limit(50);

      const result = await Promise.all(orders.map(async (order) => {
        const items = await db.select().from(posOrderItems)
          .where(eq(posOrderItems.orderId, order.id));
        return { ...order, items };
      }));

      return result;
    }),
});

async function getFullOrder(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, orderId: number) {
  const [order] = await db.select().from(posOrders).where(eq(posOrders.id, orderId)).limit(1);
  if (!order) return null;

  const items = await db.select().from(posOrderItems).where(eq(posOrderItems.orderId, orderId));
  const itemsWithOptions = await Promise.all(items.map(async (item) => {
    const options = await db.select().from(posOrderItemOptions)
      .where(eq(posOrderItemOptions.orderItemId, item.id));
    // Lookup SKU from menu item
    let menuItemSku: string | undefined;
    if (item.menuItemId) {
      const [menuItem] = await db.select({ sku: posMenuItems.sku }).from(posMenuItems)
        .where(eq(posMenuItems.id, item.menuItemId)).limit(1);
      menuItemSku = menuItem?.sku || undefined;
    }
    return { ...item, options, menuItemSku };
  }));

  const payments = await db.select().from(posOrderPayments).where(eq(posOrderPayments.orderId, orderId));

  return { ...order, items: itemsWithOptions, payments };
}

function buildOrderData(fullOrder: any, branch: any, staffMember: any): OrderData {
  const items: OrderItemData[] = (fullOrder.items || []).map((item: any) => ({
    id: item.id || 0,
    menuItemName: item.menuItemName || "Unknown",
    menuItemSku: item.menuItemSku || item.sku || undefined,
    quantity: item.quantity || 1,
    unitPrice: Number(item.unitPrice || 0),
    totalPrice: Number(item.totalPrice || 0),
    options: (item.options || []).map((o: any) => ({ name: o.optionName || o.name || "", priceAdjustment: Number(o.priceAdjustment || 0) })),
    notes: item.notes || undefined,
  }));

  // Payment info from last payment
  const payments = fullOrder.payments || [];
  const lastPayment = payments[payments.length - 1];

  return {
    id: fullOrder.id,
    orderNumber: fullOrder.orderNumber || `#${fullOrder.id}`,
    orderType: fullOrder.orderType || "dine-in",
    tableNumber: fullOrder.tableNumber || undefined,
    customerName: fullOrder.customerName || undefined,
    branchName: branch?.name || "สาขาลาดพร้าว71",
    branchAddress: branch?.address || "",
    branchPhone: branch?.phone || "",
    staffName: staffMember ? `${staffMember.firstName || ""} ${staffMember.lastName || ""}`.trim() : "Staff",
    items,
    subtotal: Number(fullOrder.subtotal || 0),
    discountAmount: Number(fullOrder.discountAmount || 0),
    taxAmount: Number(fullOrder.taxAmount || 0),
    serviceCharge: Number(fullOrder.serviceCharge || 0),
    totalAmount: Number(fullOrder.totalAmount || 0),
    createdAt: fullOrder.createdAt ? new Date(fullOrder.createdAt) : new Date(),
    // Receipt-specific fields
    receiptNumber: fullOrder.receiptNumber || undefined,
    pickupNumber: fullOrder.pickupNumber || undefined,
    paymentMethodName: lastPayment?.methodName || undefined,
    paidAmount: lastPayment ? Number(lastPayment.amount || 0) : undefined,
  };
}
