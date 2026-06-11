/**
 * Printing Router
 * Handles network printer operations: test print, print order documents, cash drawer
 * Uses TCP socket connection to thermal printers (ESC/POS compatible)
 */
import { TRPCError } from "@trpc/server";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import {
  posPrinterConfigs,
  posOrders,
  posOrderItems,
  posOrderItemOptions,
  posPaymentMethods,
  masterPaymentMethods,
  posOrderPayments,
  branches,
  staff,
  posBranchPaymentSettings,
  posMenuItems,
  posOptions,
} from "../../drizzle/schema";
import { router, staffProcedure, staffAdminProcedure } from "../_core/trpc";
import { logAudit } from "../lib/audit";
import {
  printToNetworkPrinter,
  checkPrinterStatus,
  generateCashDrawerCommand,
  generateTestPrintPayload,
} from "../lib/printer";
import {
  generateOrderSlipHTML,
  generateAllLabelsHTML,
  generateKitchenTicketHTML,
  generateReceiptHTML,
  generatePromptPayQRDataUrl,
  type OrderData,
  type OrderItemData,
  type BranchPaymentSettings,
} from "../lib/printPayloads";

// ─── Helper: Build OrderData from DB ─────────────────────────────────────────
async function buildOrderDataFromDb(db: any, orderId: number): Promise<{
  orderData: OrderData;
  settings: BranchPaymentSettings;
} | null> {
  const [order] = await db.select().from(posOrders).where(eq(posOrders.id, orderId)).limit(1);
  if (!order) return null;

  const [branch] = order.branchId
    ? await db.select().from(branches).where(eq(branches.id, order.branchId)).limit(1)
    : [null];
  const [paySettings] = order.branchId
    ? await db.select().from(posBranchPaymentSettings).where(eq(posBranchPaymentSettings.branchId, order.branchId)).limit(1)
    : [null];
  const [staffMember] = order.staffId
    ? await db.select().from(staff).where(eq(staff.id, order.staffId)).limit(1)
    : [null];

  // Get order items
  const items = await db.select().from(posOrderItems).where(eq(posOrderItems.orderId, orderId));
  const orderItems: OrderItemData[] = await Promise.all(
    items.map(async (item: any) => {
      const [menuItem] = await db.select().from(posMenuItems).where(eq(posMenuItems.id, item.menuItemId)).limit(1);
      const itemOptions = await db.select().from(posOrderItemOptions).where(eq(posOrderItemOptions.orderItemId, item.id));
      const options = await Promise.all(
        itemOptions.map(async (oi: any) => {
          const [opt] = await db.select().from(posOptions).where(eq(posOptions.id, oi.optionId)).limit(1);
          return {
            name: opt?.name || oi.optionName || "Unknown",
            priceAdjustment: Number(oi.priceAdjustment || 0),
          };
        })
      );
      return {
        id: item.id,
        menuItemName: menuItem?.name || item.menuItemName || "Unknown",
        menuItemSku: menuItem?.sku || undefined,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice || 0),
        totalPrice: Number(item.totalPrice || 0),
        notes: item.notes,
        options,
      };
    })
  );

  // Get payment info for receipt
  const payments = await db.select().from(posOrderPayments).where(eq(posOrderPayments.orderId, orderId));
  let paymentMethodName = "เงินสด";
  let paidAmount = Number(order.totalAmount || 0);
  if (payments.length > 0) {
    let [pm] = [null as any];
    const methodId = payments[0].paymentMethodId;
    if (methodId) {
      [pm] = await db.select().from(masterPaymentMethods).where(eq(masterPaymentMethods.id, methodId)).limit(1);
      if (!pm) {
        [pm] = await db.select().from(posPaymentMethods).where(eq(posPaymentMethods.id, methodId)).limit(1);
      }
    }
    paymentMethodName = pm?.name || payments[0].method || "เงินสด";
    paidAmount = Number(payments[0].amount || order.totalAmount || 0);
  }

  const orderData: OrderData = {
    id: order.id,
    orderNumber: order.orderNumber || `#${order.id}`,
    orderType: order.orderType || "dine-in",
    tableNumber: order.tableNumber,
    customerName: order.customerName,
    branchName: branch?.name || "Hibi Matcha",
    staffName: staffMember?.name || "Staff",
    createdAt: order.createdAt || new Date(),
    subtotal: Number(order.subtotal || 0),
    discountAmount: Number(order.discountAmount || 0),
    taxAmount: Number(order.taxAmount || 0),
    serviceCharge: Number(order.serviceCharge || 0),
    totalAmount: Number(order.totalAmount || 0),
    notes: order.notes,
    items: orderItems,
    pickupNumber: order.pickupNumber || undefined,
    receiptNumber: order.receiptNumber || undefined,
    deviceSN: order.deviceSN || undefined,
    paymentMethodName,
    paidAmount,
    roundingAmount: Number(order.roundingAmount || 0),
  };

  const settings: BranchPaymentSettings = paySettings || {};
  return { orderData, settings };
}

