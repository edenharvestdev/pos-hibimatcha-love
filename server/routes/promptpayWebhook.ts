import type { Express, Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { getDb } from "../db";
import {
  posOrders,
  posOrderPayments,
  masterPaymentMethods,
  posPaymentMethods,
} from "../../drizzle/schema";
import { finalizeOrderStockDeduction } from "../routers/orders";

/**
 * POST /api/webhooks/promptpay
 * Headers: x-webhook-secret: <PROMPTPAY_WEBHOOK_SECRET>
 * Body: { orderId: number, referenceNumber: string, amount?: number }
 */
export function registerPromptPayWebhook(app: Express) {
  app.post("/api/webhooks/promptpay", async (req: Request, res: Response) => {
    try {
      const secret = req.headers["x-webhook-secret"];
      const expected = process.env.PROMPTPAY_WEBHOOK_SECRET;
      if (!expected || secret !== expected) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const orderId = Number(req.body?.orderId);
      const referenceNumber = String(req.body?.referenceNumber ?? "");
      if (!orderId || !referenceNumber) {
        res.status(400).json({ error: "orderId and referenceNumber required" });
        return;
      }

      const db = await getDb();
      if (!db) {
        res.status(503).json({ error: "Database unavailable" });
        return;
      }

      const [order] = await db.select().from(posOrders).where(eq(posOrders.id, orderId)).limit(1);
      if (!order) {
        res.status(404).json({ error: "Order not found" });
        return;
      }

      if (order.status === "completed") {
        res.json({ success: true, message: "Already completed" });
        return;
      }

      if (req.body?.amount != null && Math.abs(Number(req.body.amount) - Number(order.totalAmount)) > 0.05) {
        res.status(400).json({ error: "Amount mismatch" });
        return;
      }

      let [pm] = await db.select().from(masterPaymentMethods)
        .where(eq(masterPaymentMethods.type, "qr")).limit(1) as any[];
      if (!pm) {
        [pm] = await db.select().from(posPaymentMethods)
          .where(eq(posPaymentMethods.type, "qr")).limit(1);
      }
      const paymentMethodId = pm?.id ?? 1;

      const [existing] = await db.select().from(posOrderPayments)
        .where(and(
          eq(posOrderPayments.orderId, orderId),
          eq(posOrderPayments.status, "completed"),
        )).limit(1);
      if (!existing) {
        await db.insert(posOrderPayments).values({
          orderId,
          paymentMethodId,
          amount: order.totalAmount,
          referenceNumber,
          status: "completed",
          paidAt: new Date(),
        });
      }

      if (order.branchId) {
        await finalizeOrderStockDeduction(orderId, order.branchId, order.staffId ?? 1);
      }

      await db.update(posOrders).set({
        status: "completed",
        paymentRefNumber: referenceNumber,
        completedAt: new Date(),
      }).where(eq(posOrders.id, orderId));

      res.json({ success: true, orderId, referenceNumber });
    } catch (err: any) {
      console.error("[PromptPay Webhook]", err);
      res.status(500).json({ error: err?.message ?? "Internal error" });
    }
  });
}
