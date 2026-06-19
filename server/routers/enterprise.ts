import { TRPCError } from "@trpc/server";
import { eq, and, desc, gte, lte, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import {
  masterPaymentMethods, branchPaymentMethods, posRefunds,
  masterDropdowns, masterDropdownOptions, posWasteRecords,
  posInventoryCountSessions, posInventoryCountSessionItems,
  accountsReceivable, franchiseRoyalties, franchiseComplianceScores,
  staff, branches, posOrders, posOrderItems, posRecipeIngredients,
  posBranchInventoryStock, posInventoryMovements, posInventoryItems,
  auditLogs, members, memberPoints, supplierPaymentSchedules,
  supplierPaymentInstallments, posExpenseReceipts,
  posDocumentSequences, posPaymentSettlements, posCashClosings,
  posOrderPayments, posPrinterConfigs, posExportDocuments
} from "../../drizzle/schema";
import { logAudit } from "../lib/audit";
import { verifyPin } from "../lib/auth";
import { lookupGiftVoucherBalance, deductGiftVoucherBalance } from "../lib/giftVouchers";
import { calculateFranchiseComplianceScores } from "../lib/franchiseCompliance";
import { router, staffProcedure, staffAdminProcedure } from "../_core/trpc";
import { getFullOrder, deductStockForOrder, finalizeOrderStockDeduction } from "./orders";

// Helper function to generate document numbering sequences sequentially
async function generateDocumentNumber(db: any, branchId: number, docType: string) {
  const [branch] = await db.select({ branchCode: branches.branchCode }).from(branches).where(eq(branches.id, branchId)).limit(1);
  const branchCode = branch?.branchCode || `BKK${branchId}`;

  let [seqConfig] = await db.select()
    .from(posDocumentSequences)
    .where(and(eq(posDocumentSequences.branchId, branchId), eq(posDocumentSequences.docType, docType)))
    .limit(1);

  if (!seqConfig) {
    let prefix = "RCPT";
    if (docType === "full_tax_invoice") prefix = "TAX";
    else if (docType === "credit_note") prefix = "CN";
    else if (docType === "debit_note") prefix = "DN";
    else if (docType === "delivery_note") prefix = "DELV";
    else if (docType === "billing_statement") prefix = "BILL";

    const [result] = await db.insert(posDocumentSequences).values({
      branchId,
      docType,
      prefix,
      includeBranchCode: true,
      includeDate: true,
      currentSequence: 0,
    });
    const seqId = (result as any).insertId as number;
    [seqConfig] = await db.select().from(posDocumentSequences).where(eq(posDocumentSequences.id, seqId)).limit(1);
  }

  const now = new Date();
  const currentDateStr = now.toISOString().slice(0, 10);
  const currentDateCompact = currentDateStr.replace(/-/g, "");

  let nextSequence = (seqConfig.currentSequence ?? 0) + 1;

  if (seqConfig.includeDate) {
    let lastResetDateStr = "";
    if (seqConfig.lastResetDate) {
      if (seqConfig.lastResetDate instanceof Date) {
        const tzOffset = seqConfig.lastResetDate.getTimezoneOffset() * 60000;
        lastResetDateStr = new Date(seqConfig.lastResetDate.getTime() - tzOffset).toISOString().slice(0, 10);
      } else {
        lastResetDateStr = String(seqConfig.lastResetDate).slice(0, 10);
      }
    }
    if (lastResetDateStr !== currentDateStr) {
      nextSequence = 1;
    }
  }

  await db.update(posDocumentSequences)
    .set({
      currentSequence: nextSequence,
      lastResetDate: currentDateStr,
    })
    .where(eq(posDocumentSequences.id, seqConfig.id));

  const parts: string[] = [];
  parts.push(seqConfig.prefix);
  if (seqConfig.includeBranchCode) parts.push(branchCode);
  if (seqConfig.includeDate) parts.push(currentDateCompact);
  parts.push(String(nextSequence).padStart(4, "0"));

  return parts.join("-");
}

export const enterpriseRouter = router({
  // ─── Payment Methods Upgrades ───────────────────────────────────────────────
  listMasterPaymentMethods: staffProcedure
    .input(z.object({ activeOnly: z.boolean().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      let rows = await db.select().from(masterPaymentMethods);
      if (rows.length === 0) {
        const defaults = [
          { code: "cash", name: "Cash", nameThai: "เงินสด", type: "cash", iconName: "IconCoin", color: "emerald", requiresSettlement: false, isCashEquivalent: true },
          { code: "promptpay", name: "PromptPay QR", nameThai: "พร้อมเพย์ (QR)", type: "qr", iconName: "IconQR", color: "sky", requiresReference: true, requiresSettlement: true, providerName: "PromptPay", settlementDays: 1 },
          { code: "bank_transfer", name: "Bank Transfer", nameThai: "โอนผ่านธนาคาร", type: "transfer", iconName: "IconBank", color: "indigo", requiresReference: true, requiresSettlement: true, providerName: "Bank", settlementDays: 1 },
          { code: "credit_card", name: "Credit Card", nameThai: "บัตรเครดิต", type: "card", iconName: "IconWallet", color: "purple", requiresSettlement: true, providerName: "EDC Merchant", settlementDays: 2, feeType: "percentage", feeAmount: "2.95" },
          { code: "debit_card", name: "Debit Card", nameThai: "บัตรเดบิต", type: "card", iconName: "IconWallet", color: "violet", requiresSettlement: true, providerName: "EDC Merchant", settlementDays: 2, feeType: "percentage", feeAmount: "1.65" },
          { code: "omise", name: "Omise Gateway", nameThai: "โอมิเซะ", type: "card", iconName: "IconWallet", color: "pink", requiresSettlement: true, providerName: "Omise", settlementDays: 3, feeType: "percentage", feeAmount: "3.65" },
          { code: "stripe", name: "Stripe Gateway", nameThai: "สไตรป์", type: "card", iconName: "IconWallet", color: "blue", requiresSettlement: true, providerName: "Stripe", settlementDays: 3, feeType: "percentage", feeAmount: "3.65" },
          { code: "truemoney", name: "TrueMoney Wallet", nameThai: "ทรูมันนี่", type: "qr", iconName: "IconQR", color: "orange", requiresReference: true, requiresSettlement: true, providerName: "TrueMoney", settlementDays: 1 },
          { code: "rabbit_linepay", name: "Rabbit LINE Pay", nameThai: "แรบบิท ไลน์เพย์", type: "qr", iconName: "IconQR", color: "green", requiresReference: true, requiresSettlement: true, providerName: "LINE Pay", settlementDays: 1 },
          { code: "grabpay", name: "GrabPay", nameThai: "แกรบเพย์", type: "qr", iconName: "IconQR", color: "emerald", requiresReference: true, requiresSettlement: true, providerName: "GrabPay", settlementDays: 1 },
          { code: "lineman", name: "LINE MAN Delivery", nameThai: "ไลน์แมน", type: "delivery_platform", iconName: "IconLeaf", color: "green", isDeliveryPlatform: true, requiresSettlement: true, providerName: "LINE MAN", settlementDays: 7 },
          { code: "grabfood", name: "GrabFood Delivery", nameThai: "แกรบฟู้ด", type: "delivery_platform", iconName: "IconLeaf", color: "emerald", isDeliveryPlatform: true, requiresSettlement: true, providerName: "GrabFood", settlementDays: 7 },
          { code: "shopeefood", name: "ShopeeFood Delivery", nameThai: "ช้อปปี้ฟู้ด", type: "delivery_platform", iconName: "IconLeaf", color: "orange", isDeliveryPlatform: true, requiresSettlement: true, providerName: "Shopee", settlementDays: 7 },
          { code: "robinhood", name: "Robinhood Delivery", nameThai: "โรบินฮู้ด", type: "delivery_platform", iconName: "IconLeaf", color: "purple", isDeliveryPlatform: true, requiresSettlement: true, providerName: "Robinhood", settlementDays: 7 },
          { code: "foodpanda", name: "FoodPanda Delivery", nameThai: "ฟู้ดแพนด้า", type: "delivery_platform", iconName: "IconLeaf", color: "pink", isDeliveryPlatform: true, requiresSettlement: true, providerName: "FoodPanda", settlementDays: 7 },
          { code: "voucher", name: "Voucher", nameThai: "วอยเชอร์", type: "voucher", iconName: "IconDiscount", color: "amber", requiresReference: true },
          { code: "gift_card", name: "Gift Card", nameThai: "บัตรของขวัญ", type: "voucher", iconName: "IconDiscount", color: "yellow", requiresReference: true },
          { code: "points", name: "Loyalty Points", nameThai: "คะแนนสะสม", type: "loyalty", iconName: "IconDiscount", color: "teal" },
          { code: "corporate_billing", name: "Corporate Billing", nameThai: "วางบิลบริษัท", type: "billing", iconName: "IconBank", color: "slate", isCreditAccount: true },
          { code: "franchise_credit", name: "Franchise Credit", nameThai: "วงเงินแฟรนไชส์", type: "credit", iconName: "IconBank", color: "neutral", isCreditAccount: true },
          { code: "staff_meal", name: "Staff Meal", nameThai: "สวัสดิการพนักงาน", type: "voucher", iconName: "IconDiscount", color: "rose" },
          { code: "complimentary", name: "Complimentary", nameThai: "อภินันทนาการ", type: "voucher", iconName: "IconDiscount", color: "cyan" },
        ];
        for (let i = 0; i < defaults.length; i++) {
          await db.insert(masterPaymentMethods).values({
            ...defaults[i],
            displayOrder: i,
            isActive: true,
            roleAvailability: ["cashier", "manager", "branch_admin", "super_admin"],
          } as any);
        }
        rows = await db.select().from(masterPaymentMethods);
      }
      if (input?.activeOnly) rows = rows.filter((m) => m.isActive);
      return rows.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    }),

  createMasterPaymentMethod: staffAdminProcedure
    .input(z.object({
      code: z.string().min(1),
      name: z.string().min(1),
      nameThai: z.string().optional(),
      type: z.string().min(1),
      iconName: z.string().optional(),
      feePercentage: z.string().optional(),
      feeFixed: z.string().optional(),
      surchargePercentage: z.string().optional(),
      surchargeFixed: z.string().optional(),
      settlementDays: z.number().int().optional(),
      roleAvailability: z.array(z.string()).optional(),
      requiresManagerPin: z.boolean().optional(),
      requiresSlipUpload: z.boolean().optional(),
      requiresReference: z.boolean().optional(),
      requiresSettlement: z.boolean().optional(),
      feeType: z.enum(["none", "fixed", "percentage"]).optional(),
      feeAmount: z.string().optional(),
      providerName: z.string().optional(),
      externalAccountId: z.string().optional(),
      displayOrder: z.number().int().optional(),
      color: z.string().optional(),
      isDeliveryPlatform: z.boolean().optional(),
      isCashEquivalent: z.boolean().optional(),
      isCreditAccount: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(masterPaymentMethods).values({
        ...input,
        isActive: true,
      } as any);
      const id = (result as any).insertId as number;
      const [created] = await db.select().from(masterPaymentMethods).where(eq(masterPaymentMethods.id, id)).limit(1);
      await logAudit({ staff: ctx.staff, action: "create", entity: "master_payment_methods", entityId: id });
      return created;
    }),

  updateMasterPaymentMethod: staffAdminProcedure
    .input(z.object({
      id: z.number().int(),
      name: z.string().optional(),
      nameThai: z.string().optional(),
      type: z.string().optional(),
      iconName: z.string().optional(),
      feePercentage: z.string().optional(),
      feeFixed: z.string().optional(),
      surchargePercentage: z.string().optional(),
      surchargeFixed: z.string().optional(),
      settlementDays: z.number().int().optional(),
      isActive: z.boolean().optional(),
      roleAvailability: z.array(z.string()).optional(),
      requiresManagerPin: z.boolean().optional(),
      requiresSlipUpload: z.boolean().optional(),
      requiresReference: z.boolean().optional(),
      requiresSettlement: z.boolean().optional(),
      feeType: z.enum(["none", "fixed", "percentage"]).optional(),
      feeAmount: z.string().optional(),
      providerName: z.string().optional(),
      externalAccountId: z.string().optional(),
      displayOrder: z.number().int().optional(),
      color: z.string().optional(),
      isDeliveryPlatform: z.boolean().optional(),
      isCashEquivalent: z.boolean().optional(),
      isCreditAccount: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(masterPaymentMethods).set(data as any).where(eq(masterPaymentMethods.id, id));
      const [updated] = await db.select().from(masterPaymentMethods).where(eq(masterPaymentMethods.id, id)).limit(1);
      await logAudit({ staff: ctx.staff, action: "update", entity: "master_payment_methods", entityId: id });
      return updated;
    }),

  deleteMasterPaymentMethod: staffAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(masterPaymentMethods).where(eq(masterPaymentMethods.id, input.id));
      await logAudit({ staff: ctx.staff, action: "delete", entity: "master_payment_methods", entityId: input.id });
      return { success: true };
    }),

  getBranchPaymentMethods: staffProcedure
    .input(z.object({ branchId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const masterList = await db.select().from(masterPaymentMethods);
      const branchEnabled = await db.select().from(branchPaymentMethods).where(eq(branchPaymentMethods.branchId, input.branchId));

      // If no branch config exists yet, all active master methods are enabled by default.
      if (branchEnabled.length === 0) {
        return masterList.map(m => ({ ...m, isEnabledForBranch: m.isActive !== false }));
      }

      const enabledIds = new Set(branchEnabled.filter(b => b.isActive).map(b => b.paymentMethodId));
      return masterList.map(m => ({
        ...m,
        isEnabledForBranch: enabledIds.has(m.id),
      }));
    }),

  toggleBranchPaymentMethod: staffAdminProcedure
    .input(z.object({ branchId: z.number().int(), paymentMethodId: z.number().int(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      
      const [existing] = await db.select()
        .from(branchPaymentMethods)
        .where(and(
          eq(branchPaymentMethods.branchId, input.branchId),
          eq(branchPaymentMethods.paymentMethodId, input.paymentMethodId)
        )).limit(1);
      
      if (existing) {
        await db.update(branchPaymentMethods)
          .set({ isActive: input.isActive })
          .where(eq(branchPaymentMethods.id, existing.id));
      } else {
        await db.insert(branchPaymentMethods).values({
          branchId: input.branchId,
          paymentMethodId: input.paymentMethodId,
          isActive: input.isActive,
        });
      }
      
      await logAudit({
        staff: ctx.staff,
        action: "toggle_branch_payment",
        entity: "branch_payment_methods",
        details: `Branch ${input.branchId} paymentMethod ${input.paymentMethodId} set to ${input.isActive}`
      });
      return { success: true };
    }),

  // ─── Refund System ──────────────────────────────────────────────────────────
  listRefunds: staffProcedure
    .input(z.object({ branchId: z.number().int().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      let query = db.select().from(posRefunds);
      let rows = await query.orderBy(desc(posRefunds.createdAt));
      
      if (input?.branchId) {
        // filter orders belonging to this branch
        const branchOrders = await db.select({ id: posOrders.id }).from(posOrders).where(eq(posOrders.branchId, input.branchId));
        const orderIds = new Set(branchOrders.map(o => o.id));
        rows = rows.filter(r => orderIds.has(r.orderId));
      }
      return rows;
    }),

  createRefundRequest: staffProcedure
    .input(z.object({
      orderId: z.number().int(),
      amount: z.string(),
      reason: z.string().min(1),
      paymentMethodId: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const rand = String(Math.floor(Math.random() * 9000) + 1000);
      const refundNumber = `REF-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${rand}`;

      const [result] = await db.insert(posRefunds).values({
        orderId: input.orderId,
        refundNumber,
        amount: input.amount,
        reason: input.reason,
        paymentMethodId: input.paymentMethodId,
        status: "requested",
      });

      const id = (result as any).insertId as number;
      await logAudit({ staff: ctx.staff, action: "refund_requested", entity: "pos_refunds", entityId: id, details: `Amount: ${input.amount}` });
      return { id, refundNumber };
    }),

  approveRefund: staffProcedure
    .input(z.object({
      refundId: z.number().int(),
      managerPin: z.string().length(4),
      returnInventory: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [refund] = await db.select().from(posRefunds).where(eq(posRefunds.id, input.refundId)).limit(1);
      if (!refund) throw new TRPCError({ code: "NOT_FOUND", message: "Refund record not found" });

      // 1. PIN verification check (Must be manager/admin)
      const allStaff = await db.select().from(staff).where(eq(staff.status, "active"));
      const authorizedStaff = allStaff.find(s => 
        (s.role === "super_admin" || s.role === "staff_admin" || s.role === "owner" || s.role === "hq_admin" || s.role === "branch_admin" || s.role === "manager") && 
        s.pinHash && 
        verifyPin(input.managerPin, s.pinHash)
      );

      if (!authorizedStaff) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid manager PIN" });
      }

      // 2. Approve & Update Refund
      await db.update(posRefunds).set({
        status: "approved",
        approvedByStaffId: authorizedStaff.id,
        approvedAt: new Date(),
      }).where(eq(posRefunds.id, input.refundId));

      // 3. Mark order as refunded
      await db.update(posOrders).set({
        status: "refunded",
      }).where(eq(posOrders.id, refund.orderId));

      // 4. Return Inventory Stock if enabled
      if (input.returnInventory) {
        const [order] = await db.select().from(posOrders).where(eq(posOrders.id, refund.orderId)).limit(1);
        if (order && order.branchId) {
          const orderItems = await db.select().from(posOrderItems).where(eq(posOrderItems.orderId, refund.orderId));
          const menuItemIds = orderItems.map(oi => oi.menuItemId).filter((id): id is number => id !== null);
          
          if (menuItemIds.length > 0) {
            const recipes = await db.select().from(posRecipeIngredients).where(inArray(posRecipeIngredients.menuItemId, menuItemIds));
            
            for (const oi of orderItems) {
              const itemRecipes = recipes.filter(r => r.menuItemId === oi.menuItemId);
              for (const r of itemRecipes) {
                const returnQty = Number(r.quantity ?? 0) * (oi.quantity ?? 1);
                if (returnQty > 0) {
                  // Increment stock
                  await db.update(posBranchInventoryStock)
                    .set({ currentStock: sql`${posBranchInventoryStock.currentStock} + ${returnQty}` })
                    .where(and(
                      eq(posBranchInventoryStock.branchId, order.branchId),
                      eq(posBranchInventoryStock.inventoryItemId, r.inventoryItemId)
                    ));
                  
                  // Record movement
                  await db.insert(posInventoryMovements).values({
                    branchId: order.branchId,
                    inventoryItemId: r.inventoryItemId,
                    movementType: "received",
                    quantity: String(returnQty),
                    referenceType: "order",
                    referenceId: refund.orderId,
                    notes: `Refund return stock for order #${order.orderNumber}`,
                    performedByStaffId: authorizedStaff.id,
                  });
                }
              }
            }
          }
        }
      }

      await logAudit({
        staff: ctx.staff,
        action: "refund_approved",
        entity: "pos_refunds",
        entityId: input.refundId,
        details: `Approved by Staff ID: ${authorizedStaff.id}`
      });

      return { success: true };
    }),

  // ─── Void System ────────────────────────────────────────────────────────────
  voidOrder: staffProcedure
    .input(z.object({
      orderId: z.number().int(),
      managerPin: z.string().length(4),
      reason: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [order] = await db.select().from(posOrders).where(eq(posOrders.id, input.orderId)).limit(1);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });

      // Void permissions: super_admin, staff_admin, owner, hq_admin, branch_admin, manager
      const allStaff = await db.select().from(staff).where(eq(staff.status, "active"));
      const authorizedStaff = allStaff.find(s => 
        (s.role === "super_admin" || s.role === "staff_admin" || s.role === "owner" || s.role === "hq_admin" || s.role === "branch_admin" || s.role === "manager") && 
        s.pinHash && 
        verifyPin(input.managerPin, s.pinHash)
      );

      if (!authorizedStaff) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid manager PIN" });
      }

      // Void the order
      await db.update(posOrders).set({
        status: "cancelled",
        cancelledAt: new Date(),
        cancelReason: input.reason,
      }).where(eq(posOrders.id, input.orderId));

      await logAudit({
        staff: ctx.staff,
        action: "void_order",
        entity: "pos_orders",
        entityId: input.orderId,
        details: `Voided by PIN verify. Reason: ${input.reason}`,
        beforeData: order,
      });

      return { success: true };
    }),

  // ─── Master Data Engine ──────────────────────────────────────────────────────
  listDropdowns: staffProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(masterDropdowns).where(eq(masterDropdowns.isArchived, false));
  }),

  createDropdown: staffAdminProcedure
    .input(z.object({ name: z.string().min(1), nameThai: z.string().optional(), code: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(masterDropdowns).values({ ...input, isArchived: false });
      const id = (result as any).insertId as number;
      await logAudit({ staff: ctx.staff, action: "create", entity: "master_dropdowns", entityId: id });
      return { id, ...input };
    }),

  updateDropdown: staffAdminProcedure
    .input(z.object({ id: z.number().int(), name: z.string().optional(), nameThai: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(masterDropdowns).set(data).where(eq(masterDropdowns.id, id));
      await logAudit({ staff: ctx.staff, action: "update", entity: "master_dropdowns", entityId: id });
      return { success: true };
    }),

  archiveDropdown: staffAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(masterDropdowns).set({ isArchived: true }).where(eq(masterDropdowns.id, input.id));
      await logAudit({ staff: ctx.staff, action: "archive", entity: "master_dropdowns", entityId: input.id });
      return { success: true };
    }),

  listDropdownOptions: staffProcedure
    .input(z.object({ dropdownId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(masterDropdownOptions)
        .where(and(eq(masterDropdownOptions.dropdownId, input.dropdownId), eq(masterDropdownOptions.isArchived, false)));
    }),

  createDropdownOption: staffAdminProcedure
    .input(z.object({ dropdownId: z.number().int(), value: z.string().min(1), labelTh: z.string().optional(), labelEn: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(masterDropdownOptions).values({ ...input, isArchived: false });
      const id = (result as any).insertId as number;
      await logAudit({ staff: ctx.staff, action: "create", entity: "master_dropdown_options", entityId: id });
      return { id, ...input };
    }),

  updateDropdownOption: staffAdminProcedure
    .input(z.object({ id: z.number().int(), value: z.string().optional(), labelTh: z.string().optional(), labelEn: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(masterDropdownOptions).set(data).where(eq(masterDropdownOptions.id, id));
      return { success: true };
    }),

  archiveDropdownOption: staffAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(masterDropdownOptions).set({ isArchived: true }).where(eq(masterDropdownOptions.id, input.id));
      return { success: true };
    }),

  importDropdownOptionsCsv: staffAdminProcedure
    .input(z.object({ dropdownId: z.number().int(), options: z.array(z.object({ value: z.string(), labelTh: z.string().optional(), labelEn: z.string().optional() })) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db.transaction(async (tx) => {
        // Archive existing options first
        await tx.update(masterDropdownOptions).set({ isArchived: true }).where(eq(masterDropdownOptions.dropdownId, input.dropdownId));
        
        // Insert new ones
        for (const opt of input.options) {
          await tx.insert(masterDropdownOptions).values({
            dropdownId: input.dropdownId,
            value: opt.value,
            labelTh: opt.labelTh || "",
            labelEn: opt.labelEn || "",
            isArchived: false,
          });
        }
      });

      await logAudit({ staff: ctx.staff, action: "import_csv", entity: "master_dropdown_options", details: `Imported ${input.options.length} options` });
      return { success: true };
    }),

  // ─── Audit Log Center ────────────────────────────────────────────────────────
  getAuditLogs: staffAdminProcedure
    .input(z.object({
      branchId: z.number().int().optional(),
      action: z.string().optional(),
      entity: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      limit: z.number().int().default(50),
      offset: z.number().int().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { logs: [], total: 0 };

      let query = db.select().from(auditLogs);
      let rows = await query.orderBy(desc(auditLogs.createdAt));

      if (input.branchId) rows = rows.filter(r => r.branchId === input.branchId);
      if (input.action) rows = rows.filter(r => r.action === input.action);
      if (input.entity) rows = rows.filter(r => r.entity === input.entity);
      if (input.dateFrom) { const d = input.dateFrom!; rows = rows.filter(r => r.createdAt && r.createdAt >= new Date(d)); }
      if (input.dateTo) { const d = input.dateTo!; rows = rows.filter(r => r.createdAt && r.createdAt <= new Date(d)); }

      const total = rows.length;
      const paginated = rows.slice(input.offset, input.offset + input.limit);
      return { logs: paginated, total };
    }),

  // ─── Waste Management ────────────────────────────────────────────────────────
  listWasteRecords: staffProcedure
    .input(z.object({ branchId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(posWasteRecords).where(eq(posWasteRecords.branchId, input.branchId)).orderBy(desc(posWasteRecords.createdAt));
    }),

  recordWaste: staffProcedure
    .input(z.object({
      branchId: z.number().int(),
      inventoryItemId: z.number().int(),
      category: z.enum(["expired", "damaged", "spill", "training", "sampling", "unknown"]),
      quantity: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [item] = await db.select().from(posInventoryItems).where(eq(posInventoryItems.id, input.inventoryItemId)).limit(1);
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Inventory item not found" });

      const costPerUnit = Number(item.costPerUnit ?? 0);
      const totalCost = costPerUnit * Number(input.quantity);

      // Deduct stock from posBranchInventoryStock
      await db.update(posBranchInventoryStock)
        .set({ currentStock: sql`${posBranchInventoryStock.currentStock} - ${input.quantity}` })
        .where(and(
          eq(posBranchInventoryStock.branchId, input.branchId),
          eq(posBranchInventoryStock.inventoryItemId, input.inventoryItemId)
        ));

      // Log movement
      await db.insert(posInventoryMovements).values({
        branchId: input.branchId,
        inventoryItemId: input.inventoryItemId,
        movementType: "wasted",
        quantity: String(-Number(input.quantity)),
        referenceType: "manual",
        notes: `Wasted: ${input.category}. ${input.notes ?? ""}`,
        performedByStaffId: ctx.staff.staffId,
      });

      // Insert waste record
      const [result] = await db.insert(posWasteRecords).values({
        branchId: input.branchId,
        inventoryItemId: input.inventoryItemId,
        category: input.category,
        quantity: input.quantity,
        costPerUnit: String(costPerUnit),
        totalCost: String(totalCost),
        notes: input.notes,
        recordedByStaffId: ctx.staff.staffId,
      });

      const id = (result as any).insertId as number;
      await logAudit({ staff: ctx.staff, action: "waste_recorded", entity: "pos_waste_records", entityId: id, details: `${input.quantity} wasted` });
      return { id };
    }),

  getWasteMetrics: staffAdminProcedure
    .input(z.object({ branchId: z.number().int(), dateFrom: z.string().optional(), dateTo: z.string().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { totalCost: 0, totalQty: 0, trends: [] };

      let rows = await db.select().from(posWasteRecords).where(eq(posWasteRecords.branchId, input.branchId));
      if (input.dateFrom) rows = rows.filter(r => r.createdAt && r.createdAt >= new Date(input.dateFrom!));
      if (input.dateTo) rows = rows.filter(r => r.createdAt && r.createdAt <= new Date(input.dateTo!));

      const totalCost = rows.reduce((acc, r) => acc + Number(r.totalCost), 0);
      const totalQty = rows.reduce((acc, r) => acc + Number(r.quantity), 0);

      // Group by date for trends
      const grouped = rows.reduce((acc, r) => {
        const d = r.createdAt ? r.createdAt.toISOString().slice(0, 10) : "Unknown";
        acc[d] = (acc[d] || 0) + Number(r.totalCost);
        return acc;
      }, {} as Record<string, number>);

      const trends = Object.entries(grouped).map(([date, cost]) => ({ date, cost }));

      return { totalCost, totalQty, trends };
    }),

  // ─── Customer 360 & Segments ────────────────────────────────────────────────
  listCustomers: staffProcedure
    .input(z.object({ search: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      let rows = await db.select().from(members);
      if (input?.search) {
        const q = input.search.toLowerCase();
        rows = rows.filter(r => 
          (r.firstName ?? "").toLowerCase().includes(q) ||
          (r.lastName ?? "").toLowerCase().includes(q) ||
          (r.phone ?? "").includes(q)
        );
      }

      // Enrich with calculations
      const pointsLedger = await db.select().from(memberPoints);
      const ordersList = await db.select().from(posOrders);

      return rows.map(c => {
        const userPoints = pointsLedger.filter(p => p.memberId === c.id);
        const points = userPoints.reduce((acc, p) => {
          if (p.type === "earn" || p.type === "adjust") return acc + Number(p.points);
          if (p.type === "redeem" || p.type === "expire") return acc - Number(p.points);
          return acc;
        }, 0);

        const userOrders = ordersList.filter(o => o.memberId === c.id && o.status === "completed");
        const totalSpend = userOrders.reduce((acc, o) => acc + Number(o.totalAmount), 0);

        // Tier allocation
        let membershipTier = "Bronze";
        if (totalSpend >= 10000) membershipTier = "VIP";
        else if (totalSpend >= 5000) membershipTier = "Gold";
        else if (totalSpend >= 2000) membershipTier = "Silver";

        // Segments
        let segment = "New";
        if (c.phone === "0888888888") segment = "Franchise Partner"; // Mock check
        else if (totalSpend >= 10000) segment = "VIP";
        else if (totalSpend >= 3000) segment = "High Value";
        else if (userOrders.length > 5) segment = "Active";
        else if (userOrders.length === 0) segment = "Inactive";

        return {
          ...c,
          points,
          totalSpend,
          orderCount: userOrders.length,
          membershipTier,
          segment,
          favoriteProducts: ["Matcha Latte", "Hojicha Ice"],
        };
      });
    }),

  // ─── Inventory Forecast & Auto PO ───────────────────────────────────────────
  getInventoryForecast: staffProcedure
    .input(z.object({ branchId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const stockRows = await db.select().from(posBranchInventoryStock).where(eq(posBranchInventoryStock.branchId, input.branchId));
      const items = await db.select().from(posInventoryItems);

      // Average Daily Usage analysis: sum of "sold" + "used" in movements past 30 days / 30
      const movements = await db.select().from(posInventoryMovements)
        .where(and(
          eq(posInventoryMovements.branchId, input.branchId),
          inArray(posInventoryMovements.movementType, ["sold", "used"])
        ));

      const dailyUsageMap = new Map<number, number>();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const movementsLastMonth = movements.filter(m => m.createdAt && m.createdAt >= thirtyDaysAgo);
      for (const m of movementsLastMonth) {
        const qty = Math.abs(Number(m.quantity));
        dailyUsageMap.set(m.inventoryItemId, (dailyUsageMap.get(m.inventoryItemId) ?? 0) + qty);
      }

      return stockRows.map(stock => {
        const item = items.find(i => i.id === stock.inventoryItemId);
        const totalUsed = dailyUsageMap.get(stock.inventoryItemId) ?? 0;
        const avgDailyUsage = Math.max(0.1, totalUsed / 30); // fallback of 0.1 per day to avoid division by 0

        const currentStock = Number(stock.currentStock ?? 0);
        const daysLeft = Math.round(currentStock / avgDailyUsage);

        const leadTime = item?.leadTimeDays ?? 3;
        const safetyStock = Number(item?.minStockLevel ?? 10);
        const isBelowPoint = currentStock <= (safetyStock + (leadTime * avgDailyUsage));

        const suggestedQty = isBelowPoint ? Math.max(20, Math.ceil(safetyStock + (leadTime * avgDailyUsage) - currentStock)) : 0;
        const reorderDate = new Date();
        reorderDate.setDate(reorderDate.getDate() + Math.max(0, daysLeft - leadTime));

        return {
          id: stock.inventoryItemId,
          itemName: item?.nameThai || item?.name || "Item",
          sku: item?.sku,
          unit: item?.unitOfMeasure,
          currentStock,
          avgDailyUsage,
          daysLeft,
          suggestedOrderDate: daysLeft <= leadTime ? "Immediately" : reorderDate.toLocaleDateString(),
          suggestedQty,
          status: daysLeft <= leadTime ? "critical" : daysLeft <= leadTime + 3 ? "warning" : "good",
        };
      });
    }),

  generateSuggestedPO: staffAdminProcedure
    .input(z.object({ branchId: z.number().int(), supplierId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Identify items from this supplier that are below safety points
      const forecastList = await db.select().from(posBranchInventoryStock).where(eq(posBranchInventoryStock.branchId, input.branchId));
      const allItems = await db.select().from(posInventoryItems).where(eq(posInventoryItems.primarySupplierId, input.supplierId));

      const itemsToOrder = allItems.filter(item => {
        const stock = forecastList.find(s => s.inventoryItemId === item.id);
        const current = Number(stock?.currentStock ?? 0);
        const safety = Number(item.minStockLevel ?? 10);
        return current <= safety;
      });

      if (itemsToOrder.length === 0) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No items below safety stock found for this supplier" });
      }

      // Generate Suggested PO logic
      const rand = String(Math.floor(Math.random() * 9000) + 1000);
      const poNumber = `PO-SUGG-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${rand}`;

      // Insert suggested PO in database
      const [result] = await db.insert(supplierPaymentSchedules).values({
        supplierId: input.supplierId,
        totalAmount: "0.00",
        remainingAmount: "0.00",
        status: "active",
        notes: `Auto suggested PO ${poNumber}`,
      } as any);

      await logAudit({ staff: ctx.staff, action: "suggested_po_created", entity: "supplier_payment_schedules", details: `PO Number: ${poNumber}` });
      return { poNumber, itemsCount: itemsToOrder.length };
    }),

  // ─── Physical Count Session ─────────────────────────────────────────────────
  startCountSession: staffProcedure
    .input(z.object({ branchId: z.number().int(), assignedStaffId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [result] = await db.insert(posInventoryCountSessions).values({
        branchId: input.branchId,
        assignedStaffId: input.assignedStaffId,
        status: "in_progress",
        startedAt: new Date(),
      });

      const sessionId = (result as any).insertId as number;

      // Populate count session items from current stock
      const stock = await db.select().from(posBranchInventoryStock).where(eq(posBranchInventoryStock.branchId, input.branchId));
      for (const s of stock) {
        await db.insert(posInventoryCountSessionItems).values({
          sessionId,
          inventoryItemId: s.inventoryItemId,
          systemQty: s.currentStock ?? "0",
          countedQty: "0",
          varianceQty: String(-Number(s.currentStock ?? 0)),
          varianceCost: "0.00",
          status: "pending",
        });
      }

      await logAudit({ staff: ctx.staff, action: "count_session_start", entity: "pos_inventory_count_sessions", entityId: sessionId });
      return { sessionId };
    }),

  countStockInSession: staffProcedure
    .input(z.object({
      sessionId: z.number().int(),
      items: z.array(z.object({
        inventoryItemId: z.number().int(),
        countedQty: z.string(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const items = await db.select().from(posInventoryItems);

      for (const item of input.items) {
        const dbItem = items.find(i => i.id === item.inventoryItemId);
        const costPerUnit = Number(dbItem?.costPerUnit ?? 0);

        const [sessionItem] = await db.select().from(posInventoryCountSessionItems)
          .where(and(
            eq(posInventoryCountSessionItems.sessionId, input.sessionId),
            eq(posInventoryCountSessionItems.inventoryItemId, item.inventoryItemId)
          )).limit(1);

        if (sessionItem) {
          const sys = Number(sessionItem.systemQty);
          const count = Number(item.countedQty);
          const variance = count - sys;
          const varianceCost = variance * costPerUnit;

          await db.update(posInventoryCountSessionItems).set({
            countedQty: item.countedQty,
            varianceQty: String(variance),
            varianceCost: String(varianceCost),
            status: "reviewed",
          }).where(eq(posInventoryCountSessionItems.id, sessionItem.id));
        }
      }

      await db.update(posInventoryCountSessions).set({
        status: "variance_review",
      }).where(eq(posInventoryCountSessions.id, input.sessionId));

      return { success: true };
    }),

  approveCountSessionVariance: staffAdminProcedure
    .input(z.object({ sessionId: z.number().int(), approved: z.boolean(), managerPin: z.string().length(4) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // PIN verification check (Must be manager/admin)
      const allStaff = await db.select().from(staff).where(eq(staff.status, "active"));
      const authorizedStaff = allStaff.find(s => 
        (s.role === "super_admin" || s.role === "staff_admin" || s.role === "owner" || s.role === "hq_admin" || s.role === "branch_admin" || s.role === "manager") && 
        s.pinHash && 
        verifyPin(input.managerPin, s.pinHash)
      );

      if (!authorizedStaff) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid manager PIN" });
      }

      const [session] = await db.select().from(posInventoryCountSessions).where(eq(posInventoryCountSessions.id, input.sessionId)).limit(1);
      if (!session) throw new TRPCError({ code: "NOT_FOUND" });

      await db.transaction(async (tx) => {
        if (input.approved) {
          // Update actual stocks
          const sessionItems = await tx.select().from(posInventoryCountSessionItems).where(eq(posInventoryCountSessionItems.sessionId, input.sessionId));
          for (const s of sessionItems) {
            if (Number(s.varianceQty) !== 0) {
              await tx.update(posBranchInventoryStock)
                .set({ currentStock: s.countedQty })
                .where(and(
                  eq(posBranchInventoryStock.branchId, session.branchId),
                  eq(posBranchInventoryStock.inventoryItemId, s.inventoryItemId)
                ));

              await tx.insert(posInventoryMovements).values({
                branchId: session.branchId,
                inventoryItemId: s.inventoryItemId,
                movementType: "adjusted",
                quantity: s.varianceQty,
                referenceType: "count",
                referenceId: input.sessionId,
                notes: `Stock count variance adjustment`,
                unit: undefined,
                performedByStaffId: ctx.staff.staffId,
              } as any);
            }
            await tx.update(posInventoryCountSessionItems).set({ status: "approved" }).where(eq(posInventoryCountSessionItems.id, s.id));
          }
        }

        await tx.update(posInventoryCountSessions).set({
          status: "closed",
          closedAt: new Date(),
          approvedByStaffId: ctx.staff.staffId,
          approvedAt: new Date(),
        }).where(eq(posInventoryCountSessions.id, input.sessionId));
      });

      await logAudit({ staff: ctx.staff, action: "count_variance_approved", entity: "pos_inventory_count_sessions", entityId: input.sessionId });
      return { success: true };
    }),

  listCountSessions: staffProcedure
    .input(z.object({ branchId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(posInventoryCountSessions).where(eq(posInventoryCountSessions.branchId, input.branchId)).orderBy(desc(posInventoryCountSessions.createdAt));
    }),

  getCountSessionItems: staffProcedure
    .input(z.object({ sessionId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(posInventoryCountSessionItems).where(eq(posInventoryCountSessionItems.sessionId, input.sessionId));
    }),

  // ─── Royalty Management ──────────────────────────────────────────────────────
  listRoyalties: staffAdminProcedure
    .input(z.object({ branchId: z.number().int().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      let query = db.select().from(franchiseRoyalties);
      let rows = await query.orderBy(desc(franchiseRoyalties.month));
      if (input?.branchId) rows = rows.filter(r => r.branchId === input.branchId);
      return rows;
    }),

  calculateMonthlyRoyalty: staffAdminProcedure
    .input(z.object({ branchId: z.number().int(), month: z.string().length(7) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [branch] = await db.select().from(branches).where(eq(branches.id, input.branchId)).limit(1);
      if (!branch) throw new TRPCError({ code: "NOT_FOUND" });

      // Query POS revenue of that month
      const fromDate = new Date(`${input.month}-01T00:00:00Z`);
      const toDate = new Date(new Date(fromDate).setMonth(fromDate.getMonth() + 1));
      
      const orders = await db.select({ total: posOrders.totalAmount })
        .from(posOrders)
        .where(and(
          eq(posOrders.branchId, input.branchId),
          eq(posOrders.status, "completed"),
          gte(posOrders.createdAt, fromDate),
          lte(posOrders.createdAt, toDate)
        ));

      const monthlyRev = orders.reduce((acc, o) => acc + Number(o.total), 0);

      // Fetch settings
      const royaltyType = branch.royaltyType as "percentage" | "fixed" | "hybrid" || "percentage";
      const rate = Number(branch.royaltyValue ?? 5.00); // default 5%
      
      let amount = 0;
      if (royaltyType === "percentage") {
        amount = monthlyRev * (rate / 100);
      } else if (royaltyType === "fixed") {
        amount = rate;
      } else { // hybrid
        amount = (monthlyRev * 0.03) + rate; // 3% + base fixed rate
      }

      const [result] = await db.insert(franchiseRoyalties).values({
        branchId: input.branchId,
        month: input.month,
        revenue: String(monthlyRev),
        royaltyType,
        royaltyRate: String(rate),
        calculatedAmount: String(amount),
        status: "pending",
      });

      const id = (result as any).insertId as number;
      await logAudit({ staff: ctx.staff, action: "royalty_calculated", entity: "franchise_royalties", entityId: id });
      return { id, calculatedAmount: amount };
    }),

  // ─── Franchise Compliance ────────────────────────────────────────────────────
  getFranchiseCompliance: staffAdminProcedure
    .input(z.object({ branchId: z.number().int(), month: z.string().length(7) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      // Check if scores already exist
      const [existing] = await db.select()
        .from(franchiseComplianceScores)
        .where(and(
          eq(franchiseComplianceScores.branchId, input.branchId),
          eq(franchiseComplianceScores.month, input.month)
        )).limit(1);

      if (existing) return existing;

      const scores = await calculateFranchiseComplianceScores(db, input.branchId, input.month);

      const [result] = await db.insert(franchiseComplianceScores).values({
        branchId: input.branchId,
        month: input.month,
        sopCompliance: String(scores.sopCompliance),
        wasteRate: String(scores.wasteRate),
        stockCountCompletion: String(scores.stockCountCompletion),
        expiryCompliance: String(scores.expiryCompliance),
        revenueCompliance: String(scores.revenueCompliance),
        overallScore: String(scores.overallScore),
      });

      const id = (result as any).insertId as number;
      return db.select().from(franchiseComplianceScores).where(eq(franchiseComplianceScores.id, id)).limit(1).then(rows => rows[0]);
    }),

  // ─── Accounts Payable & Receivable ──────────────────────────────────────────
  getAccountsPayable: staffAdminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const schedules = await db.select().from(supplierPaymentSchedules);
    const installments = await db.select().from(supplierPaymentInstallments);
    
    // Map schedules to dynamic outstanding bills
    return schedules.map(s => {
      const sInst = installments.filter(i => i.scheduleId === s.id);
      const overdue = sInst.some(i => i.status === "overdue");
      const nextDue = sInst.find(i => i.status === "pending")?.dueDate;

      return {
        id: s.id,
        supplierId: s.supplierId,
        totalAmount: s.totalAmount,
        paidAmount: s.paidAmount,
        outstandingAmount: s.remainingAmount,
        dueDate: nextDue || "Paid",
        status: overdue ? "overdue" : Number(s.remainingAmount) === 0 ? "paid" : "pending",
      };
    });
  }),

  getAccountsReceivable: staffAdminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(accountsReceivable).orderBy(desc(accountsReceivable.dueDate));
  }),

  createAccountsReceivable: staffAdminProcedure
    .input(z.object({
      branchId: z.number().int(),
      customerId: z.number().int(),
      customerType: z.enum(["corporate", "franchise"]),
      invoiceNumber: z.string().min(1),
      amount: z.string(),
      dueDate: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [result] = await db.insert(accountsReceivable).values({
        branchId: input.branchId,
        customerId: input.customerId,
        customerType: input.customerType,
        invoiceNumber: input.invoiceNumber,
        amount: input.amount,
        dueDate: new Date(input.dueDate),
        outstandingAmount: input.amount,
        status: "pending",
      } as any);

      const id = (result as any).insertId as number;
      return { id };
    }),

  // ─── Cash Flow Dashboard ────────────────────────────────────────────────────
  getCashFlowStats: staffAdminProcedure
    .input(z.object({ dateFrom: z.string(), dateTo: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { cashIn: 0, cashOut: 0, netCashFlow: 0, trends: [] };

      // Cash In: POS Orders revenue
      const from = new Date(input.dateFrom);
      const to = new Date(input.dateTo);

      const orders = await db.select({ amount: posOrders.totalAmount, date: posOrders.createdAt })
        .from(posOrders)
        .where(and(
          eq(posOrders.status, "completed"),
          gte(posOrders.createdAt, from),
          lte(posOrders.createdAt, to)
        ));

      const cashIn = orders.reduce((acc, o) => acc + Number(o.amount), 0);

      // Cash Out: Expense receipts
      const expenses = await db.select({ amount: posExpenseReceipts.grandTotal, date: posExpenseReceipts.createdAt })
        .from(posExpenseReceipts)
        .where(and(
          eq(posExpenseReceipts.status, "confirmed"),
          gte(posExpenseReceipts.createdAt, from),
          lte(posExpenseReceipts.createdAt, to)
        ));

      const cashOut = expenses.reduce((acc, e) => acc + Number(e.amount), 0);

      // Build daily trend map
      const trendMap = new Map<string, { date: string; cashIn: number; cashOut: number }>();
      
      for (const o of orders) {
        const d = o.date ? o.date.toISOString().slice(0, 10) : "Unknown";
        const ex = trendMap.get(d) || { date: d, cashIn: 0, cashOut: 0 };
        ex.cashIn += Number(o.amount);
        trendMap.set(d, ex);
      }

      for (const e of expenses) {
        const d = e.date ? e.date.toISOString().slice(0, 10) : "Unknown";
        const ex = trendMap.get(d) || { date: d, cashIn: 0, cashOut: 0 };
        ex.cashOut += Number(e.amount);
        trendMap.set(d, ex);
      }

      const trends = Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date));

      return {
        cashIn,
        cashOut,
        netCashFlow: cashIn - cashOut,
        trends,
      };
    }),

  // ─── HIBIOS Phase 2 Extensions ─────────────────────────────────────────────
  processSplitPayment: staffProcedure
    .input(z.object({
      orderId: z.number().int(),
      managerPin: z.string().optional(),
      payments: z.array(z.object({
        paymentMethodId: z.number().int(),
        amount: z.string(),
        referenceNumber: z.string().optional(),
        qrPayload: z.string().optional(),
        qrGeneratedAmount: z.string().optional(),
        slipImageUrl: z.string().optional(),
        bankReference: z.string().optional(),
        payerName: z.string().optional(),
        transferTime: z.string().optional(),
        verificationStatus: z.enum(["not_required", "pending", "verified", "rejected", "manual_review"]).optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      return await db.transaction(async (tx) => {
        const [order] = await tx.select().from(posOrders).where(eq(posOrders.id, input.orderId)).limit(1);
        if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });

        const methods = await tx.select().from(masterPaymentMethods);

        // PIN verification check if any method requires manager PIN
        const requiresPin = methods.some(m => {
          const isSelected = input.payments.some(p => p.paymentMethodId === m.id);
          return isSelected && m.requiresManagerPin;
        });

        if (requiresPin) {
          const pin = input.managerPin;
          if (!pin) {
            throw new TRPCError({ code: "UNAUTHORIZED", message: "Manager PIN is required for this payment method" });
          }
          const allStaff = await tx.select().from(staff).where(eq(staff.status, "active"));
          const manager = allStaff.find(s =>
            ["super_admin", "staff_admin", "owner", "hq_admin", "branch_admin", "manager"].includes(s.role || "") &&
            s.pinHash &&
            verifyPin(pin, s.pinHash)
          );
          if (!manager) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid manager PIN" });
        }

        let totalPaid = 0;
        let cashMethodId: number | null = null;
        let cashPaid = 0;

        for (const p of input.payments) {
          const method = methods.find(m => m.id === p.paymentMethodId);
          if (!method) throw new TRPCError({ code: "NOT_FOUND", message: `Payment method ${p.paymentMethodId} not found` });

          if (method.type === "cash") {
            cashMethodId = method.id;
            cashPaid += Number(p.amount);
          } else {
            totalPaid += Number(p.amount);

            if (method.type === "loyalty") {
              if (!order.memberId) {
                throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Loyalty points require a member profile" });
              }
              const [branch] = await tx.select().from(branches).where(eq(branches.id, order.branchId!)).limit(1);
              const redeemRate = Number(branch?.loyaltyRedeemRate ?? 1.0);
              const pointsNeeded = Number(p.amount) / redeemRate;

              const userPoints = await tx.select().from(memberPoints).where(and(eq(memberPoints.memberId, order.memberId), eq(memberPoints.branchId, order.branchId!)));
              const balance = userPoints.reduce((acc, pt) => {
                if (pt.type === "earn" || pt.type === "adjust") return acc + Number(pt.points);
                if (pt.type === "redeem" || pt.type === "expire") return acc - Number(pt.points);
                return acc;
              }, 0);

              if (balance < pointsNeeded) {
                throw new TRPCError({ code: "PRECONDITION_FAILED", message: `Insufficient loyalty points. Balance: ${balance}` });
              }

              await tx.insert(memberPoints).values({
                memberId: order.memberId,
                branchId: order.branchId!,
                type: "redeem",
                points: String(pointsNeeded),
                balanceBefore: String(balance),
                balanceAfter: String(balance - pointsNeeded),
                orderId: order.id,
                notes: `Points split checkout`,
                createdByStaffId: ctx.staff.staffId,
              });
            }

            if (method.type === "voucher") {
              const ref = (p.referenceNumber || "").trim();
              const balance = await lookupGiftVoucherBalance(tx, ref, order.branchId);
              if (!ref || balance <= 0) {
                throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Invalid or expired voucher/gift card code." });
              }
              if (Number(p.amount) > balance) {
                throw new TRPCError({ code: "PRECONDITION_FAILED", message: `Voucher/Gift Card balance insufficient. Available: ฿${balance.toLocaleString()}` });
              }
            }
          }
        }

        const orderTotal = Number(order.totalAmount);
        let change = 0;
        let finalCashAmount = 0;

        if (cashMethodId !== null) {
          const cashNeeded = orderTotal - totalPaid;
          if (cashPaid < cashNeeded) {
            throw new TRPCError({ code: "PRECONDITION_FAILED", message: `Underpayment: ${cashPaid + totalPaid} / ${orderTotal}` });
          }
          change = cashPaid - cashNeeded;
          finalCashAmount = cashNeeded;
          totalPaid += finalCashAmount;
        } else {
          if (Math.abs(totalPaid - orderTotal) > 0.05) {
            throw new TRPCError({ code: "PRECONDITION_FAILED", message: `Payment sum (${totalPaid}) must equal total (${orderTotal})` });
          }
        }

        for (const p of input.payments) {
          const method = methods.find(m => m.id === p.paymentMethodId)!;
          let payAmt = Number(p.amount);
          if (method.type === "cash") {
            payAmt = finalCashAmount;
            if (payAmt <= 0) continue;
          }

          const [payResult] = await tx.insert(posOrderPayments).values({
            orderId: order.id,
            paymentMethodId: p.paymentMethodId,
            amount: String(payAmt),
            referenceNumber: p.referenceNumber || null,
            status: "completed",
            qrPayload: p.qrPayload || null,
            qrGeneratedAmount: p.qrGeneratedAmount || null,
            slipImageUrl: p.slipImageUrl || null,
            bankReference: p.bankReference || null,
            payerName: p.payerName || null,
            transferTime: p.transferTime ? new Date(p.transferTime) : null,
            verificationStatus: p.verificationStatus || (method.requiresSlipUpload ? "pending" : "not_required"),
          });
          const paymentId = (payResult as any).insertId as number;

          if (method.requiresSettlement) {
            let feeAmount = 0;
            if (method.feeType === "percentage") {
              feeAmount = payAmt * (Number(method.feeAmount ?? 0) / 100);
            } else if (method.feeType === "fixed") {
              feeAmount = Number(method.feeAmount ?? 0);
            }
            const netAmount = payAmt - feeAmount;
            const expDate = new Date();
            expDate.setDate(expDate.getDate() + (method.settlementDays ?? 0));

            await tx.insert(posPaymentSettlements).values({
              branchId: order.branchId!,
              paymentMethodId: p.paymentMethodId,
              orderPaymentId: paymentId,
              providerName: method.providerName || method.name,
              grossAmount: String(payAmt),
              feeAmount: String(feeAmount),
              netAmount: String(netAmount),
              expectedSettlementDate: expDate.toISOString().slice(0, 10) as any,
              status: "pending",
            });
          }

          if (method.isCreditAccount) {
            const customerType = method.type === "credit" ? "franchise" : "corporate";
            const arPrefix = customerType === "franchise" ? "AR-FRAN" : "AR-CORP";
            await tx.insert(accountsReceivable).values({
              branchId: order.branchId!,
              customerId: order.memberId || 1,
              customerType,
              invoiceNumber: `${arPrefix}-${order.orderNumber}-${paymentId}`,
              amount: String(payAmt),
              outstandingAmount: String(payAmt),
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) as any,
              status: "pending",
            });
          }

          if (method.type === "voucher" && p.referenceNumber) {
            await deductGiftVoucherBalance(tx, p.referenceNumber, payAmt, order.branchId);
          }
        }

        if (order.branchId) {
          await finalizeOrderStockDeduction(order.id, order.branchId, ctx.staff.staffId);
        }

        const generatedNum = await generateDocumentNumber(tx, order.branchId!, "sales_receipt");
        await tx.update(posOrders).set({
          status: "completed",
          orderNumber: generatedNum,
          completedAt: new Date(),
        }).where(eq(posOrders.id, order.id));

        await logAudit({ staff: ctx.staff, action: "checkout_split", entity: "pos_orders", entityId: order.id });
        return { success: true, change, orderNumber: generatedNum };
      });
    }),

  lookupGiftVoucher: staffProcedure
    .input(z.object({ code: z.string().min(1), branchId: z.number().int().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { balance: 0, valid: false };
      const balance = await lookupGiftVoucherBalance(db, input.code, input.branchId);
      return { balance, valid: balance > 0 };
    }),

  listDocumentSequences: staffProcedure
    .input(z.object({ branchId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(posDocumentSequences).where(eq(posDocumentSequences.branchId, input.branchId));
    }),

  updateDocumentSequence: staffAdminProcedure
    .input(z.object({
      id: z.number().int(),
      prefix: z.string().min(1),
      includeBranchCode: z.boolean(),
      includeDate: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(posDocumentSequences).set({
        prefix: input.prefix,
        includeBranchCode: input.includeBranchCode,
        includeDate: input.includeDate,
      }).where(eq(posDocumentSequences.id, input.id));
      await logAudit({ staff: ctx.staff, action: "update", entity: "pos_document_sequences", entityId: input.id });
      return { success: true };
    }),

  issueFullTaxInvoice: staffProcedure
    .input(z.object({
      orderId: z.number().int(),
      legalName: z.string().min(1),
      taxId: z.string().min(1),
      customerBranchCode: z.string().optional(),
      address: z.string().min(1),
      email: z.string().optional(),
      phone: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [order] = await db.select().from(posOrders).where(eq(posOrders.id, input.orderId)).limit(1);
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });
      if (order.status !== "completed") {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Only paid orders can issue a full tax invoice." });
      }

      const existing = await db.select().from(posExportDocuments)
        .where(and(
          eq(posExportDocuments.docType, "full_tax_invoice"),
          sql`JSON_UNQUOTE(JSON_EXTRACT(${posExportDocuments.data}, '$.orderId')) = ${String(input.orderId)}`
        )).limit(1);

      if (existing.length > 0) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "A full tax invoice has already been issued for this order." });
      }

      const docNum = await generateDocumentNumber(db, order.branchId!, "full_tax_invoice");
      const fullOrder = await getFullOrder(db, input.orderId);

      await db.insert(posExportDocuments).values({
        docType: "full_tax_invoice",
        documentNumber: docNum,
        branchId: order.branchId,
        customerName: input.legalName,
        grandTotal: order.totalAmount,
        createdBy: ctx.staff.staffId,
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          legalName: input.legalName,
          taxId: input.taxId,
          customerBranchCode: input.customerBranchCode || "00000",
          address: input.address,
          email: input.email || "",
          phone: input.phone || "",
          items: fullOrder?.items || [],
          grandTotal: order.totalAmount,
          issuedAt: new Date().toISOString(),
        },
      });

      await logAudit({ staff: ctx.staff, action: "issue_tax_invoice", entity: "pos_export_documents", details: `Doc: ${docNum}` });
      return { success: true, documentNumber: docNum };
    }),

  updateFullTaxInvoice: staffProcedure
    .input(z.object({
      invoiceId: z.number().int(),
      legalName: z.string().min(1),
      taxId: z.string().min(1),
      customerBranchCode: z.string().optional(),
      address: z.string().min(1),
      email: z.string().optional(),
      phone: z.string().optional(),
      managerPin: z.string().length(4),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const allStaff = await db.select().from(staff).where(eq(staff.status, "active"));
      const manager = allStaff.find(s =>
        ["super_admin", "staff_admin", "owner", "hq_admin", "branch_admin", "manager"].includes(s.role || "") &&
        s.pinHash &&
        verifyPin(input.managerPin, s.pinHash)
      );
      if (!manager) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid manager PIN" });

      const [doc] = await db.select().from(posExportDocuments).where(eq(posExportDocuments.id, input.invoiceId)).limit(1);
      if (!doc) throw new TRPCError({ code: "NOT_FOUND" });

      const docData = (doc.data as any) || {};
      const updatedData = {
        ...docData,
        legalName: input.legalName,
        taxId: input.taxId,
        customerBranchCode: input.customerBranchCode || "00000",
        address: input.address,
        email: input.email || "",
        phone: input.phone || "",
        editedAt: new Date().toISOString(),
        editedBy: manager.id,
      };

      await db.update(posExportDocuments).set({
        customerName: input.legalName,
        data: updatedData,
      }).where(eq(posExportDocuments.id, input.invoiceId));

      await logAudit({
        staff: ctx.staff,
        action: "edit_tax_invoice",
        entity: "pos_export_documents",
        entityId: input.invoiceId,
        beforeData: docData,
        afterData: updatedData,
      });

      return { success: true };
    }),

  issueCreditNote: staffProcedure
    .input(z.object({
      originalDocumentNumber: z.string().min(1),
      reason: z.string().min(1),
      amount: z.string(),
      managerPin: z.string().length(4),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const allStaff = await db.select().from(staff).where(eq(staff.status, "active"));
      const manager = allStaff.find(s =>
        ["super_admin", "staff_admin", "owner", "hq_admin", "branch_admin", "manager"].includes(s.role || "") &&
        s.pinHash &&
        verifyPin(input.managerPin, s.pinHash)
      );
      if (!manager) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid manager PIN" });

      let branchId = ctx.staff.primaryBranchId || 1;
      let originalTotal = "0.00";
      const [origDoc] = await db.select().from(posExportDocuments).where(eq(posExportDocuments.documentNumber, input.originalDocumentNumber)).limit(1);
      if (origDoc) {
        branchId = origDoc.branchId || branchId;
        originalTotal = String(origDoc.grandTotal);
      } else {
        const [origOrder] = await db.select().from(posOrders).where(eq(posOrders.orderNumber, input.originalDocumentNumber)).limit(1);
        if (origOrder) {
          branchId = origOrder.branchId || branchId;
          originalTotal = String(origOrder.totalAmount);
        }
      }

      const docNum = await generateDocumentNumber(db, branchId, "credit_note");
      const beforeAmt = Number(originalTotal);
      const afterAmt = beforeAmt - Number(input.amount);

      await db.insert(posExportDocuments).values({
        docType: "credit_note",
        documentNumber: docNum,
        branchId,
        customerName: origDoc?.customerName || "Customer",
        grandTotal: input.amount,
        createdBy: ctx.staff.staffId,
        data: {
          originalDocumentNumber: input.originalDocumentNumber,
          reason: input.reason,
          beforeAmount: String(beforeAmt),
          afterAmount: String(afterAmt),
          amount: input.amount,
          approvedBy: manager.id,
          issuedAt: new Date().toISOString(),
        },
      });

      const [ar] = await db.select().from(accountsReceivable).where(eq(accountsReceivable.invoiceNumber, input.originalDocumentNumber)).limit(1);
      if (ar) {
        const nextOutstanding = Math.max(0, Number(ar.outstandingAmount) - Number(input.amount));
        await db.update(accountsReceivable)
          .set({
            outstandingAmount: String(nextOutstanding),
            status: nextOutstanding === 0 ? "paid" : ar.status,
          })
          .where(eq(accountsReceivable.id, ar.id));
      }

      await logAudit({ staff: ctx.staff, action: "issue_credit_note", entity: "pos_export_documents", details: `CN: ${docNum} for ${input.originalDocumentNumber}` });
      return { success: true, documentNumber: docNum };
    }),

  issueDebitNote: staffProcedure
    .input(z.object({
      originalDocumentNumber: z.string().min(1),
      reason: z.string().min(1),
      amount: z.string(),
      managerPin: z.string().length(4),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const allStaff = await db.select().from(staff).where(eq(staff.status, "active"));
      const manager = allStaff.find(s =>
        ["super_admin", "staff_admin", "owner", "hq_admin", "branch_admin", "manager"].includes(s.role || "") &&
        s.pinHash &&
        verifyPin(input.managerPin, s.pinHash)
      );
      if (!manager) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid manager PIN" });

      let branchId = ctx.staff.primaryBranchId || 1;
      let originalTotal = "0.00";
      const [origDoc] = await db.select().from(posExportDocuments).where(eq(posExportDocuments.documentNumber, input.originalDocumentNumber)).limit(1);
      if (origDoc) {
        branchId = origDoc.branchId || branchId;
        originalTotal = String(origDoc.grandTotal);
      } else {
        const [origOrder] = await db.select().from(posOrders).where(eq(posOrders.orderNumber, input.originalDocumentNumber)).limit(1);
        if (origOrder) {
          branchId = origOrder.branchId || branchId;
          originalTotal = String(origOrder.totalAmount);
        }
      }

      const docNum = await generateDocumentNumber(db, branchId, "debit_note");
      const beforeAmt = Number(originalTotal);
      const afterAmt = beforeAmt + Number(input.amount);

      await db.insert(posExportDocuments).values({
        docType: "debit_note",
        documentNumber: docNum,
        branchId,
        customerName: origDoc?.customerName || "Customer",
        grandTotal: input.amount,
        createdBy: ctx.staff.staffId,
        data: {
          originalDocumentNumber: input.originalDocumentNumber,
          reason: input.reason,
          beforeAmount: String(beforeAmt),
          afterAmount: String(afterAmt),
          amount: input.amount,
          approvedBy: manager.id,
          issuedAt: new Date().toISOString(),
        },
      });

      const [ar] = await db.select().from(accountsReceivable).where(eq(accountsReceivable.invoiceNumber, input.originalDocumentNumber)).limit(1);
      if (ar) {
        const nextOutstanding = Number(ar.outstandingAmount) + Number(input.amount);
        await db.update(accountsReceivable)
          .set({ outstandingAmount: String(nextOutstanding) })
          .where(eq(accountsReceivable.id, ar.id));
      }

      await logAudit({ staff: ctx.staff, action: "issue_debit_note", entity: "pos_export_documents", details: `DN: ${docNum} for ${input.originalDocumentNumber}` });
      return { success: true, documentNumber: docNum };
    }),

  listSettlements: staffProcedure
    .input(z.object({
      branchId: z.number().int().optional(),
      providerName: z.string().optional(),
      status: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      let query = db.select().from(posPaymentSettlements);
      let rows = await query.orderBy(desc(posPaymentSettlements.createdAt));

      if (input?.branchId) rows = rows.filter(r => r.branchId === input.branchId);
      if (input?.providerName) rows = rows.filter(r => r.providerName?.toLowerCase().includes(input.providerName!.toLowerCase()));
      if (input?.status) rows = rows.filter(r => r.status === input.status);
      if (input?.dateFrom) rows = rows.filter(r => r.expectedSettlementDate && new Date(r.expectedSettlementDate) >= new Date(input.dateFrom!));
      if (input?.dateTo) rows = rows.filter(r => r.expectedSettlementDate && new Date(r.expectedSettlementDate) <= new Date(input.dateTo!));

      return rows;
    }),

  reconcileSettlement: staffProcedure
    .input(z.object({
      settlementId: z.number().int(),
      actualAmount: z.string(),
      settlementReference: z.string().optional(),
      bankAccount: z.string().optional(),
      slipImageUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [settlement] = await db.select().from(posPaymentSettlements).where(eq(posPaymentSettlements.id, input.settlementId)).limit(1);
      if (!settlement) throw new TRPCError({ code: "NOT_FOUND" });

      const expected = Number(settlement.netAmount);
      const actual = Number(input.actualAmount);
      let status: "settled" | "short_paid" | "over_paid" = "settled";

      if (actual < expected) status = "short_paid";
      else if (actual > expected) status = "over_paid";

      await db.update(posPaymentSettlements).set({
        actualSettlementDate: new Date().toISOString().slice(0, 10) as any,
        status,
        settlementReference: input.settlementReference || null,
        bankAccount: input.bankAccount || null,
        slipImageUrl: input.slipImageUrl || null,
        reconciledByStaffId: ctx.staff.staffId,
        reconciledAt: new Date(),
      }).where(eq(posPaymentSettlements.id, input.settlementId));

      await logAudit({
        staff: ctx.staff,
        action: "reconcile_settlement",
        entity: "pos_payment_settlements",
        entityId: input.settlementId,
        details: `Reconciled: expected ${expected}, actual ${actual}, status: ${status}`,
      });

      return { success: true, status };
    }),

  getCashSessionSummary: staffProcedure
    .input(z.object({
      branchId: z.number().int(),
      openingCash: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { openingCash: input.openingCash, cashSales: 0, cashRefunds: 0, expectedCash: 0 };

      const [lastClosing] = await db.select()
        .from(posCashClosings)
        .where(eq(posCashClosings.branchId, input.branchId))
        .orderBy(desc(posCashClosings.closedAt))
        .limit(1);

      const filterDate = lastClosing ? lastClosing.closedAt : new Date(0);

      const orderPayments = await db.select({ amount: posOrderPayments.amount })
        .from(posOrderPayments)
        .innerJoin(posOrders, eq(posOrderPayments.orderId, posOrders.id))
        .innerJoin(masterPaymentMethods, eq(posOrderPayments.paymentMethodId, masterPaymentMethods.id))
        .where(and(
          eq(posOrders.branchId, input.branchId),
          eq(posOrderPayments.status, "completed"),
          eq(masterPaymentMethods.type, "cash"),
          gte(posOrderPayments.paidAt, filterDate!)
        ));

      const cashSales = orderPayments.reduce((acc, p) => acc + Number(p.amount), 0);

      const refunds = await db.select({ amount: posRefunds.amount })
        .from(posRefunds)
        .innerJoin(posOrders, eq(posRefunds.orderId, posOrders.id))
        .innerJoin(masterPaymentMethods, eq(posRefunds.paymentMethodId, masterPaymentMethods.id))
        .where(and(
          eq(posOrders.branchId, input.branchId),
          eq(posRefunds.status, "approved"),
          eq(masterPaymentMethods.type, "cash"),
          gte(posRefunds.approvedAt, filterDate!)
        ));

      const cashRefunds = refunds.reduce((acc, r) => acc + Number(r.amount), 0);
      const expectedCash = Number(input.openingCash) + cashSales - cashRefunds;

      return {
        openingCash: Number(input.openingCash),
        cashSales,
        cashRefunds,
        expectedCash,
      };
    }),

  submitCashClosing: staffProcedure
    .input(z.object({
      branchId: z.number().int(),
      openingCash: z.string(),
      actualCountedCash: z.string(),
      varianceReason: z.enum(["short_change", "counting_mistake", "drawer_mistake", "refund_mistake", "theft_suspected", "other"]).optional(),
      managerPin: z.string().optional(),
      photoUrl: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [lastClosing] = await db.select()
        .from(posCashClosings)
        .where(eq(posCashClosings.branchId, input.branchId))
        .orderBy(desc(posCashClosings.closedAt))
        .limit(1);

      const filterDate = lastClosing ? lastClosing.closedAt : new Date(0);

      const orderPayments = await db.select({ amount: posOrderPayments.amount })
        .from(posOrderPayments)
        .innerJoin(posOrders, eq(posOrderPayments.orderId, posOrders.id))
        .innerJoin(masterPaymentMethods, eq(posOrderPayments.paymentMethodId, masterPaymentMethods.id))
        .where(and(
          eq(posOrders.branchId, input.branchId),
          eq(posOrderPayments.status, "completed"),
          eq(masterPaymentMethods.type, "cash"),
          gte(posOrderPayments.paidAt, filterDate!)
        ));

      const cashSales = orderPayments.reduce((acc, p) => acc + Number(p.amount), 0);

      const refunds = await db.select({ amount: posRefunds.amount })
        .from(posRefunds)
        .innerJoin(posOrders, eq(posRefunds.orderId, posOrders.id))
        .innerJoin(masterPaymentMethods, eq(posRefunds.paymentMethodId, masterPaymentMethods.id))
        .where(and(
          eq(posOrders.branchId, input.branchId),
          eq(posRefunds.status, "approved"),
          eq(masterPaymentMethods.type, "cash"),
          gte(posRefunds.approvedAt, filterDate!)
        ));

      const cashRefunds = refunds.reduce((acc, r) => acc + Number(r.amount), 0);
      const expected = Number(input.openingCash) + cashSales - cashRefunds;
      const actual = Number(input.actualCountedCash);
      const variance = actual - expected;

      let managerApprovedId: number | null = null;

      if (variance !== 0) {
        const pin = input.managerPin;
        if (!pin) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Manager PIN is required due to cash variance" });
        }
        const allStaff = await db.select().from(staff).where(eq(staff.status, "active"));
        const manager = allStaff.find(s =>
          ["super_admin", "staff_admin", "owner", "hq_admin", "branch_admin", "manager"].includes(s.role || "") &&
          s.pinHash &&
          verifyPin(pin, s.pinHash)
        );
        if (!manager) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid manager PIN" });
        managerApprovedId = manager.id;
      }

      await db.insert(posCashClosings).values({
        branchId: input.branchId,
        staffId: ctx.staff.staffId,
        openingCash: input.openingCash,
        cashSales: String(cashSales),
        cashRefunds: String(cashRefunds),
        expectedCash: String(expected),
        actualCountedCash: input.actualCountedCash,
        variance: String(variance),
        varianceReason: input.varianceReason || null,
        photoUrl: input.photoUrl || null,
        managerApprovedByStaffId: managerApprovedId,
        notes: input.notes || null,
      });

      await logAudit({
        staff: ctx.staff,
        action: "cash_closing",
        entity: "pos_cash_closings",
        details: `Branch ${input.branchId} closing. Expected: ${expected}, counted: ${actual}, variance: ${variance}`,
      });

      return { success: true, variance };
    }),

  listCashClosings: staffProcedure
    .input(z.object({ branchId: z.number().int(), limit: z.number().int().optional().default(30) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(posCashClosings)
        .where(eq(posCashClosings.branchId, input.branchId))
        .orderBy(desc(posCashClosings.closedAt))
        .limit(input.limit);
    }),

  listPrinters: staffProcedure
    .input(z.object({ branchId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(posPrinterConfigs).where(eq(posPrinterConfigs.branchId, input.branchId));
    }),

  createPrinter: staffAdminProcedure
    .input(z.object({
      branchId: z.number().int(),
      printerName: z.string().min(1),
      printerType: z.enum(["order_slip", "label", "kitchen", "receipt"]),
      connection: z.enum(["usb", "network", "bluetooth", "browser"]),
      ipAddress: z.string().optional(),
      port: z.number().int().optional(),
      paperWidth: z.number().int().optional(),
      charactersPerLine: z.number().int().optional(),
      isDefault: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(posPrinterConfigs).values({
        ...input,
        isActive: true,
      } as any);
      const id = (result as any).insertId as number;
      await logAudit({ staff: ctx.staff, action: "create_printer", entity: "pos_printer_configs", entityId: id });
      return { id };
    }),

  updatePrinter: staffAdminProcedure
    .input(z.object({
      id: z.number().int(),
      printerName: z.string().optional(),
      printerType: z.enum(["order_slip", "label", "kitchen", "receipt"]).optional(),
      connection: z.enum(["usb", "network", "bluetooth", "browser"]).optional(),
      ipAddress: z.string().optional(),
      port: z.number().int().optional(),
      paperWidth: z.number().int().optional(),
      charactersPerLine: z.number().int().optional(),
      isDefault: z.boolean().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(posPrinterConfigs).set(data as any).where(eq(posPrinterConfigs.id, id));
      await logAudit({ staff: ctx.staff, action: "update_printer", entity: "pos_printer_configs", entityId: id });
      return { success: true };
    }),

  deletePrinter: staffAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(posPrinterConfigs).where(eq(posPrinterConfigs.id, input.id));
      await logAudit({ staff: ctx.staff, action: "delete_printer", entity: "pos_printer_configs", entityId: input.id });
      return { success: true };
    }),

  verifyPaymentSlip: staffProcedure
    .input(z.object({
      paymentId: z.number().int(),
      status: z.enum(["verified", "rejected", "manual_review"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db.update(posOrderPayments).set({
        verificationStatus: input.status,
        verifiedBy: ctx.staff.staffId,
        verifiedAt: new Date(),
      }).where(eq(posOrderPayments.id, input.paymentId));

      await logAudit({
        staff: ctx.staff,
        action: "verify_slip",
        entity: "pos_order_payments",
        entityId: input.paymentId,
        details: `Verification set to ${input.status}`,
      });

      return { success: true };
    }),
});