export const printingRouter = router({
  // ─── Check Printer Status ──────────────────────────────────────────────────
  checkStatus: staffProcedure
    .input(z.object({ printerId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [printer] = await db.select().from(posPrinterConfigs)
        .where(eq(posPrinterConfigs.id, input.printerId)).limit(1);
      if (!printer) throw new TRPCError({ code: "NOT_FOUND", message: "Printer not found" });

      if (printer.connection !== "network" || !printer.ipAddress) {
        return { online: false, message: "Printer is not configured for network connection" };
      }

      const status = await checkPrinterStatus({
        ipAddress: printer.ipAddress,
        port: printer.port || 9100,
      });

      return { online: status.online, latency: status.latency, message: status.online ? "Connected" : "Offline" };
    }),

  // ─── Test Print ────────────────────────────────────────────────────────────
  testPrint: staffAdminProcedure
    .input(z.object({ printerId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [printer] = await db.select().from(posPrinterConfigs)
        .where(eq(posPrinterConfigs.id, input.printerId)).limit(1);
      if (!printer) throw new TRPCError({ code: "NOT_FOUND", message: "Printer not found" });

      if (printer.connection !== "network" || !printer.ipAddress) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Printer is not configured for network printing" });
      }

      const payload = generateTestPrintPayload(printer.printerName);
      const result = await printToNetworkPrinter(
        { ipAddress: printer.ipAddress, port: printer.port || 9100 },
        payload
      );

      await logAudit({
        staff: ctx.staff,
        action: "test_print",
        entity: "printer_config",
        entityId: input.printerId,
        details: JSON.stringify({ success: result.success, duration: result.duration }),
      });

      return result;
    }),

  // ─── Open Cash Drawer ──────────────────────────────────────────────────────
  openCashDrawer: staffProcedure
    .input(z.object({ printerId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [printer] = await db.select().from(posPrinterConfigs)
        .where(eq(posPrinterConfigs.id, input.printerId)).limit(1);
      if (!printer) throw new TRPCError({ code: "NOT_FOUND", message: "Printer not found" });

      if (printer.connection !== "network" || !printer.ipAddress) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Printer is not configured for network connection" });
      }

      const command = generateCashDrawerCommand();
      const result = await printToNetworkPrinter(
        { ipAddress: printer.ipAddress, port: printer.port || 9100 },
        command,
        3000
      );

      await logAudit({
        staff: ctx.staff,
        action: "open_cash_drawer",
        entity: "printer_config",
        entityId: input.printerId,
      });

      return result;
    }),

  // ─── Print Order Slip ──────────────────────────────────────────────────────
  printOrder: staffProcedure
    .input(z.object({
      orderId: z.number().int(),
      printerId: z.number().int().optional(), // if not provided, use default order_slip printer
      branchId: z.number().int(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Find printer
      let printer;
      if (input.printerId) {
        [printer] = await db.select().from(posPrinterConfigs)
          .where(eq(posPrinterConfigs.id, input.printerId)).limit(1);
      } else {
        [printer] = await db.select().from(posPrinterConfigs)
          .where(and(
            eq(posPrinterConfigs.branchId, input.branchId),
            eq(posPrinterConfigs.printerType, "order_slip"),
            eq(posPrinterConfigs.isDefault, true),
            eq(posPrinterConfigs.isActive, true),
          )).limit(1);
      }

      if (!printer || printer.connection !== "network" || !printer.ipAddress) {
        return { success: false, message: "No network printer configured for order slips", skipped: true };
      }

      const data = await buildOrderDataFromDb(db, input.orderId);
      if (!data) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });

      // Generate QR if promptpay configured
      let qrDataUrl: string | undefined;
      if (data.settings.promptpayId && data.orderData.totalAmount > 0) {
        qrDataUrl = await generatePromptPayQRDataUrl(data.settings.promptpayId, data.orderData.totalAmount);
      }

      const html = await generateOrderSlipHTML(data.orderData, data.settings, qrDataUrl);
      const result = await printToNetworkPrinter(
        { ipAddress: printer.ipAddress, port: printer.port || 9100 },
        html
      );

      return result;
    }),

  // ─── Print Kitchen Ticket ──────────────────────────────────────────────────
  printKitchen: staffProcedure
    .input(z.object({
      orderId: z.number().int(),
      printerId: z.number().int().optional(),
      branchId: z.number().int(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      let printer;
      if (input.printerId) {
        [printer] = await db.select().from(posPrinterConfigs)
          .where(eq(posPrinterConfigs.id, input.printerId)).limit(1);
      } else {
        [printer] = await db.select().from(posPrinterConfigs)
          .where(and(
            eq(posPrinterConfigs.branchId, input.branchId),
            eq(posPrinterConfigs.printerType, "kitchen"),
            eq(posPrinterConfigs.isDefault, true),
            eq(posPrinterConfigs.isActive, true),
          )).limit(1);
      }

      if (!printer || printer.connection !== "network" || !printer.ipAddress) {
        return { success: false, message: "No network printer configured for kitchen", skipped: true };
      }

      const data = await buildOrderDataFromDb(db, input.orderId);
      if (!data) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });

      const html = generateKitchenTicketHTML(data.orderData);
      const result = await printToNetworkPrinter(
        { ipAddress: printer.ipAddress, port: printer.port || 9100 },
        html
      );

      return result;
    }),

  // ─── Print Labels ──────────────────────────────────────────────────────────
  printLabels: staffProcedure
    .input(z.object({
      orderId: z.number().int(),
      printerId: z.number().int().optional(),
      branchId: z.number().int(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      let printer;
      if (input.printerId) {
        [printer] = await db.select().from(posPrinterConfigs)
          .where(eq(posPrinterConfigs.id, input.printerId)).limit(1);
      } else {
        [printer] = await db.select().from(posPrinterConfigs)
          .where(and(
            eq(posPrinterConfigs.branchId, input.branchId),
            eq(posPrinterConfigs.printerType, "label"),
            eq(posPrinterConfigs.isDefault, true),
            eq(posPrinterConfigs.isActive, true),
          )).limit(1);
      }

      if (!printer || printer.connection !== "network" || !printer.ipAddress) {
        return { success: false, message: "No network printer configured for labels", skipped: true };
      }

      const data = await buildOrderDataFromDb(db, input.orderId);
      if (!data) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });

      const html = generateAllLabelsHTML(data.orderData);
      const result = await printToNetworkPrinter(
        { ipAddress: printer.ipAddress, port: printer.port || 9100 },
        html
      );

      return result;
    }),

  // ─── Print Receipt ─────────────────────────────────────────────────────────
  printReceipt: staffProcedure
    .input(z.object({
      orderId: z.number().int(),
      printerId: z.number().int().optional(),
      branchId: z.number().int(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      let printer;
      if (input.printerId) {
        [printer] = await db.select().from(posPrinterConfigs)
          .where(eq(posPrinterConfigs.id, input.printerId)).limit(1);
      } else {
        [printer] = await db.select().from(posPrinterConfigs)
          .where(and(
            eq(posPrinterConfigs.branchId, input.branchId),
            eq(posPrinterConfigs.printerType, "receipt"),
            eq(posPrinterConfigs.isDefault, true),
            eq(posPrinterConfigs.isActive, true),
          )).limit(1);
      }

      if (!printer || printer.connection !== "network" || !printer.ipAddress) {
        return { success: false, message: "No network printer configured for receipts", skipped: true };
      }

      const data = await buildOrderDataFromDb(db, input.orderId);
      if (!data) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });

      // Get last payment info
      const payments = await db.select().from(posOrderPayments)
        .where(eq(posOrderPayments.orderId, input.orderId));
      const lastPayment = payments[payments.length - 1];
      let paymentMethodName: string | undefined;
      const methodId = lastPayment?.paymentMethodId;
      if (methodId) {
        let [pm] = await db.select().from(masterPaymentMethods)
          .where(eq(masterPaymentMethods.id, methodId)).limit(1) as any[];
        if (!pm) {
          [pm] = await db.select().from(posPaymentMethods)
            .where(eq(posPaymentMethods.id, methodId)).limit(1);
        }
        paymentMethodName = pm?.nameThai || pm?.name || undefined;
      }

      let qrDataUrl: string | undefined;
      const isPaid = payments.some((p: any) => p.status === "completed") || data.orderData.paidAmount >= data.orderData.totalAmount;
      if (data.settings.promptpayId && data.orderData.totalAmount > 0 && !isPaid) {
        qrDataUrl = await generatePromptPayQRDataUrl(data.settings.promptpayId, data.orderData.totalAmount);
      }

      const html = generateReceiptHTML(
        data.orderData,
        data.settings,
        paymentMethodName,
        lastPayment?.referenceNumber ?? undefined,
        qrDataUrl
      );
      const result = await printToNetworkPrinter(
        { ipAddress: printer.ipAddress, port: printer.port || 9100 },
        html
      );

      return result;
    }),

  // ─── Auto-Print All (after confirm order) ─────────────────────────────────
  autoPrintOnConfirm: staffProcedure
    .input(z.object({
      orderId: z.number().int(),
      branchId: z.number().int(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Check branch auto-print settings
      const [paySettings] = await db.select().from(posBranchPaymentSettings)
        .where(eq(posBranchPaymentSettings.branchId, input.branchId)).limit(1);

      const results: Record<string, any> = {};

      // Auto-print order slip
      if (paySettings?.autoPrintOrderSlip) {
        const [printer] = await db.select().from(posPrinterConfigs)
          .where(and(
            eq(posPrinterConfigs.branchId, input.branchId),
            eq(posPrinterConfigs.printerType, "order_slip"),
            eq(posPrinterConfigs.isDefault, true),
            eq(posPrinterConfigs.isActive, true),
          )).limit(1);

        if (printer?.connection === "network" && printer.ipAddress) {
          const data = await buildOrderDataFromDb(db, input.orderId);
          if (data) {
            let qrDataUrl: string | undefined;
            if (data.settings.promptpayId && data.orderData.totalAmount > 0) {
              qrDataUrl = await generatePromptPayQRDataUrl(data.settings.promptpayId, data.orderData.totalAmount);
            }
            const html = await generateOrderSlipHTML(data.orderData, data.settings, qrDataUrl);
            results.orderSlip = await printToNetworkPrinter(
              { ipAddress: printer.ipAddress, port: printer.port || 9100 },
              html
            );
          }
        }
      }

      // Auto-print kitchen ticket
      if (paySettings?.autoPrintKitchenTicket) {
        const [printer] = await db.select().from(posPrinterConfigs)
          .where(and(
            eq(posPrinterConfigs.branchId, input.branchId),
            eq(posPrinterConfigs.printerType, "kitchen"),
            eq(posPrinterConfigs.isDefault, true),
            eq(posPrinterConfigs.isActive, true),
          )).limit(1);

        if (printer?.connection === "network" && printer.ipAddress) {
          const data = await buildOrderDataFromDb(db, input.orderId);
          if (data) {
            const html = generateKitchenTicketHTML(data.orderData);
            results.kitchen = await printToNetworkPrinter(
              { ipAddress: printer.ipAddress, port: printer.port || 9100 },
              html
            );
          }
        }
      }

      // Auto-print labels
      if (paySettings?.autoPrintLabels) {
        const [printer] = await db.select().from(posPrinterConfigs)
          .where(and(
            eq(posPrinterConfigs.branchId, input.branchId),
            eq(posPrinterConfigs.printerType, "label"),
            eq(posPrinterConfigs.isDefault, true),
            eq(posPrinterConfigs.isActive, true),
          )).limit(1);

        if (printer?.connection === "network" && printer.ipAddress) {
          const data = await buildOrderDataFromDb(db, input.orderId);
          if (data) {
            const html = generateAllLabelsHTML(data.orderData);
            results.labels = await printToNetworkPrinter(
              { ipAddress: printer.ipAddress, port: printer.port || 9100 },
              html
            );
          }
        }
      }

      return { results, autoPrintEnabled: !!(paySettings?.autoPrintOrderSlip || paySettings?.autoPrintKitchenTicket || paySettings?.autoPrintLabels) };
    }),

  // ─── Auto-Print Receipt (after markPaid) ───────────────────────────────────
  autoPrintOnPaid: staffProcedure
    .input(z.object({
      orderId: z.number().int(),
      branchId: z.number().int(),
      openDrawer: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const results: Record<string, any> = {};

      // Print receipt
      const [receiptPrinter] = await db.select().from(posPrinterConfigs)
        .where(and(
          eq(posPrinterConfigs.branchId, input.branchId),
          eq(posPrinterConfigs.printerType, "receipt"),
          eq(posPrinterConfigs.isDefault, true),
          eq(posPrinterConfigs.isActive, true),
        )).limit(1);

      if (receiptPrinter?.connection === "network" && receiptPrinter.ipAddress) {
        const data = await buildOrderDataFromDb(db, input.orderId);
        if (data) {
          const payments = await db.select().from(posOrderPayments)
            .where(eq(posOrderPayments.orderId, input.orderId));
          const lastPayment = payments[payments.length - 1];
          let paymentMethodName: string | undefined;
          const methodId = lastPayment?.paymentMethodId;
          if (methodId) {
            let [pm] = await db.select().from(masterPaymentMethods)
              .where(eq(masterPaymentMethods.id, methodId)).limit(1) as any[];
            if (!pm) {
              [pm] = await db.select().from(posPaymentMethods)
                .where(eq(posPaymentMethods.id, methodId)).limit(1);
            }
            paymentMethodName = pm?.nameThai || pm?.name || undefined;
          }

          let qrDataUrl: string | undefined;
          const isPaid = payments.some((p: any) => p.status === "completed") || data.orderData.paidAmount >= data.orderData.totalAmount;
          if (data.settings.promptpayId && data.orderData.totalAmount > 0 && !isPaid) {
            qrDataUrl = await generatePromptPayQRDataUrl(data.settings.promptpayId, data.orderData.totalAmount);
          }

          const html = generateReceiptHTML(
            data.orderData,
            data.settings,
            paymentMethodName,
            lastPayment?.referenceNumber ?? undefined,
            qrDataUrl
          );
          results.receipt = await printToNetworkPrinter(
            { ipAddress: receiptPrinter.ipAddress, port: receiptPrinter.port || 9100 },
            html
          );
        }
      }

      // Open cash drawer if requested
      if (input.openDrawer) {
        // Use receipt printer for cash drawer (most common setup)
        const drawerPrinter = receiptPrinter;
        if (drawerPrinter?.connection === "network" && drawerPrinter.ipAddress) {
          const command = generateCashDrawerCommand();
          results.cashDrawer = await printToNetworkPrinter(
            { ipAddress: drawerPrinter.ipAddress, port: drawerPrinter.port || 9100 },
            command,
            3000
          );
        }
      }

      return { results };
    }),
});
